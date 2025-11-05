#!/usr/bin/env node
/**
 * OpenCode Agent Orchestrator
 * 
 * Orchestrates multiple agent tasks with dependency management.
 * Uses event stream monitoring for instant completion detection.
 */

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const { monitorSession } = require('./lib/monitor');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
  MAX_PARALLEL: 5,
  MODEL: {
    providerID: 'opencode',
    modelID: 'grok-code'
  }
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

function collectTaskOrder(taskName, seen, order) {
  if (seen.has(taskName)) return;
  const task = TASKS[taskName];
  if (!task) {
    throw new Error(`Unknown task: ${taskName}`);
  }
  (task.deps || []).forEach((dep) => collectTaskOrder(dep, seen, order));
  seen.add(taskName);
  order.push(taskName);
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  let projectId = process.env.PROJECT_ID || null;
  let maxParallel = null;
  let tasksArg = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project-id' || arg === '--projectId') {
      projectId = args[i + 1];
      i++;
    } else if (arg.startsWith('--project-id=')) {
      projectId = arg.split('=')[1];
    } else if (arg.startsWith('--projectId=')) {
      projectId = arg.split('=')[1];
    } else if (arg === '--max-parallel' || arg === '--maxParallel') {
      maxParallel = args[i + 1];
      i++;
    } else if (arg.startsWith('--max-parallel=')) {
      maxParallel = arg.split('=')[1];
    } else if (arg.startsWith('--maxParallel=')) {
      maxParallel = arg.split('=')[1];
    } else if (arg === '--tasks') {
      tasksArg = args[i + 1];
      i++;
    } else if (arg.startsWith('--tasks=')) {
      tasksArg = arg.split('=')[1];
    }
  }

  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    console.error('\x1b[31m[ERROR]\x1b[0m Missing projectId. Provide via --project-id <uuid> or set PROJECT_ID env.');
    process.exit(1);
  }

  let parsedMaxParallel = null;
  if (maxParallel !== null && maxParallel !== undefined) {
    const value = Number(maxParallel);
    if (!Number.isFinite(value) || value < 1) {
      console.error('\x1b[31m[ERROR]\x1b[0m Invalid --max-parallel value. Must be a positive integer.');
      process.exit(1);
    }
    parsedMaxParallel = Math.floor(value);
  }

  let taskList = null;
  let explicitTasks = null;
  let addedDependencies = [];

  if (typeof tasksArg === 'string' && tasksArg.trim().length > 0) {
    const requested = tasksArg.split(',').map((t) => t.trim()).filter(Boolean);
    if (requested.length === 0) {
      console.error('\x1b[31m[ERROR]\x1b[0m --tasks provided but no valid task names found.');
      process.exit(1);
    }

    const seen = new Set();
    const order = [];
    requested.forEach((taskName) => collectTaskOrder(taskName, seen, order));

    explicitTasks = requested;
    taskList = order;
    addedDependencies = order.filter((task) => !requested.includes(task));
  }

  return {
    projectId: projectId.trim(),
    maxParallel: parsedMaxParallel,
    tasks: taskList,
    explicitTasks,
    addedDependencies
  };
}

const CLI_OPTIONS = parseCliArgs();
const PROJECT_ID = CLI_OPTIONS.projectId;

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

async function executeTask(taskName, projectId) {
  log(`Starting: ${taskName}`, 'cyan');
  const taskStartedAt = new Date().toISOString();
  
  try {
    // 1. Spawn workspace (creates all files)
    const { sessionId, workspacePath } = await spawnWorkspace(taskName);
    const workspaceSessionId = sessionId;
    log(`  Workspace: ${sessionId}`, 'blue');
    
    // 2. Create session
    const session = await request(`${CONFIG.SERVER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Agent: ${taskName}` }),
    });
    
    log(`  Session: ${session.id}`, 'blue');

    // 2b. Persist orchestrator metadata for downstream tools
    const metadata = {
      projectId,
      taskName,
      workspaceSessionId,
      orchestratorSessionId: session.id,
      workspacePath,
      serverUrl: CONFIG.SERVER_URL,
      startedAt: taskStartedAt
    };
    const metadataPath = `${workspacePath}/orchestrator-meta.json`;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    log(`  Metadata saved: orchestrator-meta.json`, 'blue');
    
    // 3. Start monitoring BEFORE sending prompt
    let lastProgress = '';
    const monitorPromise = monitorSession(session.id, workspacePath, {
      serverUrl: CONFIG.SERVER_URL,
      onProgress: (progress) => {
        // Show high-level progress updates
        let msg = '';
        if (progress.type === 'bash') {
          msg = `  Running bash commands (${progress.count} total)`;
        } else if (progress.type === 'file') {
          msg = `  File operations (${progress.count} total)`;
        } else if (progress.type === 'thinking') {
          msg = `  Agent thinking...`;
        } else if (progress.type === 'reasoning') {
          msg = `  Deep reasoning...`;
        }
        
        if (msg && msg !== lastProgress) {
          log(msg, 'blue');
          lastProgress = msg;
        }
      }
    });
    
    // 4. Send prompt
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
        agent: 'build',
      }),
    });
    
    log(`  Prompt sent, agent executing...`, 'blue');
    
    // 5. Wait for completion via event stream
    const result = await monitorPromise;
    
    log(`  ✓ Completed: ${taskName} (${result.duration}s)`, 'green');
    log(`    Tools: ${result.stats.toolCount}, Bash: ${result.stats.bashCount}, Files: ${result.stats.fileOps}`, 'blue');
    
    return { 
      success: true, 
      sessionId: session.id, 
      workspaceSessionId,
      workspacePath,
      duration: result.duration,
      stats: result.stats,
      metadataPath,
      projectId
    };
    
  } catch (error) {
    log(`  ✗ Failed: ${taskName} - ${error.message}`, 'red');
    throw error;
  }
}

