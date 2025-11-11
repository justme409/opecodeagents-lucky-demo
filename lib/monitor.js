/**
 * Shared Event Stream Monitoring Library
 * 
 * Provides session monitoring via OpenCode server's /event SSE stream.
 * Used by all orchestration scripts for consistent completion detection.
 * Uses improved logging: only final content (no deltas), captures tool outputs, avoids double counting.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Parse SSE event
function parseSSE(line) {
  if (line.startsWith('data: ')) {
    try {
      return JSON.parse(line.slice(6));
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Monitor an OpenCode session via event stream
 * 
 * @param {string} sessionId - The OpenCode session ID to monitor
 * @param {string} workspacePath - Path to workspace (for saving logs)
 * @param {object} config - Configuration options
 * @param {string} config.serverUrl - OpenCode server URL (default: http://127.0.0.1:4096)
 * @param {function} config.onProgress - Optional callback for progress updates
 * @returns {Promise<object>} Resolves with { success, duration, stats, tokens, logPath }
 */
function monitorSession(sessionId, workspacePath, config = {}) {
  const serverUrl = config.serverUrl || 'http://127.0.0.1:4096';
  const onProgress = config.onProgress || (() => {});
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${serverUrl}/event`);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    };
    
    const startTime = Date.now();
    let lastStatus = '';
    const logs = [];
    
    // Track active parts to aggregate deltas
    const activeParts = new Map(); // partId -> { type, startTime, input }
    const completedTools = [];
    // Track completed tool parts to update output if it arrives later
    const completedToolParts = new Map(); // partId -> logIndex
    
    // Stats
    let toolCount = 0;
    let bashCount = 0;
    let fileOps = 0;
    let totalTokens = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
    
    // Track which messages we've already counted tokens for (to avoid double counting)
    const countedMessages = new Set();
    let lastEventType = null;
    
    const req = client.request(reqOptions, (res) => {
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line
        
        for (const line of lines) {
          const event = parseSSE(line);
          if (!event) continue;
          
          // Check for completion
          if (event.type === 'session.idle' && 
              event.properties.sessionID === sessionId) {
            const duration = Math.round((Date.now() - startTime) / 1000);
            req.destroy();
            
            // Add summary
            logs.push({
              timestamp: new Date().toISOString(),
              type: 'summary',
              duration,
              stats: { toolCount, bashCount, fileOps },
              tokens: totalTokens,
              completedTools: completedTools.length
            });
            
            // Save logs to workspace
            const logPath = path.join(workspacePath, 'session-log.json');
            fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
            
            resolve({ 
              success: true, 
              duration,
              stats: { toolCount, bashCount, fileOps },
              tokens: totalTokens,
              logPath
            });
            return;
          }
          
          // Check for errors
          if (event.type === 'session.error' && 
              event.properties.sessionID === sessionId) {
            const errorMsg = event.properties.error?.data?.message || 'Unknown error';
            req.destroy();
            
            // Save logs before rejecting
            const logPath = path.join(workspacePath, 'session-log.json');
            logs.push({
              timestamp: new Date().toISOString(),
              type: 'error',
              error: errorMsg,
              stats: { toolCount, bashCount, fileOps },
              tokens: totalTokens
            });
            fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
            
            reject(new Error(`Agent error: ${errorMsg}`));
            return;
          }
          
          // Handle message.updated events for token tracking
          if (event.type === 'message.updated') {
            const info = event.properties.info;
            // Only count tokens when message is completed (has time.completed) and we haven't counted it yet
            if (info && info.role === 'assistant' && info.tokens && info.time?.completed && !countedMessages.has(info.id)) {
              // Capture message-level tokens (includes reasoning tokens)
              // This is the authoritative source - includes all tokens for the entire message
              const msgTokens = info.tokens;
              totalTokens.input += msgTokens.input || 0;
              totalTokens.output += msgTokens.output || 0;
              totalTokens.reasoning += msgTokens.reasoning || 0;
              if (msgTokens.cache) {
                totalTokens.cacheRead += msgTokens.cache.read || 0;
                totalTokens.cacheWrite += msgTokens.cache.write || 0;
              }
              countedMessages.add(info.id); // Mark as counted to avoid double counting
            }
          }
          
          // Process message.part.updated events
          if (event.type === 'message.part.updated') {
            const part = event.properties.part;
            if (!part) continue;
            
            const partId = part.id;
            const partType = part.type;
            const status = part.state?.status;
            const delta = event.properties.delta;
            
            // Check if this is a final update (delta is null/empty means complete)
            const isFinal = delta === null || delta === undefined || delta === '';
            
            // Handle tool calls
            if (partType === 'tool') {
              const toolName = part.tool;
              
              if (status === 'running' && !activeParts.has(partId)) {
                // Tool started
                toolCount++;
                if (toolName === 'bash') {
                  bashCount++;
                  if (lastEventType !== 'bash') {
                    onProgress({ type: 'bash', count: bashCount });
                    lastEventType = 'bash';
                  }
                } else if (['read', 'write', 'edit', 'list'].includes(toolName)) {
                  fileOps++;
                  if (lastEventType !== 'file') {
                    onProgress({ type: 'file', tool: toolName, count: fileOps });
                    lastEventType = 'file';
                  }
                } else {
                  if (lastEventType !== toolName) {
                    onProgress({ type: 'tool', tool: toolName });
                    lastEventType = toolName;
                  }
                }
                
                // Get input from various possible locations
                const input = part.input || part.args || part.state?.input || null;
                
                activeParts.set(partId, {
                  type: 'tool',
                  tool: toolName,
                  startTime: Date.now(),
                  input: input
                });
                
                // Log tool start
                logs.push({
                  timestamp: new Date().toISOString(),
                  type: 'tool_start',
                  tool: toolName,
                  input: input
                });
              } else if (status === 'completed' || status === 'failed') {
                // Tool completed - check if we've already logged it (output might arrive later)
                const existingLogIndex = completedToolParts.get(partId);
                
                // Get output from state (this is where tool outputs are stored)
                const state = part.state || {};
                // Check multiple locations for output
                // Bash outputs are typically in state.output (the actual stdout/stderr)
                let output = state.output || part.output || part.result || null;
                
                // For bash commands, also check metadata which sometimes has additional info
                if (toolName === 'bash') {
                  if (!output && state.metadata) {
                    // Check metadata.output, metadata.stdout, metadata.stderr
                    output = state.metadata.output || state.metadata.stdout || state.metadata.stderr || null;
                  }
                  // Bash commands with empty output might have exit code info
                  if (output === '' && state.metadata && state.metadata.exit !== undefined) {
                    // Empty output is valid (command succeeded but produced no output)
                    output = ''; // Keep empty string to indicate success with no output
                  }
                }
                
                const error = state.error || part.error || null;
                
                if (existingLogIndex !== undefined) {
                  // Update existing log entry with latest output/error (output might arrive in later event)
                  const existingLog = logs[existingLogIndex];
                  if (output !== null && output !== undefined) {
                    existingLog.output = output;
                  }
                  if (error !== null && error !== undefined) {
                    existingLog.error = error;
                  }
                  // Update the completedTools array entry too
                  const toolIndex = completedTools.findIndex(t => t === existingLog);
                  if (toolIndex >= 0) {
                    completedTools[toolIndex] = existingLog;
                  }
                } else {
                  // First time logging this tool completion
                  const toolInfo = activeParts.get(partId);
                  if (toolInfo) {
                    activeParts.delete(partId);
                  }
                  
                  const result = {
                    timestamp: new Date().toISOString(),
                    type: 'tool_complete',
                    tool: toolName,
                    status: status,
                    duration: toolInfo ? Date.now() - toolInfo.startTime : null,
                    input: toolInfo ? toolInfo.input : (part.input || part.args || part.state?.input || null),
                    output: output,
                    error: error,
                    tokens: part.tokens || null
                  };
                  
                  const logIndex = logs.length;
                  logs.push(result);
                  completedTools.push(result);
                  completedToolParts.set(partId, logIndex);
                  
                  // Note: Tokens are tracked at message level, not part level
                  // Part-level tokens are logged but not aggregated to avoid double-counting
                }
              }
            }
            
            // Handle text/reasoning parts - only log when delta is null/empty (final update)
            else if (partType === 'text' || partType === 'reasoning') {
              // Track start time for console output
              if (!activeParts.has(partId)) {
                activeParts.set(partId, {
                  type: partType,
                  startTime: Date.now()
                });
                
                // Console output
                if (partType === 'text') {
                  if (lastEventType !== 'text') {
                    onProgress({ type: 'thinking' });
                    lastEventType = 'text';
                  }
                } else if (partType === 'reasoning') {
                  if (lastEventType !== 'reasoning') {
                    onProgress({ type: 'reasoning' });
                    lastEventType = 'reasoning';
                  }
                }
              }
              
              // Only log when delta is null/empty (meaning it's the final/complete update)
              // The part.text contains the FULL text, not just the delta
              if (isFinal) {
                const partInfo = activeParts.get(partId);
                const startTime = partInfo ? partInfo.startTime : Date.now();
                
                // Get the complete text from part.text (this is the full content)
                const finalText = part.text || '';
                const finalTokens = part.tokens || null;
                
                // Only log if there's actual content
                if (finalText.trim() || finalTokens) {
                  logs.push({
                    timestamp: new Date(startTime).toISOString(),
                    type: partType,
                    content: finalText,
                    status: status || 'completed',
                    tokens: finalTokens
                  });
                }
                
                // Clean up tracking
                activeParts.delete(partId);
                
                // Note: Tokens are tracked at message level via message.updated events
                // Part-level tokens are logged but not aggregated to avoid double-counting
              }
              // If not final, we just ignore it - no accumulation needed since part.text has full content
            }
          }
        }
      });
      
      res.on('end', () => {
        reject(new Error('Event stream ended unexpectedly'));
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

module.exports = {
  monitorSession,
  parseSSE
};



