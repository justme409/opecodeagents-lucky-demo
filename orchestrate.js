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
const neo4j = require('neo4j-driver');

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

const NEO4J_CONFIG = {
  uri: process.env.NEO4J_URI,
  user: process.env.NEO4J_USER,
  password: process.env.NEO4J_PASSWORD,
};

// Task definitions with dependencies
const TASKS = {
  // Wave 1: Independent
  'project-details': { deps: [], priority: 1 },
  'document-metadata': { deps: [], priority: 1 },
  'wbs-extraction': { deps: ['pqp-generation'], priority: 2 },
  'pqp-generation': { deps: [], priority: 1 },
  'emp-generation': { deps: [], priority: 1 },
  'ohsmp-generation': { deps: [], priority: 1 },
  
  // Wave 2: Needs WBS
  'lbs-extraction': { deps: ['wbs-extraction'], priority: 3 },
  
  // Wave 3: Needs PQP + WBS
  'itp-generation': { deps: ['pqp-generation', 'wbs-extraction'], priority: 4 },
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

let neo4jDriver = null;

function ensureNeo4jConfig() {
  if (!NEO4J_CONFIG.uri || !NEO4J_CONFIG.user || !NEO4J_CONFIG.password) {
    throw new Error('Missing Neo4j connection configuration. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD env vars.');
  }
}

function getNeo4jDriver() {
  ensureNeo4jConfig();
  if (!neo4jDriver) {
    neo4jDriver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password),
      { disableLosslessIntegers: true }
    );
  }
  return neo4jDriver;
}

