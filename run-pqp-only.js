#!/usr/bin/env node

/**
 * Run ONLY PQP Generation Task
 * Simplified version to test single task execution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  MODEL: {
    providerID: 'openrouter',
    modelID: 'openrouter/sherlock-think-alpha',
  },
  WORKSPACE_BASE: path.resolve(__dirname, '../opencode-workspace/agent-sessions'),
  SHARED_DIR: path.resolve(__dirname, 'shared'),
  PROMPTS_DIR: path.resolve(__dirname, 'prompts'),
};

// ============================================================
// Utilities
// ============================================================

function log(message, color = '') {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
  };
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`${colors[color] || ''}[${timestamp}] ${message}${colors.reset}`);
}

function generateSessionId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `${dateStr}-${timeStr}-${random}`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// OpenCode API Client
// ============================================================

async function createSession(workingDirectory, title) {
  const response = await fetch(`${CONFIG.SERVER_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workingDirectory,
      title,
      providerID: CONFIG.MODEL.providerID,
      modelID: CONFIG.MODEL.modelID,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

async function sendMessage(sessionId, content) {
  const response = await fetch(`${CONFIG.SERVER_URL}/session/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
}

async function waitForIdle(sessionId, pollInterval = 2000) {
  while (true) {
    const response = await fetch(`${CONFIG.SERVER_URL}/session/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to get session status: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status === 'idle') {
      return;
    }

    await sleep(pollInterval);
  }
}

// ============================================================
// Workspace Setup
// ============================================================

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
    throw new Error(`Failed to spawn workspace: ${err.message}`);
  }
}

// ============================================================
// Main Execution
// ============================================================

async function runPQPTask(projectId) {
  const startTime = Date.now();

  log('============================================================', 'bright');
  log('EXECUTING PQP GENERATION', 'bright');
  log(`Task: pqp-generation`, 'bright');
  log('============================================================', 'bright');
  log('');

  // Step 1: Create workspace
  log('Step 1: Spawning workspace...', 'cyan');
  const { sessionId: workspaceSessionId, workspacePath } = spawnWorkspace('pqp-generation');
  log(`  ✓ Workspace: ${workspacePath}`, 'green');
  log(`  ✓ Workspace Session ID: ${workspaceSessionId}`, 'green');
  log('');

  // Step 2: Create OpenCode session
  log('Step 2: Creating opencode session...', 'cyan');
  const sessionId = await createSession(workspacePath, 'PQP Generation');
  log(`  ✓ Session created: ${sessionId}`, 'green');

  // Save metadata
  const metadata = {
    task: 'pqp-generation',
    projectId,
    workspaceSessionId,
    opencodeSessionId: sessionId,
    workspacePath,
    startTime: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(workspacePath, 'orchestrator-meta.json'),
    JSON.stringify(metadata, null, 2)
  );
  log(`  ✓ Metadata saved: orchestrator-meta.json`, 'green');
  log('');

  // Step 3: Send prompt
  log('Step 3: Sending prompt to agent...', 'cyan');
  const promptContent = fs.readFileSync(path.join(workspacePath, 'prompt.md'), 'utf-8');
  const fullPrompt = `${promptContent}\n\n---\n\n**Project ID:** ${projectId}\n\n**Your workspace:** ${workspacePath}\n\nBegin by listing all files in your workspace, then follow the instructions in prompt.md.`;

  await sendMessage(sessionId, fullPrompt);
  log('  ✓ Prompt sent', 'green');
  log('  ✓ Agent executing...', 'blue');
  log('');

  // Step 4: Wait for completion
  log('Step 4: Waiting for completion...', 'cyan');
  log('  (This may take several minutes)', 'yellow');
  await waitForIdle(sessionId);

  const duration = Math.round((Date.now() - startTime) / 1000);

  log('');
  log('============================================================', 'bright');
  log('✓ PQP Generation completed', 'green');
  log('============================================================', 'bright');
  log('');
  log(`Duration: ${duration}s`, 'cyan');
  log(`Workspace: ${workspacePath}`, 'cyan');
  log(`Session: ${sessionId}`, 'cyan');
  log('');
  log('Check Neo4j Generated DB (port 7690) for results', 'yellow');
}

// ============================================================
// Entry Point
// ============================================================

(async () => {
  const projectId = process.argv[2];

  if (!projectId) {
    console.error('Usage: node run-pqp-only.js <projectId>');
    process.exit(1);
  }

  log('Starting PQP generation', 'bright');
  log(`Project ID: ${projectId}`, 'cyan');
  log(`Server: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Model: ${CONFIG.MODEL.providerID}/${CONFIG.MODEL.modelID}`, 'blue');
  log('');

  try {
    await runPQPTask(projectId);
    log('✓ Task completed successfully', 'green');
    process.exit(0);
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();

