#!/usr/bin/env node
/**
 * OpenCode Agent Orchestrator - Ultra Simple
 * Just spawns workspaces and sends "read instructions.md" - that's it!
 */

const http = require('http');
const { spawn } = require('child_process');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
  MAX_PARALLEL: 5,
  POLL_INTERVAL: 2000,
};

// Task definitions with dependencies
const TASKS = {
  // Wave 1: Independent
  'project-details': { deps: [], priority: 1 },
  'document-metadata': { deps: [], priority: 1 },
  'standards-extraction': { deps: [], priority: 1 },
  'wbs-extraction': { deps: [], priority: 1 },
  'pqp-generation': { deps: [], priority: 1 },
  'emp-generation': { deps: [], priority: 1 },
  'ohsmp-generation': { deps: [], priority: 1 },
  'qse-generation': { deps: [], priority: 1 },
  
  // Wave 2: Needs WBS
  'lbs-extraction': { deps: ['wbs-extraction'], priority: 2 },
  
  // Wave 3: Needs PQP + WBS + Standards
  'itp-generation': { deps: ['pqp-generation', 'wbs-extraction', 'standards-extraction'], priority: 3 },
};

function log(msg, color = '') {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  const c = colors[color] || '';
  console.log(`${c}[${new Date().toISOString().substring(11, 23)}] ${msg}${colors.reset}`);
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function spawnWorkspace(taskName) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.SPAWNER, [taskName]);
    let output = '';
    
    proc.stdout.on('data', (data) => output += data.toString());
    proc.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/Session ID: ([^\n]+)/);
        if (match) {
          const sessionId = match[1].trim();
          resolve({
            sessionId,
            workspacePath: `${CONFIG.WORKSPACE_BASE}/${sessionId}`
          });
        } else {
          reject(new Error('Could not extract session ID'));
        }
      } else {
        reject(new Error(`Spawner failed with code ${code}`));
      }
    });
  });
}

async function executeTask(taskName) {
  log(`Starting: ${taskName}`, 'cyan');
  
  // 1. Spawn workspace (creates all files)
  const { sessionId, workspacePath } = await spawnWorkspace(taskName);
  log(`  Workspace: ${sessionId}`, 'blue');
  
  // 2. Create session (no directory param needed - cd in prompt handles it)
  const session = await request(`${CONFIG.SERVER_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `Agent: ${taskName}` }),
  });
  
  log(`  Session: ${session.id}`, 'blue');
  
  // 3. Send prompt with cd command (NO directory in message URL!)
  const prompt = `cd ${workspacePath} && cat prompt.md and follow those instructions`;
  
  await request(`${CONFIG.SERVER_URL}/session/${session.id}/message`, {  // NO directory param!
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parts: [{ type: 'text', text: prompt }],
      model: { providerID: 'opencode', modelID: 'grok-code' },
      agent: 'build',
    }),
  });
  
  log(`  Prompt sent`, 'blue');
  
  // 4. Poll for completion
  while (true) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
    
    const messages = await request(`${CONFIG.SERVER_URL}/session/${session.id}/message`);  // NO directory!
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.info.role === 'assistant' && lastMessage.info.time.completed) {
      log(`  ✓ Completed: ${taskName}`, 'green');
      return { success: true, sessionId: session.id, workspacePath };
    }
  }
}

class Orchestrator {
  constructor() {
    this.states = {};
    this.results = {};
    this.running = new Set();
    
    Object.keys(TASKS).forEach(task => {
      this.states[task] = 'pending';
    });
  }
  
  canRun(taskName) {
    if (this.states[taskName] !== 'pending') return false;
    const deps = TASKS[taskName].deps;
    return deps.every(dep => this.states[dep] === 'completed');
  }
  
  getReadyTasks() {
    return Object.keys(TASKS)
      .filter(task => this.canRun(task))
      .sort((a, b) => TASKS[a].priority - TASKS[b].priority);
  }
  
  async runTask(taskName) {
    this.states[taskName] = 'running';
    this.running.add(taskName);
    
    try {
      const result = await executeTask(taskName);
      this.states[taskName] = 'completed';
      this.results[taskName] = result;
      log(`✓ ${taskName}`, 'green');
    } catch (error) {
      this.states[taskName] = 'failed';
      this.results[taskName] = { success: false, error: error.message };
      log(`✗ ${taskName}: ${error.message}`, 'red');
    } finally {
      this.running.delete(taskName);
    }
  }
  
  async run() {
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║          OpenCode Agent Orchestrator                           ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');
    
    log('Tasks:', 'cyan');
    Object.entries(TASKS).forEach(([name, task]) => {
      const deps = task.deps.length > 0 ? ` (needs: ${task.deps.join(', ')})` : '';
      log(`  ${task.priority}. ${name}${deps}`, 'blue');
    });
    log('');
    
    const startTime = Date.now();
    
    while (true) {
      const readyTasks = this.getReadyTasks();
      
      // Check if done
      const allDone = Object.values(this.states).every(s => s === 'completed' || s === 'failed');
      if (allDone && this.running.size === 0) break;
      
      // Start new tasks up to max parallel
      for (const task of readyTasks) {
        if (this.running.size >= CONFIG.MAX_PARALLEL) break;
        this.runTask(task); // Don't await - run in parallel
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Report
    const duration = (Date.now() - startTime) / 1000;
    const completed = Object.values(this.states).filter(s => s === 'completed').length;
    const failed = Object.values(this.states).filter(s => s === 'failed').length;
    
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║          Complete                                              ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');
    
    log(`Duration: ${duration.toFixed(1)}s`, 'cyan');
    log(`Completed: ${completed}/${Object.keys(TASKS).length}`, completed === Object.keys(TASKS).length ? 'green' : 'yellow');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log('');
    
    Object.entries(this.states).forEach(([name, state]) => {
      const symbol = state === 'completed' ? '✓' : state === 'failed' ? '✗' : '⋯';
      const color = state === 'completed' ? 'green' : state === 'failed' ? 'red' : 'yellow';
      log(`  ${symbol} ${name}: ${state}`, color);
      
      if (this.results[name]?.error) {
        log(`    Error: ${this.results[name].error}`, 'red');
      }
    });
    
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run
if (require.main === module) {
  new Orchestrator().run().catch(err => {
    log(`Fatal: ${err.message}`, 'red');
    process.exit(1);
  });
}
