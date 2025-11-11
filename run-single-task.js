#!/usr/bin/env node
/**
 * RUN SINGLE TASK
 * 
 * Execute a single agent task with full workspace setup
 * Uses event stream to monitor completion and captures full logs
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

// Subscribe to event stream and capture logs
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
    let toolCount = 0;
    let bashCount = 0;
    let fileOps = 0;
    
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
          
          // Track progress and show status
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
                  const newStatus = `Executing bash command (${bashCount} total)`;
                  if (newStatus !== lastStatus) {
                    log(`  ${newStatus}`, 'blue');
                    lastStatus = newStatus;
                  }
                } else if (['read', 'write', 'edit', 'list'].includes(toolName)) {
                  fileOps++;
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
              }
            } else if (partType === 'text') {
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

// Execute a single task
async function executeTask(taskName) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`EXECUTING TASK: ${taskName}`, 'bright');
  log(`${'='.repeat(60)}\n`, 'bright');
  
  try {
    // Step 1: Spawn workspace
    log('Step 1: Spawning workspace...', 'cyan');
    const { sessionId, workspacePath } = spawnWorkspace(taskName);
    log(`  ✓ Workspace: ${workspacePath}`, 'green');
    log(`  ✓ Session ID: ${sessionId}`, 'green');
    
    // Step 2: Create session
    log('\nStep 2: Creating opencode session...', 'cyan');
    const session = await request(`${CONFIG.SERVER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Agent: ${taskName}` })
    });
    log(`  ✓ Session created: ${session.id}`, 'green');
    
    // Step 3: Start monitoring BEFORE sending prompt
    log('\nStep 3: Starting event monitor...', 'cyan');
    const monitorPromise = monitorSession(session.id, workspacePath);
    log(`  ✓ Monitoring session.idle event`, 'green');
    
    // Step 4: Send prompt
    log('\nStep 4: Sending prompt to agent...', 'cyan');
    const prompt = `cd ${workspacePath} && cat prompt.md and follow those instructions`;
    
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
    log(`  ✓ Logs saved: ${result.logPath}`, 'green');
    log(`  ℹ  stream.py should now show completion simultaneously`, 'cyan');
    
    return {
      success: true,
      sessionId: session.id,
      workspacePath,
      duration: result.duration,
      stats: result.stats,
      logPath: result.logPath
    };
    
  } catch (err) {
    error(`Task failed: ${err.message}`);
    throw err;
  }
}

// Main
async function main() {
  const taskName = process.argv[2];
  
  if (!taskName) {
    console.log(`
${colors.bright}RUN SINGLE TASK${colors.reset}

Execute a single agent task with full workspace setup.

${colors.cyan}Usage:${colors.reset}
  node run-single-task.js <task-name>

${colors.cyan}Examples:${colors.reset}
  node run-single-task.js project-details
  node run-single-task.js wbs-extraction
  node run-single-task.js itp-generation

${colors.cyan}Available tasks:${colors.reset}
  ${colors.yellow}Basic Extraction:${colors.reset}
    - project-details       Extract project metadata
    - document-metadata     Extract document information
    - standards-extraction  Extract standards and specifications
    - wbs-extraction        Extract Work Breakdown Structure
    - lbs-extraction        Extract Location Breakdown Structure

  ${colors.yellow}Plan Generation:${colors.reset}
    - pqp-generation        Generate Project Quality Plan
    - emp-generation        Generate Environmental Management Plan
    - ohsmp-generation      Generate OH&S Management Plan
    - qse-generation        Generate Quality, Safety, Environment Plan
    - itp-generation        Generate Inspection & Test Plans

${colors.cyan}Tips:${colors.reset}
  1. Start stream.py in another terminal for detailed output
  2. Logs are saved to workspace/session-log.json
  3. Results are written to Neo4j Generated DB (port 7690)

${colors.cyan}Requirements:${colors.reset}
  - OpenCode server running on port 4096
  - Neo4j databases accessible (ports 7687, 7688, 7690)
  - Valid credentials in connection details.md
`);
    process.exit(1);
  }
  
  // Validate task name
  const validTasks = [
    'project-details',
    'document-metadata',
    'standards-extraction',
    'wbs-extraction',
    'lbs-extraction',
    'pqp-generation',
    'emp-generation',
    'ohsmp-generation',
    'qse-generation',
    'itp-generation'
  ];
  
  if (!validTasks.includes(taskName)) {
    error(`Invalid task name: ${taskName}`);
    console.log(`\nValid tasks: ${validTasks.join(', ')}`);
    process.exit(1);
  }
  
  log(`Starting single task execution: ${taskName}`, 'bright');
  log(`Server: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Model: ${CONFIG.MODEL.providerID}/${CONFIG.MODEL.modelID}`, 'blue');
  
  try {
    const result = await executeTask(taskName);
    
    log(`\n${'='.repeat(60)}`, 'bright');
    log(`SUCCESS!`, 'green');
    log(`${'='.repeat(60)}`, 'bright');
    log(`\nTask: ${taskName}`, 'cyan');
    log(`Session: ${result.sessionId}`, 'cyan');
    log(`Workspace: ${result.workspacePath}`, 'cyan');
    log(`Duration: ${result.duration}s`, 'cyan');
    log(`Logs: ${result.logPath}`, 'cyan');
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
