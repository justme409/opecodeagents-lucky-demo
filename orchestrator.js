#!/usr/bin/env node

/**
 * OpenCode Agent Orchestrator v2.0
 * 
 * MAJOR CHANGES:
 * - Uses SINGLE OpenCode server with multiple sessions (not multiple servers)
 * - Streams ALL events for EVERY session
 * - Updated for new master schema architecture
 * - Optimized task dependencies based on schema relationships
 * 
 * Features:
 * - Task dependency management
 * - Parallel execution of independent tasks
 * - Dynamic ITP generation (extracts list from PQP, runs in parallel)
 * - Real-time progress monitoring with full event streaming
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
  MAX_PARALLEL: 10, // Maximum parallel agent executions
  RETRY_ATTEMPTS: 2,
  TIMEOUT_MS: 900000, // 15 minutes per task
  PROJECT_ID: 'b168e975-2531-527f-9abd-19cb8f502fe0', // Frontend project ID (using projectId not UUID)
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
// OPTIMIZED based on new schema relationships
const TASK_GRAPH = {
  // WAVE 1 (Priority 1): All independent tasks that only read source databases
  'project-details': {
    description: 'Extract project metadata and parties',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['Project', 'WorkType', 'AreaCode'],
  },
  'document-metadata': {
    description: 'Extract document register metadata',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['Document'],
  },
  'standards-extraction': {
    description: 'Extract referenced standards',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['Standard'],
  },
  'wbs-extraction': {
    description: 'Extract Work Breakdown Structure',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['WBSNode'],
  },
  'pqp-generation': {
    description: 'Generate Project Quality Plan',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['ManagementPlan'],
  },
  'emp-generation': {
    description: 'Generate Environmental Management Plan',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['ManagementPlan'],
  },
  'ohsmp-generation': {
    description: 'Generate OHS Management Plan',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['ManagementPlan'],
  },
  'qse-generation': {
    description: 'Generate QSE system content',
    dependencies: [],
    parallel: true,
    priority: 1,
    entities: ['ManagementPlan', 'Document'],
  },
  
  // WAVE 2 (Priority 2): LBS needs WBS (MAPPED_TO relationship)
  'lbs-extraction': {
    description: 'Extract Location Breakdown Structure',
    dependencies: ['wbs-extraction'], // LBS nodes have MAPPED_TO relationships with WBS nodes
    parallel: false,
    priority: 2,
    entities: ['LBSNode'],
  },
  
  // WAVE 3 (Priority 3): ITP generation needs PQP (references ITPs), WBS (COVERS_WBS), Standards
  'itp-generation': {
    description: 'Generate ITPs (extracted from PQP)',
    dependencies: ['pqp-generation', 'wbs-extraction', 'standards-extraction'],
    parallel: false,
    priority: 3,
    dynamic: true,
    entities: ['ITPTemplate', 'InspectionPoint'],
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
          resolve({ sessionId: sessionId, workspacePath });
        } else {
          reject(new Error('Could not extract session ID from output'));
        }
      } else {
        reject(new Error(`Spawner failed with code ${code}: ${errorOutput}`));
      }
    });
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

// Global event stream manager
class EventStreamManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.sessions = new Map();
    this.eventStream = null;
    this.buffer = '';
  }
  
  start() {
    return new Promise((resolve, reject) => {
      log('Starting global event stream...', 'blue');
      
      const eventUrl = `${this.baseUrl}/event`;
      
      http.get(eventUrl, (res) => {
        this.eventStream = res;
        
        res.on('data', (chunk) => {
          this.buffer += chunk.toString();
          
          const events = this.buffer.split('\n\n');
          this.buffer = events.pop();
          
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
              this.handleEvent(eventData);
            }
          });
        });
        
        res.on('error', (err) => {
          log(`Event stream error: ${err.message}`, 'red');
          reject(err);
        });
        
        // Wait a bit for connection
        setTimeout(() => {
          log('✓ Event stream connected', 'green');
          resolve();
        }, 1000);
      }).on('error', reject);
    });
  }
  
  handleEvent(eventData) {
    const sessionID = eventData.properties?.sessionID;
    if (!sessionID) return;
    
    const session = this.sessions.get(sessionID);
    if (!session) return;
    
    // Log all events for this session
    session.eventLog.events.push({
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
        log(`  [${session.taskName}] 🔧 ${tool}: ${title}`, 'gray');
      }
    }
    
    // Handle session.idle - task complete
    if (eventData.type === 'session.idle') {
      session.eventLog.endTime = Date.now();
      session.eventLog.duration = session.eventLog.endTime - session.eventLog.startTime;
      session.eventLog.status = 'completed';
      
      // Save logs
      saveLogs(session.workspacePath, session.fileSessionId, session.taskName, session.eventLog);
      
      log(`✓ Task completed: ${session.taskName}`, 'green');
      session.resolve({ success: true });
    }
    
    // Handle errors
    if (eventData.type === 'session.error') {
      session.eventLog.endTime = Date.now();
      session.eventLog.duration = session.eventLog.endTime - session.eventLog.startTime;
      session.eventLog.status = 'failed';
      session.eventLog.error = eventData.properties?.error;
      
      // Save logs even on error
      saveLogs(session.workspacePath, session.fileSessionId, session.taskName, session.eventLog);
      
      const error = eventData.properties?.error?.data?.message || 'Unknown error';
      log(`✗ Task failed: ${session.taskName} - ${error}`, 'red');
      session.reject(new Error(error));
    }
  }
  
  registerSession(apiSessionId, fileSessionId, workspacePath, taskName, resolve, reject) {
    const eventLog = {
      taskName,
      fileSessionId,
      apiSessionId,
      workspacePath,
      startTime: Date.now(),
      events: [],
    };
    
    this.sessions.set(apiSessionId, {
      fileSessionId,
      workspacePath,
      taskName,
      eventLog,
      resolve,
      reject,
    });
    
    return eventLog;
  }
  
  unregisterSession(apiSessionId) {
    this.sessions.delete(apiSessionId);
  }
  
  stop() {
    if (this.eventStream) {
      this.eventStream.destroy();
    }
  }
}

// Execute agent task using existing OpenCode server
function executeAgentTask(eventManager, fileSessionId, workspacePath, taskName, prompt) {
  return new Promise((resolve, reject) => {
    const baseUrl = `http://${CONFIG.OPENCODE_HOST}:${CONFIG.OPENCODE_PORT}`;
    const timeout = setTimeout(() => {
      reject(new Error(`Task timeout after ${CONFIG.TIMEOUT_MS}ms`));
    }, CONFIG.TIMEOUT_MS);
    
    log(`Executing task: ${taskName}`, 'cyan');
    
    // Create session on the shared OpenCode server
    request(`${baseUrl}/session?directory=${encodeURIComponent(workspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Agent: ${taskName}` }),
    })
      .then((session) => {
        const apiSessionId = session.id;
        
        // Register with event manager
        const eventLog = eventManager.registerSession(
          apiSessionId,
          fileSessionId,
          workspacePath,
          taskName,
          (result) => {
            clearTimeout(timeout);
            eventManager.unregisterSession(apiSessionId);
            resolve(result);
          },
          (error) => {
            clearTimeout(timeout);
            eventManager.unregisterSession(apiSessionId);
            reject(error);
          }
        );
        
        eventLog.prompt = prompt;
        
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
        clearTimeout(timeout);
        reject(err);
      });
  });
}

// Extract ITP list from PQP
async function extractITPList(eventManager, pqpWorkspacePath) {
  log('Extracting ITP list from PQP...', 'blue');
  
  const baseUrl = `http://${CONFIG.OPENCODE_HOST}:${CONFIG.OPENCODE_PORT}`;
  
  const prompt = `Query the Generated database (port 7690) to extract the list of required ITPs from the Project Quality Plan.

Return ONLY a JSON array of ITP names, like this:
["Concrete Works ITP", "Steel Reinforcement ITP", "Formwork ITP"]

Query the ManagementPlan node (type='PQP') and extract all ITP requirements mentioned in the content.`;
  
  try {
    // Create session
    const session = await request(`${baseUrl}/session?directory=${encodeURIComponent(pqpWorkspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Extract ITP List' }),
    });
    
    // Send prompt
    await request(`${baseUrl}/session/${session.id}/message?directory=${encodeURIComponent(pqpWorkspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
      }),
    });
    
    // Wait for completion
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
    
    // Fallback
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
async function executeITPGeneration(eventManager, itpList, maxParallel) {
  log(`Generating ${itpList.length} ITPs in parallel (max ${maxParallel})...`, 'cyan');
  
  const results = [];
  const executing = [];
  
  for (const itpName of itpList) {
    const promise = (async () => {
      try {
        // Spawn workspace
        const { sessionId, workspacePath } = await spawnAgentWorkspace('itp-generation');
        
        // Execute task with specific ITP name
        const projectIdHeader = `# Project Context\n\n**IMPORTANT: Project ID**\n\nThis project's ID is: \`${CONFIG.PROJECT_ID}\`\n\nAll nodes you create MUST include a \`projectId\` property set to this value.\n\n---\n\n`;
        const prompt = projectIdHeader + `Generate the Inspection and Test Plan (ITP) for: "${itpName}"

Follow the instructions in prompt.md and AGENT_SCHEMA.md, but focus specifically on this ITP.
Query the databases for relevant information about this work type.
Generate the complete ITP structure and write to the Generated database (port 7690).

Use business keys (projectId + docNo) - DO NOT generate UUIDs!`;
        
        await executeAgentTask(eventManager, sessionId, workspacePath, `ITP: ${itpName}`, prompt);
        
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
      const index = executing.findIndex(p => p === promise);
      if (index > -1) executing.splice(index, 1);
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
    this.startTime = Date.now();
    this.eventManager = null;
    
    // Initialize task states
    Object.keys(TASK_GRAPH).forEach(task => {
      this.taskStates[task] = 'pending';
    });
    
    // Create log directory
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
  }
  
  async initialize() {
    // Start global event stream
    const baseUrl = `http://${CONFIG.OPENCODE_HOST}:${CONFIG.OPENCODE_PORT}`;
    this.eventManager = new EventStreamManager(baseUrl);
    await this.eventManager.start();
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
    log(`Entities: ${task.entities.join(', ')}`, 'gray');
    log(`${'='.repeat(80)}\n`, 'cyan');
    
    try {
      // Special handling for ITP generation
      if (taskName === 'itp-generation') {
        // Get PQP workspace
        const pqpResult = this.taskResults['pqp-generation'];
        if (!pqpResult) {
          throw new Error('PQP generation result not found');
        }
        
        // Extract ITP list
        const itpList = await extractITPList(this.eventManager, pqpResult.workspacePath);
        
        // Generate ITPs in parallel
        const itpResults = await executeITPGeneration(this.eventManager, itpList, CONFIG.MAX_PARALLEL);
        
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
      
      // Read the prompt file and inject projectId
      const promptPath = path.join(workspacePath, 'prompt.md');
      let prompt = fs.readFileSync(promptPath, 'utf8');
      
      // Prepend projectId to the prompt
      const projectIdHeader = `# Project Context\n\n**IMPORTANT: Project ID**\n\nThis project's ID is: \`${CONFIG.PROJECT_ID}\`\n\nYou MUST use this exact value as the \`projectId\` field in all nodes you create.\nAll nodes must include \`projectId\` for multi-tenancy.\n\n**Use Business Keys:** Do NOT generate UUIDs. Use natural business keys as defined in AGENT_SCHEMA.md.\n\n---\n\n`;
      prompt = projectIdHeader + prompt;
      
      await executeAgentTask(this.eventManager, sessionId, workspacePath, taskName, prompt);
      
      this.taskStates[taskName] = 'completed';
      this.taskResults[taskName] = {
        success: true,
        sessionId,
        workspacePath,
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
    log('║       OpenCode Agent Orchestrator v2.0 - Starting            ║', 'magenta');
    log('║       Single Server + Multiple Sessions Architecture         ║', 'magenta');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    await this.initialize();
    
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
    
    // Stop event stream
    this.eventManager.stop();
    
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
