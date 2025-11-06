#!/usr/bin/env node
/**
 * Run ITP generation for every required ITP listed on the latest PQP plan
 * for a project. Leverages the same orchestration primitives used in
 * orchestrate.js but focuses solely on the itp-generation agent.
 */

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const neo4j = require('neo4j-driver');
const { monitorSession } = require('./lib/monitor');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
  MAX_PARALLEL: Number(process.env.ITP_MAX_PARALLEL || process.env.MAX_PARALLEL || 4),
  MODEL: {
    providerID: 'opencode',
    modelID: 'grok-code',
  },
};

const NEO4J_CONFIG = {
  uri: process.env.NEO4J_URI || process.env.NEO4J_GENERATED_URI || 'neo4j://localhost:7690',
  user: process.env.NEO4J_USER || process.env.NEO4J_GENERATED_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || process.env.NEO4J_GENERATED_PASSWORD || '27184236e197d5f4c36c60f453ebafd9',
};

function log(message, color = '') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
  };
  const timestamp = new Date().toLocaleTimeString();
  const prefix = colors[color] || '';
  console.log(`${prefix}[${timestamp}] ${message}${colors.reset}`);
}

function ensureNeo4jConfig() {
  if (!NEO4J_CONFIG.uri || !NEO4J_CONFIG.user || !NEO4J_CONFIG.password) {
    throw new Error('Missing Neo4j configuration. Set NEO4J_URI/USER/PASSWORD or their GENERATED equivalents.');
  }
}

let neo4jDriver = null;

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

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function spawnWorkspace(taskName) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.SPAWNER, [taskName]);
    let output = '';

    proc.stdout.on('data', (data) => (output += data.toString()));
    proc.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/Session ID: ([^\n]+)/);
        if (match) {
          const sessionId = match[1].trim();
          resolve({
            sessionId,
            workspacePath: `${CONFIG.WORKSPACE_BASE}/${sessionId}`,
          });
        } else {
          reject(new Error('Could not extract session ID from spawn output.'));
        }
      } else {
        reject(new Error(`spawn-agent returned exit code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

async function executeItpTask(projectId, requirement, index, total, planInfo) {
  const displayDoc = requirement.docNo || requirement.description || `ITP-${index + 1}`;
  const displayName = `itp-generation (${displayDoc})`;
  log(`Starting: ${displayName}`, 'cyan');

  const { sessionId, workspacePath } = await spawnWorkspace('itp-generation');
  log(`  Workspace: ${sessionId}`, 'blue');

  const session = await request(`${CONFIG.SERVER_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `Agent: ${displayName}` }),
  });
  log(`  Session: ${session.id}`, 'blue');

  const metadata = {
    projectId,
    taskName: 'itp-generation',
    displayName,
    workspaceSessionId: sessionId,
    orchestratorSessionId: session.id,
    workspacePath,
    serverUrl: CONFIG.SERVER_URL,
    startedAt: new Date().toISOString(),
    context: {
      requiredItp: requirement,
      plan: planInfo,
      index,
      total,
    },
  };
  fs.writeFileSync(`${workspacePath}/orchestrator-meta.json`, JSON.stringify(metadata, null, 2));
  fs.writeFileSync(`${workspacePath}/required-itp.json`, JSON.stringify(requirement, null, 2));

  let lastProgress = '';
  const monitorPromise = monitorSession(session.id, workspacePath, {
    serverUrl: CONFIG.SERVER_URL,
    onProgress: (progress) => {
      let msg = '';
      if (progress.type === 'bash') {
        msg = `  Running bash commands (${progress.count} total)`;
      } else if (progress.type === 'file') {
        msg = `  File operations (${progress.count} total)`;
      } else if (progress.type === 'thinking') {
        msg = '  Agent thinking...';
      } else if (progress.type === 'reasoning') {
        msg = '  Deep reasoning...';
      }
      if (msg && msg !== lastProgress) {
        log(msg, 'blue');
        lastProgress = msg;
      }
    },
  });

  const prompt = [
    `projectId: ${projectId}`,
    `workspaceSessionId: ${sessionId}`,
    `orchestratorSessionId: ${session.id}`,
    `cd ${workspacePath} && cat prompt.md and follow those instructions`,
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
  log('  Prompt sent, agent executing...', 'blue');

  const result = await monitorPromise;
  log(`  ✓ Completed: ${displayName} (${result.duration}s)`, 'green');
  log(`    Tools: ${result.stats.toolCount}, Bash: ${result.stats.bashCount}, Files: ${result.stats.fileOps}`, 'blue');

  return {
    success: true,
    docNo: displayDoc,
    duration: result.duration,
    stats: result.stats,
    sessionId: session.id,
    workspacePath,
  };
}