async function loadRequiredItpRequirements(projectId) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (plan:ManagementPlan {projectId: $projectId, type: 'PQP'})
       WHERE coalesce(plan.isDeleted, false) = false
         AND plan.requiredItps IS NOT NULL
         AND size(plan.requiredItps) > 0
       RETURN plan
       ORDER BY plan.updatedAt DESC, plan.version DESC
       LIMIT 1`,
      { projectId }
    );

    if (result.records.length === 0) {
      return { plan: null, requiredItps: [] };
    }

    const planNode = result.records[0].get('plan');
    const planProps = planNode.properties || {};

    let requiredItpsRaw = planProps.requiredItps;
    let requiredItps = [];

    if (Array.isArray(requiredItpsRaw)) {
      requiredItps = requiredItpsRaw;
    } else if (typeof requiredItpsRaw === 'string') {
      const trimmed = requiredItpsRaw.trim();
      if (trimmed.length > 0) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            requiredItps = parsed;
          } else {
            log('Warning: requiredItps string JSON did not parse to array; ignoring.', 'yellow');
          }
        } catch (err) {
          log(`Warning: unable to parse requiredItps JSON (${err.message}); ignoring.`, 'yellow');
        }
      }
    } else if (requiredItpsRaw && typeof requiredItpsRaw === 'object') {
      // Handle Neo4j list represented as object with numeric keys (unlikely but defensive)
      const maybeArray = Object.values(requiredItpsRaw);
      if (maybeArray.every((_, idx) => `${idx}` in requiredItpsRaw)) {
        requiredItps = maybeArray;
      }
    }

    return {
      plan: {
        elementId: planNode.elementId,
        identity: typeof planNode.identity === 'number' ? planNode.identity : undefined,
        title: planProps.title,
        version: planProps.version,
        approvalStatus: planProps.approvalStatus,
        updatedAt: planProps.updatedAt,
      },
      requiredItps,
    };
  } finally {
    await session.close();
  }
}

process.on('exit', () => {
  if (neo4jDriver) {
    neo4jDriver.close().catch(() => {});
  }
});

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

async function executeTask(taskName, projectId, options = {}) {
  const displayName = options.displayName || taskName;
  log(`Starting: ${displayName}`, 'cyan');
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
      body: JSON.stringify({ title: `Agent: ${displayName}` }),
    });
    
    log(`  Session: ${session.id}`, 'blue');

    // 2b. Persist orchestrator metadata for downstream tools
    const metadata = {
      projectId,
      taskName,
      displayName,
      workspaceSessionId,
      orchestratorSessionId: session.id,
      workspacePath,
      serverUrl: CONFIG.SERVER_URL,
      startedAt: taskStartedAt,
      context: options.context || null,
    };
    const metadataPath = `${workspacePath}/orchestrator-meta.json`;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    log(`  Metadata saved: orchestrator-meta.json`, 'blue');

    if (options.context?.requiredItp) {
      const requirementPath = `${workspacePath}/required-itp.json`;
      fs.writeFileSync(requirementPath, JSON.stringify(options.context.requiredItp, null, 2));
      log(`  Requirement saved: required-itp.json`, 'blue');
    }
    
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
      `Steps:`,
      `1. cd ${workspacePath}`,
      `2. cat instructions.md`,
      `3. cat prompt.md`,
      `4. Follow the instructions in those files exactly.`
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
    
    log(`  ✓ Completed: ${displayName} (${result.duration}s)`, 'green');
    log(`    Tools: ${result.stats.toolCount}, Bash: ${result.stats.bashCount}, Files: ${result.stats.fileOps}`, 'blue');
    if (result.tokens) {
      const total = result.tokens.input + result.tokens.output + result.tokens.reasoning;
      log(`    Tokens: ${total.toLocaleString()} (input: ${result.tokens.input.toLocaleString()}, output: ${result.tokens.output.toLocaleString()}, reasoning: ${result.tokens.reasoning.toLocaleString()})`, 'blue');
    }
    
    return { 
      success: true, 
      sessionId: session.id, 
      workspaceSessionId,
      workspacePath,
      duration: result.duration,
      stats: result.stats,
      tokens: result.tokens,
      metadataPath,
      projectId,
      context: options.context || null,
      displayName,
    };
    
  } catch (error) {
    log(`  ✗ Failed: ${displayName} - ${error.message}`, 'red');
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
    this.dynamicTasks = {};
    
    this.taskList.forEach((task) => {
      this.states[task] = 'pending';
    });
  }
  
  async prepareDynamicTasks() {
    if (!this.taskList.includes('itp-generation')) {
      return;
    }

    try {
      const { plan, requiredItps } = await loadRequiredItpRequirements(this.projectId);
      if (!requiredItps || requiredItps.length === 0) {
        log('No required ITPs found on PQP plan; running single itp-generation task.', 'yellow');
        return;
      }

      const insertionIndex = this.taskList.indexOf('itp-generation');
      this.taskList.splice(insertionIndex, 1);
      delete this.states['itp-generation'];

      requiredItps.forEach((requirement, idx) => {
        const docNoSlug = (requirement.docNo || `ITP-${idx + 1}`).replace(/\s+/g, '-');
        const taskName = `itp-generation#${docNoSlug}`;
        this.taskList.splice(insertionIndex + idx, 0, taskName);
        this.states[taskName] = 'pending';
        this.dynamicTasks[taskName] = {
          base: 'itp-generation',
          requiredItp: requirement,
          plan,
          index: idx,
          total: requiredItps.length,
        };
      });

      const planLabel = plan?.title ? `${plan.title} v${plan.version || ''}`.trim() : 'latest PQP plan';
      log(`Expanded itp-generation into ${requiredItps.length} task(s) using ${planLabel}.`, 'cyan');
    } catch (error) {
      log(`Warning: unable to load required ITP requirements (${error.message}). Falling back to single itp-generation run.`, 'yellow');
    }
  }

  canRun(taskName) {
    if (!Object.prototype.hasOwnProperty.call(this.states, taskName)) return false;
    if (this.states[taskName] !== 'pending') return false;
    const taskConfig = TASKS[taskName] || (this.dynamicTasks[taskName] ? TASKS[this.dynamicTasks[taskName].base] : null);
    if (!taskConfig) return false;
    const deps = taskConfig.deps || [];
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
    
    const dynamicMeta = this.dynamicTasks[taskName] || null;
    const actualTaskName = dynamicMeta ? dynamicMeta.base : taskName;
    const displayName = dynamicMeta
      ? `${actualTaskName} (${dynamicMeta.requiredItp.docNo || dynamicMeta.requiredItp.workType || taskName})`
      : taskName;
    const context = dynamicMeta
      ? {
          requiredItp: dynamicMeta.requiredItp,
          plan: dynamicMeta.plan,
          index: dynamicMeta.index,
          total: dynamicMeta.total,
        }
      : null;

    try {
      const result = await executeTask(actualTaskName, this.projectId, {
        displayName,
        context,
      });
      this.states[taskName] = 'completed';
      this.results[taskName] = result;
      log(`✓ ${displayName}`, 'green');
    } catch (error) {
      this.states[taskName] = 'failed';
      this.results[taskName] = { success: false, error: error.message, displayName };
      log(`✗ ${displayName}: ${error.message}`, 'red');
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

    await this.prepareDynamicTasks();

    log('Tasks:', 'cyan');
    this.taskList.forEach((name) => {
      const task = TASKS[name] || (this.dynamicTasks[name] ? TASKS[this.dynamicTasks[name].base] : null);
      const deps = (task?.deps?.length > 0) ? ` (needs: ${task.deps.join(', ')})` : '';
      const priority = task?.priority ?? '?';
      log(`  ${priority}. ${name}${deps}`, 'blue');
    });
    log('');
    
    const startTime = Date.now();
    
    // Ensure project-details runs first and completes before other tasks
    const projectDetailsIndex = this.taskList.indexOf('project-details');
    if (projectDetailsIndex !== -1 && this.states['project-details'] === 'pending') {
      log('Running project-details first to establish project node...', 'cyan');
      await this.runTask('project-details');
      
      if (this.states['project-details'] === 'failed') {
        log('project-details failed. Continuing with remaining tasks...', 'yellow');
      } else {
        log('project-details completed. Starting remaining tasks...', 'green');
      }
    }
    
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
    let totalTokens = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
    
    this.taskList.forEach((name) => {
      const state = this.states[name];
      const symbol = state === 'completed' ? '✓' : state === 'failed' ? '✗' : '⋯';
      const color = state === 'completed' ? 'green' : state === 'failed' ? 'red' : 'yellow';
      const result = this.results[name];
      const label = result?.displayName || name;
      
      if (state === 'completed' && result?.stats) {
        totalTools += result.stats.toolCount || 0;
        totalBash += result.stats.bashCount || 0;
        totalFiles += result.stats.fileOps || 0;
        if (result.tokens) {
          totalTokens.input += result.tokens.input || 0;
          totalTokens.output += result.tokens.output || 0;
          totalTokens.reasoning += result.tokens.reasoning || 0;
          if (result.tokens.cacheRead) totalTokens.cacheRead += result.tokens.cacheRead || 0;
          if (result.tokens.cacheWrite) totalTokens.cacheWrite += result.tokens.cacheWrite || 0;
        }
        const sessionInfo = result.sessionId ? `Session: ${result.sessionId}` : 'Session: n/a';
        const workspaceInfo = result.workspaceSessionId ? `Workspace: ${result.workspaceSessionId}` : '';
        const metadataInfo = result.metadataPath ? `Metadata: ${result.metadataPath}` : '';
        const detailParts = [`Duration: ${result.duration}s`, sessionInfo];
        if (workspaceInfo) detailParts.push(workspaceInfo);
        if (metadataInfo) detailParts.push(metadataInfo);
        detailParts.push(`Tools: ${result.stats.toolCount}`, `Bash: ${result.stats.bashCount}`, `Files: ${result.stats.fileOps}`);
        log(`  ${symbol} ${label} - ${detailParts.join(' | ')}`, color);
      } else {
        const sessionInfo = result?.sessionId ? ` (session ${result.sessionId})` : '';
        log(`  ${symbol} ${label}: ${state}${sessionInfo}`, color);
      }
      
      if (result?.error) {
        log(`    Error: ${result.error}`, 'red');
      }
    });
    
    if (completed > 0) {
      log(`\nTotal Stats:`, 'cyan');
      log(`  Tools: ${totalTools}, Bash: ${totalBash}, Files: ${totalFiles}`, 'blue');
      const totalTokenCount = totalTokens.input + totalTokens.output + totalTokens.reasoning;
      if (totalTokenCount > 0) {
        log(`  Tokens: ${totalTokenCount.toLocaleString()} (input: ${totalTokens.input.toLocaleString()}, output: ${totalTokens.output.toLocaleString()}, reasoning: ${totalTokens.reasoning.toLocaleString()})`, 'blue');
      }
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
