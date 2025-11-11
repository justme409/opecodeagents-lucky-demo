#!/usr/bin/env node
/**
 * RUN PROJECT DETAILS
 * 
 * Execute project-details task for a specific project ID
 * Uses event stream to monitor completion and captures meaningful logs
 */

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  MODEL: {
    providerID: 'opencode',
    modelID: 'grok-code'
  }
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function error(message) {
  log(`ERROR: ${message}`, 'red');
}

// Simple HTTP request helper
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

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

// Subscribe to event stream and capture meaningful logs
function monitorSession(sessionId, workspacePath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${CONFIG.SERVER_URL}/event`);
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
    const activeParts = new Map(); // partId -> { type, text, startTime, tokens }
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
            
            // No need to finalize - we only log when delta is null/empty (final updates)
            // Any remaining active parts are still streaming and will be logged when they complete
            
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
                // Tool started - no need to flush text/reasoning since we only log when delta is null/empty
                // (which means they're already complete)
                
                // Tool started
                toolCount++;
                if (toolName === 'bash') {
                  bashCount++;
                } else if (['read', 'write', 'edit', 'list'].includes(toolName)) {
                  fileOps++;
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
                
                // Console output
                if (toolName === 'bash') {
                  const newStatus = `Executing bash command (${bashCount} total)`;
                  if (newStatus !== lastStatus) {
                    log(`  ${newStatus}`, 'blue');
                    lastStatus = newStatus;
                  }
                } else if (['read', 'write', 'edit', 'list'].includes(toolName)) {
                  const newStatus = `File operation: ${toolName} (${fileOps} total)`;
                  if (newStatus !== lastStatus) {
                    log(`  ${newStatus}`, 'blue');
                    lastStatus = newStatus;
                  }
                } else {
                  const newStatus = `Tool: ${toolName}`;
                  if (newStatus !== lastStatus) {
                    log(`  ${newStatus}`, 'blue');
                    lastStatus = newStatus;
                  }
                }
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
                  const newStatus = 'Agent thinking...';
                  if (newStatus !== lastStatus) {
                    log(`  ${newStatus}`, 'cyan');
                    lastStatus = newStatus;
                  }
                } else if (partType === 'reasoning') {
                  const newStatus = 'Deep reasoning...';
                  if (newStatus !== lastStatus) {
                    log(`  ${newStatus}`, 'magenta');
                    lastStatus = newStatus;
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
            
            // Handle step-finish events (tokens are tracked at message level, not here)
            else if (partType === 'step-finish') {
              // Step-finish tokens are already included in message-level tokens
              // We don't aggregate here to avoid double-counting
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

// Spawn workspace for the task
function spawnWorkspace(taskName) {
  log(`Creating workspace for: ${taskName}`, 'cyan');
  
  try {
    const output = execSync(
      `cd /app/opecodeagents-lucky-demo && ./spawn-agent.sh ${taskName}`,
      { encoding: 'utf-8' }
    );
    
    const sessionMatch = output.match(/Session ID: (\S+)/);
    const pathMatch = output.match(/Workspace: (.+)/);
    
    if (!sessionMatch || !pathMatch) {
      throw new Error('Failed to parse spawn-agent.sh output');
    }
    
    return {
      sessionId: sessionMatch[1],
      workspacePath: pathMatch[1].trim()
    };
  } catch (err) {
    error(`Failed to spawn workspace: ${err.message}`);
    throw err;
  }
}

// Execute project-details task
async function executeProjectDetails(projectId) {
  const taskName = 'project-details';
  const taskStartedAt = new Date().toISOString();
  
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`EXECUTING PROJECT DETAILS`, 'bright');
  log(`Project ID: ${projectId}`, 'bright');
  log(`${'='.repeat(60)}\n`, 'bright');
  
  try {
    // Step 1: Spawn workspace
    log('Step 1: Spawning workspace...', 'cyan');
    const { sessionId: workspaceSessionId, workspacePath } = spawnWorkspace(taskName);
    log(`  ✓ Workspace: ${workspacePath}`, 'green');
    log(`  ✓ Workspace Session ID: ${workspaceSessionId}`, 'green');
    
    // Step 2: Create session
    log('\nStep 2: Creating opencode session...', 'cyan');
    const session = await request(`${CONFIG.SERVER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Agent: project-details` })
    });
    log(`  ✓ Session created: ${session.id}`, 'green');
    
    // Step 2b: Persist orchestrator metadata for downstream tools
    const metadata = {
      projectId,
      taskName,
      displayName: 'project-details',
      workspaceSessionId,
      orchestratorSessionId: session.id,
      workspacePath,
      serverUrl: CONFIG.SERVER_URL,
      startedAt: taskStartedAt,
      context: null,
    };
    const metadataPath = `${workspacePath}/orchestrator-meta.json`;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    log(`  ✓ Metadata saved: orchestrator-meta.json`, 'green');
    
    // Step 3: Start monitoring BEFORE sending prompt
    log('\nStep 3: Starting event monitor...', 'cyan');
    const monitorPromise = monitorSession(session.id, workspacePath);
    log(`  ✓ Monitoring session.idle event`, 'green');
    
    // Step 4: Send prompt with project ID
    log('\nStep 4: Sending prompt to agent...', 'cyan');
    const prompt = [
      `projectId: ${projectId}`,
      `workspaceSessionId: ${workspaceSessionId}`,
      `orchestratorSessionId: ${session.id}`,
      `cd ${workspacePath} && cat prompt.md and follow those instructions`
    ].join('\n\n');
    
    await request(`${CONFIG.SERVER_URL}/session/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
        model: CONFIG.MODEL,
        agent: 'build'
      })
    });
    log(`  ✓ Prompt sent`, 'green');
    log(`  ✓ Agent executing...`, 'blue');
    
    // Step 5: Wait for completion
    log('\nStep 5: Agent progress:', 'cyan');
    log('  (Watch stream.py for detailed output)', 'yellow');
    
    const result = await monitorPromise;
    
    log(`\n  ✓ Task completed in ${result.duration}s`, 'green');
    log(`  ✓ Tools used: ${result.stats.toolCount}`, 'green');
    log(`  ✓ Bash commands: ${result.stats.bashCount}`, 'green');
    log(`  ✓ File operations: ${result.stats.fileOps}`, 'green');
    if (result.tokens) {
      const total = result.tokens.input + result.tokens.output + result.tokens.reasoning;
      log(`  ✓ Tokens: ${total.toLocaleString()} (input: ${result.tokens.input.toLocaleString()}, output: ${result.tokens.output.toLocaleString()}, reasoning: ${result.tokens.reasoning.toLocaleString()})`, 'green');
    }
    log(`  ✓ Logs saved: ${result.logPath}`, 'green');
    log(`  ℹ  stream.py should now show completion simultaneously`, 'cyan');
    
    return {
      success: true,
      sessionId: session.id,
      workspaceSessionId,
      workspacePath,
      duration: result.duration,
      stats: result.stats,
      tokens: result.tokens,
      logPath: result.logPath,
      metadataPath,
      projectId
    };
    
  } catch (err) {
    error(`Task failed: ${err.message}`);
    throw err;
  }
}

