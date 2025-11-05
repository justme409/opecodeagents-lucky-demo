/**
 * Shared Event Stream Monitoring Library
 * 
 * Provides session monitoring via OpenCode server's /event SSE stream.
 * Used by all orchestration scripts for consistent completion detection.
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
 * @returns {Promise<object>} Resolves with { success, duration, stats, logPath }
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
    const logs = [];
    let toolCount = 0;
    let bashCount = 0;
    let fileOps = 0;
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
          
          // Log the raw event
          logs.push({
            timestamp: new Date().toISOString(),
            type: event.type,
            event: event
          });
          
          // Check for completion
          if (event.type === 'session.idle' && 
              event.properties.sessionID === sessionId) {
            const duration = Math.round((Date.now() - startTime) / 1000);
            req.destroy();
            
            // Save logs to workspace
            const logPath = path.join(workspacePath, 'session-log.json');
            fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
            
            resolve({ 
              success: true, 
              duration,
              stats: { toolCount, bashCount, fileOps },
              logPath
            });
            return;
          }
          
          // Check for errors
          if (event.type === 'session.error' && 
              event.properties.sessionID === sessionId) {
            const errorMsg = event.properties.error?.data?.message || 'Unknown error';
            req.destroy();
            reject(new Error(`Agent error: ${errorMsg}`));
            return;
          }
          
          // Track progress and notify
          if (event.type === 'message.part.updated') {
            const part = event.properties.part;
            const partType = part?.type;
            
            if (partType === 'tool') {
              const toolName = part.tool;
              const status = part.state?.status;
              
              if (status === 'running') {
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
              }
            } else if (partType === 'text') {
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



