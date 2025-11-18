#!/usr/bin/env node
/**
 * RUN PLAN GENERATION
 *
 * Execute PQP, EMP, and OHSMP generation tasks in parallel for a specific project ID
 * Each plan uses its own workspace, session, and event monitor
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
    providerID: 'openrouter',
    modelID: 'openrouter/sherlock-think-alpha',
  },
};

const PLAN_TASKS = [
  { taskName: 'pqp-generation', displayName: 'PQP Generation', planType: 'PQP' },
  { taskName: 'emp-generation', displayName: 'EMP Generation', planType: 'EMP' },
  { taskName: 'ohsmp-generation', displayName: 'OHSMP Generation', planType: 'OHSMP' },
];

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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
      headers: options.headers || {},
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
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
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    };

    const startTime = Date.now();
    let lastStatus = '';
    const logs = [];

    const activeParts = new Map();
    const completedTools = [];
    const completedToolParts = new Map();

    let toolCount = 0;
    let bashCount = 0;
    let fileOps = 0;
    const totalTokens = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
    const countedMessages = new Set();

    const req = client.request(reqOptions, (res) => {
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const event = parseSSE(line);
          if (!event) continue;

          if (event.type === 'session.idle' && event.properties.sessionID === sessionId) {
            const duration = Math.round((Date.now() - startTime) / 1000);
            req.destroy();

            logs.push({
              timestamp: new Date().toISOString(),
              type: 'summary',
              duration,
              stats: { toolCount, bashCount, fileOps },
              tokens: totalTokens,
              completedTools: completedTools.length,
            });

            const logPath = path.join(workspacePath, 'session-log.json');
            fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

            resolve({
              success: true,
              duration,
              stats: { toolCount, bashCount, fileOps },
              tokens: totalTokens,
              logPath,
            });
            return;
          }

          if (event.type === 'session.error' && event.properties.sessionID === sessionId) {
            const errorMsg = event.properties.error?.data?.message || 'Unknown error';
            req.destroy();

            const logPath = path.join(workspacePath, 'session-log.json');
            logs.push({
              timestamp: new Date().toISOString(),
              type: 'error',
              error: errorMsg,
              stats: { toolCount, bashCount, fileOps },
              tokens: totalTokens,
            });
            fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

            reject(new Error(`Agent error: ${errorMsg}`));
            return;
          }

          if (event.type === 'message.updated') {
            const info = event.properties.info;
            if (
              info &&
              info.role === 'assistant' &&
              info.tokens &&
              info.time?.completed &&
              !countedMessages.has(info.id)
            ) {
              const msgTokens = info.tokens;
              totalTokens.input += msgTokens.input || 0;
              totalTokens.output += msgTokens.output || 0;
              totalTokens.reasoning += msgTokens.reasoning || 0;
              if (msgTokens.cache) {
                totalTokens.cacheRead += msgTokens.cache.read || 0;
                totalTokens.cacheWrite += msgTokens.cache.write || 0;
              }
              countedMessages.add(info.id);
            }
          }

          if (event.type === 'message.part.updated') {
            const part = event.properties.part;
            if (!part) continue;

            const partId = part.id;
            const partType = part.type;
            const status = part.state?.status;
            const delta = event.properties.delta;
            const isFinal = delta === null || delta === undefined || delta === '';

            if (partType === 'tool') {
              const toolName = part.tool;

              if (status === 'running' && !activeParts.has(partId)) {
                toolCount++;
                if (toolName === 'bash') {
                  bashCount++;
                } else if (['read', 'write', 'edit', 'list'].includes(toolName)) {
                  fileOps++;
                }

                const input = part.input || part.args || part.state?.input || null;

                activeParts.set(partId, {
                  type: 'tool',
                  tool: toolName,
                  startTime: Date.now(),
                  input,
                });

                logs.push({
                  timestamp: new Date().toISOString(),
                  type: 'tool_start',
                  tool: toolName,
                  input,
                });

                let newStatus = '';
                if (toolName === 'bash') {
                  newStatus = `Executing bash command (${bashCount} total)`;
                } else if (['read', 'write', 'edit', 'list'].includes(toolName)) {
                  newStatus = `File operation: ${toolName} (${fileOps} total)`;
                } else {
                  newStatus = `Tool: ${toolName}`;
                }
                if (newStatus && newStatus !== lastStatus) {
                  log(`  ${newStatus}`, 'blue');
                  lastStatus = newStatus;
                }
              } else if (status === 'completed' || status === 'failed') {
                const existingLogIndex = completedToolParts.get(partId);
                const state = part.state || {};
                let output = state.output || part.output || part.result || null;

                if (toolName === 'bash') {
                  if (!output && state.metadata) {
                    output = state.metadata.output || state.metadata.stdout || state.metadata.stderr || null;
                  }
                  if (output === '' && state.metadata && state.metadata.exit !== undefined) {
                    output = '';
                  }
                }

                const partError = state.error || part.error || null;

                if (existingLogIndex !== undefined) {
                  const existingLog = logs[existingLogIndex];
                  if (output !== null && output !== undefined) {
                    existingLog.output = output;
                  }
                  if (partError !== null && partError !== undefined) {
                    existingLog.error = partError;
                  }
                  const toolIndex = completedTools.findIndex((t) => t === existingLog);
                  if (toolIndex >= 0) {
                    completedTools[toolIndex] = existingLog;
                  }
                } else {
                  const toolInfo = activeParts.get(partId);
                  if (toolInfo) {
                    activeParts.delete(partId);
                  }

                  const result = {
                    timestamp: new Date().toISOString(),
                    type: 'tool_complete',
                    tool: toolName,
                    status,
                    duration: toolInfo ? Date.now() - toolInfo.startTime : null,
                    input: toolInfo ? toolInfo.input : part.input || part.args || part.state?.input || null,
                    output,
                    error: partError,
                    tokens: part.tokens || null,
                  };

                  const logIndex = logs.length;
                  logs.push(result);
                  completedTools.push(result);
                  completedToolParts.set(partId, logIndex);
                }
              }
            } else if (partType === 'text' || partType === 'reasoning') {
              if (!activeParts.has(partId)) {
                activeParts.set(partId, {
                  type: partType,
                  startTime: Date.now(),
                });

                const newStatus = partType === 'text' ? 'Agent thinking...' : 'Deep reasoning...';
                if (newStatus !== lastStatus) {
                  log(`  ${newStatus}`, partType === 'text' ? 'cyan' : 'magenta');
                  lastStatus = newStatus;
                }
              }

              if (isFinal) {
                const partInfo = activeParts.get(partId);
                const start = partInfo ? partInfo.startTime : Date.now();
                const finalText = part.text || '';
                const finalTokens = part.tokens || null;

                if (finalText.trim() || finalTokens) {
                  logs.push({
                    timestamp: new Date(start).toISOString(),
                    type: partType,
                    content: finalText,
                    status: status || 'completed',
                    tokens: finalTokens,
                  });
                }

                activeParts.delete(partId);
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
    const output = execSync(`cd /app/opecodeagents-lucky-demo && ./spawn-agent.sh ${taskName}`, {
      encoding: 'utf-8',
    });

    const sessionMatch = output.match(/Session ID: (\S+)/);
    const pathMatch = output.match(/Workspace: (.+)/);

    if (!sessionMatch || !pathMatch) {
      throw new Error('Failed to parse spawn-agent.sh output');
    }

    return {
      sessionId: sessionMatch[1],
      workspacePath: pathMatch[1].trim(),
    };
  } catch (err) {
    error(`Failed to spawn workspace: ${err.message}`);
    throw err;
  }
}

async function executePlanTask(projectId, taskConfig) {
  const { taskName, displayName, planType } = taskConfig;
  const taskStartedAt = new Date().toISOString();

  console.log('');
  log('='.repeat(60), 'bright');
  log(`EXECUTING ${displayName.toUpperCase()}`, 'bright');
  log(`Task: ${taskName}`, 'bright');
  log('='.repeat(60), 'bright');
  console.log('');

  try {
    log('Step 1: Spawning workspace...', 'cyan');
    const { sessionId: workspaceSessionId, workspacePath } = spawnWorkspace(taskName);
    log(`  ✓ Workspace: ${workspacePath}`, 'green');
    log(`  ✓ Workspace Session ID: ${workspaceSessionId}`, 'green');

    log('\nStep 2: Creating opencode session...', 'cyan');
    const session = await request(`${CONFIG.SERVER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Agent: ${displayName}` }),
    });
    log(`  ✓ Session created: ${session.id}`, 'green');

    const metadata = {
      projectId,
      taskName,
      displayName,
      planType,
      workspaceSessionId,
      orchestratorSessionId: session.id,
      workspacePath,
      serverUrl: CONFIG.SERVER_URL,
      startedAt: taskStartedAt,
    };
    const metadataPath = `${workspacePath}/orchestrator-meta.json`;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    log(`  ✓ Metadata saved: orchestrator-meta.json`, 'green');

    log('\nStep 3: Starting event monitor...', 'cyan');
    const monitorPromise = monitorSession(session.id, workspacePath);
    log(`  ✓ Monitoring session.idle event`, 'green');

    log('\nStep 4: Sending prompt to agent...', 'cyan');
    const prompt = [
      `projectId: ${projectId}`,
      `planType: ${planType}`,
      `workspaceSessionId: ${workspaceSessionId}`,
      `orchestratorSessionId: ${session.id}`,
      `Steps:`,
      `1. cd ${workspacePath}`,
      `2. cat instructions.md`,
      `3. cat prompt.md`,
      `4. Follow the instructions in those files exactly.`,
    ].join('\n\n');

    await request(`${CONFIG.SERVER_URL}/session/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
        model: CONFIG.MODEL,
        agent: 'build',
      }),
    });
    log(`  ✓ Prompt sent`, 'green');
    log(`  ✓ Agent executing...`, 'blue');

    log('\nStep 5: Agent progress:', 'cyan');
    log('  (Watch stream.py for detailed output)', 'yellow');

    const result = await monitorPromise;

    console.log('');
    log(`  ✓ ${displayName} completed in ${result.duration}s`, 'green');
    log(`  ✓ Tools used: ${result.stats.toolCount}`, 'green');
    log(`  ✓ Bash commands: ${result.stats.bashCount}`, 'green');
    log(`  ✓ File operations: ${result.stats.fileOps}`, 'green');
    if (result.tokens) {
      const total = result.tokens.input + result.tokens.output + result.tokens.reasoning;
      log(`  ✓ Tokens: ${total.toLocaleString()} (input: ${result.tokens.input.toLocaleString()}, output: ${result.tokens.output.toLocaleString()}, reasoning: ${result.tokens.reasoning.toLocaleString()})`, 'green');
    }
    log(`  ✓ Logs saved: ${result.logPath}`, 'green');

    return {
      success: true,
      taskName,
      displayName,
      planType,
      sessionId: session.id,
      workspaceSessionId,
      workspacePath,
      duration: result.duration,
      stats: result.stats,
      tokens: result.tokens,
      logPath: result.logPath,
      metadataPath,
      projectId,
    };
  } catch (err) {
    error(`${displayName} failed: ${err.message}`);
    throw err;
  }
}

async function main() {
  let projectId = process.argv[2] || process.env.PROJECT_ID;

  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    console.log(`
${colors.bright}RUN PLAN GENERATION${colors.reset}

Execute PQP, EMP, and OHSMP generation tasks in parallel for a specific project ID.

${colors.cyan}Usage:${colors.reset}
  node run-plan-generation.js <project-id>

  Or set PROJECT_ID environment variable:
  PROJECT_ID=<project-id> node run-plan-generation.js

${colors.cyan}Example:${colors.reset}
  node run-plan-generation.js b168e975-2531-527f-9abd-19cb8f502fe0

${colors.cyan}Tips:${colors.reset}
  1. Start stream.py in another terminal for detailed output
  2. Logs are saved to each workspace/session-log.json (optimized, no deltas)
  3. Results are written to Neo4j Generated DB (port 7690)
  4. Metadata is saved to workspace/orchestrator-meta.json

${colors.cyan}Requirements:${colors.reset}
  - OpenCode server running on port 4096
  - Neo4j databases accessible (ports 7687, 7688, 7689, 7690)
  - Valid credentials in connection details.md
`);
    process.exit(1);
  }

  projectId = projectId.trim();

  log(`Starting plan generation`, 'bright');
  log(`Project ID: ${projectId}`, 'cyan');
  log(`Server: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Model: ${CONFIG.MODEL.providerID}/${CONFIG.MODEL.modelID}`, 'blue');

  const tasks = PLAN_TASKS.map((task) => executePlanTask(projectId, task));
  const results = await Promise.allSettled(tasks);

  const successResults = [];
  const failureResults = [];

  results.forEach((result, index) => {
    const taskConfig = PLAN_TASKS[index];
    if (result.status === 'fulfilled') {
      successResults.push(result.value);
    } else {
      failureResults.push({
        taskName: taskConfig.taskName,
        displayName: taskConfig.displayName,
        error: result.reason?.message || 'Unknown error',
      });
    }
  });

  console.log('');
  log('='.repeat(60), 'bright');
  if (failureResults.length === 0) {
    log(`SUCCESS! All plan generation tasks completed`, 'green');
  } else {
    log(`COMPLETED WITH ERRORS`, 'yellow');
  }
  log('='.repeat(60), 'bright');
  console.log('');

  successResults.forEach((result) => {
    log(`${result.displayName}:`, 'cyan');
    log(`  Task: ${result.taskName}`, 'cyan');
    log(`  Session: ${result.sessionId}`, 'cyan');
    log(`  Workspace: ${result.workspacePath}`, 'cyan');
    log(`  Duration: ${result.duration}s`, 'cyan');
    log(`  Logs: ${result.logPath}`, 'cyan');
    log(`  Metadata: ${result.metadataPath}`, 'cyan');
    if (result.tokens) {
      const total = result.tokens.input + result.tokens.output + result.tokens.reasoning;
      log(`  Tokens: ${total.toLocaleString()} (input: ${result.tokens.input.toLocaleString()}, output: ${result.tokens.output.toLocaleString()}, reasoning: ${result.tokens.reasoning.toLocaleString()})`, 'cyan');
    }
    log('', 'reset');
  });

  if (failureResults.length > 0) {
    log(`Failed tasks:`, 'red');
    failureResults.forEach((fail) => {
      log(`  ${fail.displayName}: ${fail.error}`, 'red');
    });
    process.exit(1);
  }

  log(`Check Neo4j Generated DB (port 7690) for results`, 'yellow');
  process.exit(0);
}

main();