class Orchestrator {
  constructor(options) {
    this.projectId = options.projectId;
    this.maxParallel = options.maxParallel || CONFIG.MAX_PARALLEL;
    this.explicitTasks = options.explicitTasks || null;
    this.addedDependencies = options.addedDependencies || [];
    this.taskList = (options.tasks && options.tasks.length > 0)
      ? options.tasks
      : Object.keys(TASKS);
    this.states = {};
    this.results = {};
    this.running = new Set();
    
    this.taskList.forEach((task) => {
      this.states[task] = 'pending';
    });
  }
  
  canRun(taskName) {
    if (!Object.prototype.hasOwnProperty.call(this.states, taskName)) return false;
    if (this.states[taskName] !== 'pending') return false;
    const deps = TASKS[taskName]?.deps || [];
    return deps.every((dep) => {
      if (!Object.prototype.hasOwnProperty.call(this.states, dep)) {
        return true;
      }
      return this.states[dep] === 'completed';
    });
  }
  
  getReadyTasks() {
    return this.taskList.filter((task) => this.canRun(task));
  }
  
  async runTask(taskName) {
    this.states[taskName] = 'running';
    this.running.add(taskName);
    
    try {
      const result = await executeTask(taskName, this.projectId);
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
    
    log(`Project ID: ${this.projectId}`, 'cyan');
    log(`Max Parallel: ${this.maxParallel}`, 'cyan');
    if (this.explicitTasks && this.explicitTasks.length > 0) {
      log(`Requested Tasks: ${this.explicitTasks.join(', ')}`, 'cyan');
    }
    if (this.addedDependencies.length > 0) {
      log(`Added Dependencies: ${this.addedDependencies.join(', ')}`, 'cyan');
    }
    log('Tasks:', 'cyan');
    this.taskList.forEach((name) => {
      const task = TASKS[name];
      const deps = (task?.deps?.length > 0) ? ` (needs: ${task.deps.join(', ')})` : '';
      const priority = task?.priority ?? '?';
      log(`  ${priority}. ${name}${deps}`, 'blue');
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
        if (this.running.size >= this.maxParallel) break;
        this.runTask(task); // Don't await - run in parallel
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Report
    const duration = (Date.now() - startTime) / 1000;
    const completed = this.taskList.filter((task) => this.states[task] === 'completed').length;
    const failed = this.taskList.filter((task) => this.states[task] === 'failed').length;
    
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║          Complete                                              ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');
    
    log(`Duration: ${duration.toFixed(1)}s`, 'cyan');
    log(`Completed: ${completed}/${this.taskList.length}`, completed === this.taskList.length ? 'green' : 'yellow');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log('');
    
    // Calculate total stats
    let totalTools = 0;
    let totalBash = 0;
    let totalFiles = 0;
    
    this.taskList.forEach((name) => {
      const state = this.states[name];
      const symbol = state === 'completed' ? '✓' : state === 'failed' ? '✗' : '⋯';
      const color = state === 'completed' ? 'green' : state === 'failed' ? 'red' : 'yellow';
      const result = this.results[name];
      
      if (state === 'completed' && result?.stats) {
        totalTools += result.stats.toolCount || 0;
        totalBash += result.stats.bashCount || 0;
        totalFiles += result.stats.fileOps || 0;
        const sessionInfo = result.sessionId ? `Session: ${result.sessionId}` : 'Session: n/a';
        const workspaceInfo = result.workspaceSessionId ? `Workspace: ${result.workspaceSessionId}` : '';
        const metadataInfo = result.metadataPath ? `Metadata: ${result.metadataPath}` : '';
        const detailParts = [`Duration: ${result.duration}s`, sessionInfo];
        if (workspaceInfo) detailParts.push(workspaceInfo);
        if (metadataInfo) detailParts.push(metadataInfo);
        detailParts.push(`Tools: ${result.stats.toolCount}`, `Bash: ${result.stats.bashCount}`, `Files: ${result.stats.fileOps}`);
        log(`  ${symbol} ${name} - ${detailParts.join(' | ')}`, color);
      } else {
        const sessionInfo = result?.sessionId ? ` (session ${result.sessionId})` : '';
        log(`  ${symbol} ${name}: ${state}${sessionInfo}`, color);
      }
      
      if (result?.error) {
        log(`    Error: ${result.error}`, 'red');
      }
    });
    
    if (completed > 0) {
      log(`\nTotal Stats:`, 'cyan');
      log(`  Tools: ${totalTools}, Bash: ${totalBash}, Files: ${totalFiles}`, 'blue');
      log(`  Event logs saved to each workspace/session-log.json`, 'blue');
    }
    
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run
if (require.main === module) {
  new Orchestrator({
    projectId: PROJECT_ID,
    maxParallel: CLI_OPTIONS.maxParallel,
    tasks: CLI_OPTIONS.tasks,
    explicitTasks: CLI_OPTIONS.explicitTasks,
    addedDependencies: CLI_OPTIONS.addedDependencies
  }).run().catch(err => {
    log(`Fatal: ${err.message}`, 'red');
    process.exit(1);
  });
}
