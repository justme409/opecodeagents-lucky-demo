#!/usr/bin/env node

/**
 * OpenCode Agent Orchestrator
 * 
 * Manages the execution of multiple agent tasks in the correct order,
 * handling dependencies and parallel execution where possible.
 * 
 * Features:
 * - Task dependency management
 * - Parallel execution of independent tasks
 * - Dynamic ITP generation (extracts list from PQP, runs in parallel)
 * - Real-time progress monitoring
 * - Error handling and retry logic
 * - Session tracking and logging
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  OPENCODE_PORT: process.env.OPENCODE_PORT || 4096,
  OPENCODE_HOST: process.env.OPENCODE_HOST || '127.0.0.1',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  AGENT_SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
  LOG_DIR: '/app/opencode-workspace/orchestrator-logs',
  MAX_PARALLEL: 10, // Maximum parallel agent executions (increased for Wave 1 optimization)
  RETRY_ATTEMPTS: 2,
  TIMEOUT_MS: 900000, // 15 minutes per task (increased for first run)
  PROJECT_UUID: 'b168e975-2531-527f-9abd-19cb8f502fe0', // Frontend project UUID
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Task definitions with dependencies
// OPTIMIZED: Most tasks run in parallel in Wave 1 since they only read source DBs
const TASK_GRAPH = {
  // WAVE 1 (Priority 1): All independent tasks that only read source databases
  'project-details': {
    description: 'Extract project metadata and parties',
    dependencies: [],
    parallel: true, // Changed: can run in parallel with others
    priority: 1,
  },
  'document-metadata': {
    description: 'Extract document register metadata',
    dependencies: [],
    parallel: true,
    priority: 1,
  },
  'wbs-extraction': {
    description: 'Extract Work Breakdown Structure',
    dependencies: [], // Removed: doesn't need project-details (uses project_uuid from prompt)
    parallel: true,
    priority: 1, // Changed from 2: can run in Wave 1
  },
  'pqp-generation': {
    description: 'Generate Project Quality Plan',
    dependencies: [], // Removed: doesn't need project-details or wbs (uses project_uuid from prompt)
    parallel: true, // Changed: can run in parallel
    priority: 1, // Changed from 4: can run in Wave 1
  },
  'emp-generation': {
    description: 'Generate Environmental Management Plan',
    dependencies: [], // Removed: doesn't need project-details or wbs (uses project_uuid from prompt)
    parallel: true,
    priority: 1, // Changed from 4: can run in Wave 1
  },
  'ohsmp-generation': {
    description: 'Generate OHS Management Plan',
    dependencies: [], // Removed: doesn't need project-details or wbs (uses project_uuid from prompt)
    parallel: true,
    priority: 1, // Changed from 4: can run in Wave 1
  },
  'qse-generation': {
    description: 'Generate QSE system content',
    dependencies: [], // Removed: doesn't need project-details (uses project_uuid from prompt)
    parallel: true,
    priority: 1, // Changed from 4: can run in Wave 1
  },
  
  // WAVE 2 (Priority 2): Tasks that need WBS from Generated DB
  'lbs-extraction': {
    description: 'Extract Location Breakdown Structure',
    dependencies: ['wbs-extraction'], // Removed project-details: only needs WBS nodes
    parallel: false,
    priority: 2, // Changed from 3
  },
  
  // WAVE 3 (Priority 3): ITP generation needs PQP, WBS, and LBS
  'itp-generation': {
    description: 'Generate ITPs (extracted from PQP)',
    dependencies: ['pqp-generation', 'wbs-extraction', 'lbs-extraction'],
    parallel: false, // Will spawn multiple parallel sub-tasks
    priority: 3, // Changed from 5
    dynamic: true, // Indicates this task spawns multiple agents
  },
};

// HTTP helper
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
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

// Spawn agent workspace
function spawnAgentWorkspace(taskName) {
  return new Promise((resolve, reject) => {
    log(`Spawning workspace for: ${taskName}`, 'blue');
    
    const spawner = spawn(CONFIG.AGENT_SPAWNER, [taskName], {
      cwd: path.dirname(CONFIG.AGENT_SPAWNER),
    });
    
    let output = '';
    let errorOutput = '';
    
    spawner.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    spawner.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    spawner.on('close', (code) => {
      if (code === 0) {
        // Extract session ID from output
        const match = output.match(/Session ID: ([^\n]+)/);
        if (match) {
          const sessionId = match[1].trim();
          const workspacePath = `${CONFIG.WORKSPACE_BASE}/${sessionId}`;
          log(`✓ Workspace created: ${sessionId}`, 'green');
          resolve({ sessionId, workspacePath });
        } else {
          reject(new Error('Could not extract session ID from output'));
        }
      } else {
        reject(new Error(`Spawner failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

// Start OpenCode server in workspace
function startOpenCodeServer(workspacePath, port) {
  return new Promise((resolve, reject) => {
    log(`Starting OpenCode server in: ${workspacePath}`, 'blue');
    
    const server = spawn('opencode', ['serve', '--port', port.toString()], {
      cwd: workspacePath,
      detached: true,
      stdio: 'ignore',
    });
    
    server.unref();
    
    // Wait for server to start
    setTimeout(() => {
      // Test connection
      request(`http://${CONFIG.OPENCODE_HOST}:${port}/config`)
        .then(() => {
          log(`✓ Server started on port ${port}`, 'green');
          resolve({ pid: server.pid, port });
        })
        .catch(reject);
    }, 2000);
  });
}

// Save logs to workspace
function saveLogs(workspacePath, sessionId, taskName, logs) {
  const logDir = path.join(workspacePath, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `${taskName}-execution.log`);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  log(`📝 Logs saved to: ${logFile}`, 'gray');
}

// Stream events and wait for completion
function executeAgentTask(sessionId, workspacePath, port, taskName, prompt) {
  return new Promise((resolve, reject) => {
    const baseUrl = `http://${CONFIG.OPENCODE_HOST}:${port}`;
    const timeout = setTimeout(() => {
      reject(new Error(`Task timeout after ${CONFIG.TIMEOUT_MS}ms`));
    }, CONFIG.TIMEOUT_MS);
    
    log(`Executing task: ${taskName}`, 'cyan');
    
    // Collect all events for logging
    const eventLog = {
      taskName,
      sessionId,
      workspacePath,
      port,
      startTime: Date.now(),
      events: [],
      prompt,
    };
    
    // Create session
    request(`${baseUrl}/session?directory=${encodeURIComponent(workspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Agent: ${taskName}` }),
    })
      .then((session) => {
        const apiSessionId = session.id;
        
        // Start event stream
        const eventUrl = new URL(`${baseUrl}/event?directory=${encodeURIComponent(workspacePath)}`);
        
        http.get(eventUrl, (res) => {
          let buffer = '';
          let taskComplete = false;
          
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            
            const events = buffer.split('\n\n');
            buffer = events.pop();
            
            events.forEach(eventStr => {
              if (!eventStr.trim()) return;
              
              const lines = eventStr.split('\n');
              let eventData = null;
              
              lines.forEach(line => {
                if (line.startsWith('data: ')) {
                  try {
                    eventData = JSON.parse(line.substring(6));
                  } catch (e) {}
                }
              });
              
              if (eventData) {
                // Log all events
                eventLog.events.push({
                  timestamp: Date.now(),
                  type: eventData.type,
                  data: eventData,
                });
                
                // Log tool calls for debugging
                if (eventData.type === 'message.part.updated' && 
                    eventData.properties?.part?.type === 'tool') {
                  const tool = eventData.properties.part.tool;
                  const status = eventData.properties.part.state?.status;
                  const title = eventData.properties.part.state?.title;
                  if (status === 'running' && title) {
                    log(`  🔧 ${tool}: ${title}`, 'gray');
                  }
                }
                
                // Handle session.idle - task complete
                if (eventData.type === 'session.idle' && 
                    eventData.properties?.sessionID === apiSessionId) {
                  taskComplete = true;
                  eventLog.endTime = Date.now();
                  eventLog.duration = eventLog.endTime - eventLog.startTime;
                  eventLog.status = 'completed';
                  clearTimeout(timeout);
                  res.destroy();
                  
                  // Save logs
                  saveLogs(workspacePath, sessionId, taskName, eventLog);
                  
                  log(`✓ Task completed: ${taskName}`, 'green');
                  resolve({ sessionId: apiSessionId, success: true });
                }
                
                // Handle errors
                if (eventData.type === 'session.error' &&
                    eventData.properties?.sessionID === apiSessionId) {
                  eventLog.endTime = Date.now();
                  eventLog.duration = eventLog.endTime - eventLog.startTime;
                  eventLog.status = 'failed';
                  eventLog.error = eventData.properties?.error;
                  clearTimeout(timeout);
                  res.destroy();
                  
                  // Save logs even on error
                  saveLogs(workspacePath, sessionId, taskName, eventLog);
                  
                  const error = eventData.properties?.error?.data?.message || 'Unknown error';
                  log(`✗ Task failed: ${taskName} - ${error}`, 'red');
                  reject(new Error(error));
                }
              }
            });
          });
          
          res.on('end', () => {
            if (!taskComplete) {
              eventLog.endTime = Date.now();
              eventLog.duration = eventLog.endTime - eventLog.startTime;
              eventLog.status = 'stream_ended';
              saveLogs(workspacePath, sessionId, taskName, eventLog);
              clearTimeout(timeout);
              reject(new Error('Event stream ended unexpectedly'));
            }
          });
          
          res.on('error', (err) => {
            eventLog.endTime = Date.now();
            eventLog.duration = eventLog.endTime - eventLog.startTime;
            eventLog.status = 'error';
            eventLog.error = err.message;
            saveLogs(workspacePath, sessionId, taskName, eventLog);
            clearTimeout(timeout);
            reject(err);
          });
        }).on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
        
        // Send the prompt
        setTimeout(() => {
          request(`${baseUrl}/session/${apiSessionId}/message?directory=${encodeURIComponent(workspacePath)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts: [{ type: 'text', text: prompt }],
            }),
          }).catch(reject);
        }, 1000);
      })
      .catch((err) => {
        eventLog.endTime = Date.now();
        eventLog.duration = eventLog.endTime - eventLog.startTime;
        eventLog.status = 'failed';
        eventLog.error = err.message;
        saveLogs(workspacePath, sessionId, taskName, eventLog);
        clearTimeout(timeout);
        reject(err);
      });
  });
}

// Extract ITP list from PQP
async function extractITPList(pqpWorkspacePath, port) {
  log('Extracting ITP list from PQP...', 'blue');
  
  const baseUrl = `http://${CONFIG.OPENCODE_HOST}:${port}`;
  
  // Query the Generated DB for ITP requirements from PQP
  const prompt = `Query the Generated database (port 7690) to extract the list of required ITPs from the Project Quality Plan.

Return ONLY a JSON array of ITP names, like this:
["Concrete Works ITP", "Steel Reinforcement ITP", "Formwork ITP"]

Query the PQP node and its relationships to find all required inspection and test plans.`;
  
  try {
    // Create session
    const session = await request(`${baseUrl}/session?directory=${encodeURIComponent(pqpWorkspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Extract ITP List' }),
    });
    
    // Send prompt and wait for response
    await request(`${baseUrl}/session/${session.id}/message?directory=${encodeURIComponent(pqpWorkspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
      }),
    });
    
    // Wait for completion and extract response
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const messages = await request(`${baseUrl}/session/${session.id}/message?directory=${encodeURIComponent(pqpWorkspacePath)}`);
    
    // Extract ITP list from response
    const assistantMessage = messages.find(m => m.info.role === 'assistant');
    if (assistantMessage) {
      const textPart = assistantMessage.parts.find(p => p.type === 'text');
      if (textPart) {
        const jsonMatch = textPart.text.match(/\[.*\]/s);
        if (jsonMatch) {
          const itpList = JSON.parse(jsonMatch[0]);
          log(`✓ Extracted ${itpList.length} ITPs`, 'green');
          return itpList;
        }
      }
    }
    
    // Fallback: return common ITPs
    log('Could not extract ITP list, using defaults', 'yellow');
    return [
      'Concrete Works ITP',
      'Steel Reinforcement ITP',
      'Formwork ITP',
      'Earthworks ITP',
      'Structural Steel ITP',
    ];
  } catch (error) {
    log(`Error extracting ITP list: ${error.message}`, 'red');
    return [];
  }
}

// Execute multiple ITP generation tasks in parallel
async function executeITPGeneration(itpList, maxParallel) {
  log(`Generating ${itpList.length} ITPs in parallel (max ${maxParallel})...`, 'cyan');
  
  const results = [];
  const executing = [];
  
  for (const itpName of itpList) {
    const promise = (async () => {
      try {
        // Spawn workspace
        const { sessionId, workspacePath } = await spawnAgentWorkspace('itp-generation');
        
        // Allocate port
        const port = parseInt(CONFIG.OPENCODE_PORT) + results.length + 1;
        
        // Start server
        await startOpenCodeServer(workspacePath, port);
        
        // Execute task with specific ITP name
        const projectUuidHeader = `# Project Context\n\n**IMPORTANT: Project UUID**\n\nThis project's UUID is: \`${CONFIG.PROJECT_UUID}\`\n\nAll nodes you create MUST include a \`project_uuid\` property set to this UUID value.\n\n**CRITICAL:** Use \`project_uuid\` (NOT \`id\`, NOT \`project_id\`) everywhere.\n\n---\n\n`;
        const prompt = projectUuidHeader + `Generate the Inspection and Test Plan (ITP) for: "${itpName}"

Follow the instructions in prompt.md, but focus specifically on this ITP.
Query the databases for relevant information about this work type.
Generate the complete ITP structure and write to the Generated database (port 7690).`;
        
        await executeAgentTask(sessionId, workspacePath, port, `ITP: ${itpName}`, prompt);
        
        log(`✓ ITP generated: ${itpName}`, 'green');
        return { itpName, success: true };
      } catch (error) {
        log(`✗ ITP failed: ${itpName} - ${error.message}`, 'red');
        return { itpName, success: false, error: error.message };
      }
    })();
    
    executing.push(promise);
    
    // Limit parallel execution
    if (executing.length >= maxParallel) {
      const result = await Promise.race(executing);
      results.push(result);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  // Wait for remaining tasks
  const remaining = await Promise.all(executing);
  results.push(...remaining);
  
  return results;
}

// Main orchestrator
class AgentOrchestrator {
  constructor() {
    this.taskStates = {};
    this.taskResults = {};
    this.runningTasks = new Map();
    this.startTime = Date.now();
    
    // Initialize task states
    Object.keys(TASK_GRAPH).forEach(task => {
      this.taskStates[task] = 'pending';
    });
    
    // Create log directory
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
  }
  
  // Check if task dependencies are met
  canExecuteTask(taskName) {
    const task = TASK_GRAPH[taskName];
    if (!task) return false;
    
    // Check if already running or completed
    if (this.taskStates[taskName] !== 'pending') return false;
    
    // Check dependencies
    return task.dependencies.every(dep => this.taskStates[dep] === 'completed');
  }
  
  // Get tasks ready to execute
  getReadyTasks() {
    return Object.keys(TASK_GRAPH)
      .filter(task => this.canExecuteTask(task))
      .sort((a, b) => TASK_GRAPH[a].priority - TASK_GRAPH[b].priority);
  }
  
  // Execute a single task
  async executeTask(taskName) {
    const task = TASK_GRAPH[taskName];
    this.taskStates[taskName] = 'running';
    
    log(`\n${'='.repeat(80)}`, 'cyan');
    log(`Starting task: ${taskName}`, 'cyan');
    log(`Description: ${task.description}`, 'gray');
    log(`${'='.repeat(80)}\n`, 'cyan');
    
    try {
      // Special handling for ITP generation
      if (taskName === 'itp-generation') {
        // Get PQP workspace (from previous task)
        const pqpResult = this.taskResults['pqp-generation'];
        if (!pqpResult) {
          throw new Error('PQP generation result not found');
        }
        
        // Extract ITP list
        const itpList = await extractITPList(pqpResult.workspacePath, pqpResult.port);
        
        // Generate ITPs in parallel
        const itpResults = await executeITPGeneration(itpList, CONFIG.MAX_PARALLEL);
        
        this.taskStates[taskName] = 'completed';
        this.taskResults[taskName] = {
          success: true,
          itpResults,
          count: itpList.length,
        };
        
        log(`✓ ITP generation completed: ${itpResults.filter(r => r.success).length}/${itpList.length} successful`, 'green');
        return;
      }
      
      // Standard task execution
      const { sessionId, workspacePath } = await spawnAgentWorkspace(taskName);
      
      // Allocate unique port
      const port = parseInt(CONFIG.OPENCODE_PORT) + Object.keys(this.taskResults).length + 1;
      
      await startOpenCodeServer(workspacePath, port);
      
      // Read the prompt file and inject project_uuid
      const promptPath = path.join(workspacePath, 'prompt.md');
      let prompt = fs.readFileSync(promptPath, 'utf8');
      
      // Prepend project_uuid to the prompt
      const projectUuidHeader = `# Project Context\n\n**IMPORTANT: Project UUID**\n\nThis project's UUID is: \`${CONFIG.PROJECT_UUID}\`\n\nYou MUST use this exact UUID as the \`project_uuid\` field when creating the Project node in Neo4j.\nAll other nodes you create MUST include a \`project_uuid\` property set to this UUID value.\n\n**CRITICAL:** Use \`project_uuid\` (NOT \`id\`, NOT \`project_id\`) everywhere.\n\n---\n\n`;
      prompt = projectUuidHeader + prompt;
      
      await executeAgentTask(sessionId, workspacePath, port, taskName, prompt);
      
      this.taskStates[taskName] = 'completed';
      this.taskResults[taskName] = {
        success: true,
        sessionId,
        workspacePath,
        port,
      };
      
      log(`✓ Task completed successfully: ${taskName}`, 'green');
    } catch (error) {
      log(`✗ Task failed: ${taskName} - ${error.message}`, 'red');
      this.taskStates[taskName] = 'failed';
      this.taskResults[taskName] = {
        success: false,
        error: error.message,
      };
      throw error;
    }
  }
  
  // Execute tasks in parallel where possible
  async executeBatch(tasks) {
    const promises = tasks.map(task => this.executeTask(task));
    return Promise.allSettled(promises);
  }
  
  // Main execution loop
  async run() {
    log('\n╔════════════════════════════════════════════════════════════════╗', 'magenta');
    log('║          OpenCode Agent Orchestrator - Starting               ║', 'magenta');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    log('Task execution plan:', 'cyan');
    Object.entries(TASK_GRAPH).forEach(([name, task]) => {
      const deps = task.dependencies.length > 0 ? ` (depends on: ${task.dependencies.join(', ')})` : '';
      log(`  ${task.priority}. ${name}${deps}`, 'gray');
    });
    log('');
    
    while (true) {
      const readyTasks = this.getReadyTasks();
      
      if (readyTasks.length === 0) {
        // Check if all tasks are done
        const allDone = Object.values(this.taskStates).every(
          state => state === 'completed' || state === 'failed'
        );
        
        if (allDone) {
          break;
        }
        
        // Wait for running tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Group tasks by whether they can run in parallel
      const parallelTasks = readyTasks.filter(task => TASK_GRAPH[task].parallel);
      const sequentialTasks = readyTasks.filter(task => !TASK_GRAPH[task].parallel);
      
      // Execute parallel tasks together
      if (parallelTasks.length > 0) {
        await this.executeBatch(parallelTasks);
      }
      
      // Execute sequential tasks one by one
      for (const task of sequentialTasks) {
        await this.executeTask(task);
      }
    }
    
    // Generate report
    this.generateReport();
  }
  
  // Generate execution report
  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    
    log('\n╔════════════════════════════════════════════════════════════════╗', 'magenta');
    log('║          Orchestration Complete - Final Report                ║', 'magenta');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    log(`Total execution time: ${duration.toFixed(2)}s`, 'cyan');
    log('');
    
    const completed = Object.values(this.taskStates).filter(s => s === 'completed').length;
    const failed = Object.values(this.taskStates).filter(s => s === 'failed').length;
    const total = Object.keys(this.taskStates).length;
    
    log(`Tasks completed: ${completed}/${total}`, completed === total ? 'green' : 'yellow');
    log(`Tasks failed: ${failed}/${total}`, failed > 0 ? 'red' : 'green');
    log('');
    
    log('Task results:', 'cyan');
    Object.entries(this.taskStates).forEach(([name, state]) => {
      const result = this.taskResults[name];
      const color = state === 'completed' ? 'green' : state === 'failed' ? 'red' : 'yellow';
      const symbol = state === 'completed' ? '✓' : state === 'failed' ? '✗' : '⋯';
      
      log(`  ${symbol} ${name}: ${state}`, color);
      
      if (result && result.error) {
        log(`    Error: ${result.error}`, 'red');
      }
      
      if (name === 'itp-generation' && result && result.itpResults) {
        log(`    Generated ${result.count} ITPs`, 'gray');
      }
    });
    
    // Save report to file
    const reportPath = path.join(CONFIG.LOG_DIR, `orchestration-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      startTime: this.startTime,
      endTime: Date.now(),
      duration,
      taskStates: this.taskStates,
      taskResults: this.taskResults,
    }, null, 2));
    
    log(`\nReport saved to: ${reportPath}`, 'cyan');
  }
}

// Main entry point
async function main() {
  try {
    const orchestrator = new AgentOrchestrator();
    await orchestrator.run();
    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { AgentOrchestrator, TASK_GRAPH };