// Main
async function main() {
  let projectId = process.argv[2] || process.env.PROJECT_ID;
  
  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    console.log(`
${colors.bright}RUN PROJECT DETAILS${colors.reset}

Execute project-details task for a specific project ID.

${colors.cyan}Usage:${colors.reset}
  node run-project-details.js <project-id>
  
  Or set PROJECT_ID environment variable:
  PROJECT_ID=<project-id> node run-project-details.js

${colors.cyan}Example:${colors.reset}
  node run-project-details.js b168e975-2531-527f-9abd-19cb8f502fe0

${colors.cyan}Tips:${colors.reset}
  1. Start stream.py in another terminal for detailed output
  2. Logs are saved to workspace/session-log.json (optimized, no deltas)
  3. Results are written to Neo4j Generated DB (port 7690)
  4. Metadata is saved to workspace/orchestrator-meta.json

${colors.cyan}Requirements:${colors.reset}
  - OpenCode server running on port 4096
  - Neo4j databases accessible (ports 7687, 7688, 7690)
  - Valid credentials in connection details.md
`);
    process.exit(1);
  }
  
  projectId = projectId.trim();
  
  log(`Starting project-details execution`, 'bright');
  log(`Project ID: ${projectId}`, 'cyan');
  log(`Server: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Model: ${CONFIG.MODEL.providerID}/${CONFIG.MODEL.modelID}`, 'blue');
  
  try {
    const result = await executeProjectDetails(projectId);
    
    log(`\n${'='.repeat(60)}`, 'bright');
    log(`SUCCESS!`, 'green');
    log(`${'='.repeat(60)}`, 'bright');
    log(`\nTask: project-details`, 'cyan');
    log(`Project ID: ${result.projectId}`, 'cyan');
    log(`Session: ${result.sessionId}`, 'cyan');
    log(`Workspace: ${result.workspacePath}`, 'cyan');
    log(`Duration: ${result.duration}s`, 'cyan');
    log(`Logs: ${result.logPath}`, 'cyan');
    log(`Metadata: ${result.metadataPath}`, 'cyan');
    log(`\nCheck Neo4j Generated DB (port 7690) for results`, 'yellow');
    
    process.exit(0);
  } catch (err) {
    log(`\n${'='.repeat(60)}`, 'bright');
    log(`FAILED!`, 'red');
    log(`${'='.repeat(60)}`, 'bright');
    log(`\nError: ${err.message}`, 'red');
    log(`\nTroubleshooting:`, 'yellow');
    log(`  1. Check stream.py output for detailed errors`, 'yellow');
    log(`  2. Verify OpenCode server is running (port 4096)`, 'yellow');
    log(`  3. Check Neo4j connections (ports 7687, 7688, 7690)`, 'yellow');
    log(`  4. Review workspace files for debugging`, 'yellow');
    
    process.exit(1);
  }
}

main();