async function runAllItps(projectId, planInfo, requiredItps) {
  const maxParallel = Math.max(1, CONFIG.MAX_PARALLEL || 1);
  log(`Running ${requiredItps.length} itp-generation tasks (parallel=${maxParallel})`, 'cyan');

  const results = new Array(requiredItps.length);
  let nextIndex = 0;
  let active = 0;

  return new Promise((resolve, reject) => {
    const launchNext = () => {
      if (nextIndex >= requiredItps.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < maxParallel && nextIndex < requiredItps.length) {
        const idx = nextIndex++;
        const requirement = requiredItps[idx];
        active++;

        executeItpTask(projectId, requirement, idx, requiredItps.length, planInfo)
          .then((res) => {
            results[idx] = { ...res, success: true };
          })
          .catch((err) => {
            log(`  ✗ Failed itp-generation for ${requirement.docNo || `ITP-${idx + 1}`}: ${err.message}`, 'red');
            results[idx] = { success: false, error: err.message, docNo: requirement.docNo };
          })
          .finally(() => {
            active--;
            launchNext();
          });
      }
    };

    launchNext();
  });
}

async function main() {
  const projectId = (process.argv[2] || process.env.PROJECT_ID || '').trim();
  if (!projectId) {
    console.log(`
Usage: node run-itps-from-pqp.js <projectId>

Optional env vars:
  ITP_MAX_PARALLEL (defaults to 4)
  NEO4J_URI / USER / PASSWORD

Example:
  node run-itps-from-pqp.js b168e975-2531-527f-9abd-19cb8f502fe0
`);
    process.exit(1);
  }

  log('================================================================', 'cyan');
  log('ITP GENERATION FROM PQP', 'cyan');
  log('================================================================', 'cyan');
  log(`Project ID: ${projectId}`, 'cyan');

  try {
    const { plan, requiredItps } = await loadRequiredItpRequirements(projectId);
    if (!plan) {
      log('No PQP management plan with requiredItps found. Run PQP generation first.', 'red');
      process.exit(1);
    }

    if (!requiredItps || requiredItps.length === 0) {
      log('PQP plan has no requiredItps entries. Cannot proceed.', 'red');
      process.exit(1);
    }

    log(`Using PQP plan: ${plan.title || plan.elementId} (required ITPs: ${requiredItps.length})`, 'green');

    const startTime = Date.now();
    const results = await runAllItps(projectId, plan, requiredItps);
    const duration = Math.round((Date.now() - startTime) / 1000);

    const successes = results.filter((r) => r?.success);
    const failures = results.filter((r) => !r?.success);

    log('================================================================', 'cyan');
    log(`Completed ITP generation in ${duration}s`, 'cyan');
    log(`Successful: ${successes.length}/${results.length}`, successes.length === results.length ? 'green' : 'yellow');
    log(`Failed: ${failures.length}`, failures.length > 0 ? 'red' : 'green');

    if (successes.length) {
      let totalTools = 0;
      let totalBash = 0;
      let totalFiles = 0;
      successes.forEach((s) => {
        totalTools += s.stats?.toolCount || 0;
        totalBash += s.stats?.bashCount || 0;
        totalFiles += s.stats?.fileOps || 0;
        log(`  ✓ ${s.docNo} (${s.duration}s)`, 'green');
      });
      log(`Totals -> Tools: ${totalTools}, Bash: ${totalBash}, Files: ${totalFiles}`, 'blue');
    }

    if (failures.length) {
      failures.forEach((f) => {
        log(`  ✗ ${f.docNo || 'Unknown'}: ${f.error}`, 'red');
      });
    }

    process.exit(failures.length ? 1 : 0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    if (neo4jDriver) {
      neo4jDriver.close().catch(() => {});
    }
  }
}

process.on('exit', () => {
  if (neo4jDriver) {
    neo4jDriver.close().catch(() => {});
  }
});

main();


