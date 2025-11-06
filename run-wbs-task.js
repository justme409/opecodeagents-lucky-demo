#!/usr/bin/env node

/**
 * Standalone WBS extraction runner.
 *
 * Spins up a fresh agent workspace for `wbs-extraction`, sends the
 * appropriate prompt to OpenCode, and monitors execution until the
 * session completes. Designed for one-off reruns without touching the
 * main orchestrator pipeline.
 */

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const { monitorSession } = require('./lib/monitor');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
  MODEL: {
    providerID: 'opencode',
    modelID: 'grok-code'
  }
};

function log(message, color = '') {
  const colors = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
  };
  const c = colors[color] || '';
  console.log(`${c}${message}${colors.reset}`);
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  let projectId = process.env.PROJECT_ID || '';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--project-id' || arg === '--projectId') {
      projectId = args[i + 1] || '';
      i++;
    } else if (arg.startsWith('--project-id=')) {
      projectId = arg.split('=')[1];
    } else if (arg.startsWith('--projectId=')) {
      projectId = arg.split('=')[1];
    }
  }

  if (!projectId || !projectId.trim()) {
    throw new Error('Project ID is required. Pass --project-id <uuid> or set PROJECT_ID env variable.');
  }

  return {
    projectId: projectId.trim()
  };
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
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

function spawnWorkspace(taskName) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.SPAWNER, [taskName]);
    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const err = new Error(`Workspace spawner exited with code ${code}`);
        err.output = output;
        err.errorOutput = errorOutput;
        reject(err);
        return;
      }
      const match = output.match(/Session ID: ([^\n]+)/);
      if (!match) {
        reject(new Error('Failed to read Session ID from spawner output.'));
        return;
      }
      const sessionId = match[1].trim();
      resolve({
        sessionId,
        workspacePath: path.join(CONFIG.WORKSPACE_BASE, sessionId)
      });
    });
  });
}

async function runWbsExtraction(projectId) {
  log(`Starting WBS extraction for project ${projectId}`, 'cyan');

  const { sessionId: workspaceSessionId, workspacePath } = await spawnWorkspace('wbs-extraction');
  log(`Workspace ready at ${workspacePath}`, 'green');

  const session = await request(`${CONFIG.SERVER_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Agent: wbs-extraction' })
  });

  if (!session?.id) {
    throw new Error('Failed to create OpenCode session.');
  }

  const orchestratorSessionId = session.id;
  log(`OpenCode session: ${orchestratorSessionId}`, 'cyan');

  const metadata = {
    projectId,
    taskName: 'wbs-extraction',
    displayName: 'wbs-extraction',
    workspaceSessionId,
    orchestratorSessionId,
    workspacePath,
    serverUrl: CONFIG.SERVER_URL,
    startedAt: new Date().toISOString()
  };

  const metadataPath = path.join(workspacePath, 'orchestrator-meta.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  log('Saved orchestrator metadata', 'green');

  const prompt = [
    `projectId: ${projectId}`,
    `workspaceSessionId: ${workspaceSessionId}`,
    `orchestratorSessionId: ${orchestratorSessionId}`,
    `cd ${workspacePath} && cat prompt.md and follow those instructions`
  ].join('\n\n');

  await request(`${CONFIG.SERVER_URL}/session/${orchestratorSessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parts: [{ type: 'text', text: prompt }],
      model: CONFIG.MODEL,
      agent: 'build'
    })
  });

  log('Prompt dispatched. Monitoring session...', 'cyan');

  const monitorResult = await monitorSession(orchestratorSessionId, workspacePath, {
    serverUrl: CONFIG.SERVER_URL,
    onProgress(progress) {
      if (progress.type === 'bash') {
        log(`  bash commands executed: ${progress.count}`, 'yellow');
      } else if (progress.type === 'file') {
        log(`  file ops so far: ${progress.count}`, 'yellow');
      } else if (progress.type === 'reasoning') {
        log('  agent reasoning...', 'yellow');
      } else if (progress.type === 'thinking') {
        log('  agent thinking...', 'yellow');
      } else if (progress.type === 'tool') {
        log(`  tool invoked: ${progress.tool}`, 'yellow');
      }
    }
  });

  log(`WBS extraction completed in ${monitorResult.duration}s`, 'green');
  log(`Session log saved to ${monitorResult.logPath}`, 'green');
}

async function main() {
  try {
    const { projectId } = parseCliArgs();
    await runWbsExtraction(projectId);
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();


