#!/usr/bin/env node

/**
 * Run PQP Generation with Orchestrator + Subagents
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  MODEL: {
    providerID: 'openrouter',
    modelID: 'openrouter/sherlock-think-alpha',
  },
  WORKSPACE_BASE: path.resolve(__dirname, '../opencode-workspace'),
  ORCHESTRATOR_PROMPT_PATH: path.join(__dirname, 'prompts', 'pqp-orchestrator.md'),
};

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function createSession(workingDirectory, title) {
  return await request(`${CONFIG.SERVER_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workingDirectory,
      title,
    }),
  });
}

async function sendMessage(sessionId, content) {
  await request(`${CONFIG.SERVER_URL}/session/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parts: [{ type: 'text', text: content }],
      model: CONFIG.MODEL,
      agent: 'build',
    }),
  });
}

async function waitForIdle(sessionId, pollInterval = 2000) {
  while (true) {
    const data = await request(`${CONFIG.SERVER_URL}/session/${sessionId}`);
    if (data.status === 'idle') {
      return;
    }
    await sleep(pollInterval);
  }
}

async function main() {
  const projectId = process.argv[2];

  if (!projectId) {
    console.error('Usage: node run-pqp-orchestrator.js <projectId>');
    process.exit(1);
  }

  log('PQP Orchestrator + Subagents', 'bright');
  log(`Project ID: ${projectId}`, 'cyan');
  log(`Server: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Model: ${CONFIG.MODEL.providerID}/${CONFIG.MODEL.modelID}`, 'blue');
  log('');

  // Create workspace
  log('Creating workspace...', 'cyan');
  const workspaceDir = path.join(CONFIG.WORKSPACE_BASE, `pqp-orchestrator-${Date.now()}`);
  fs.mkdirSync(workspaceDir, { recursive: true });

  // Copy shared files
  const sharedDir = path.join(__dirname, 'shared');
  for (const file of fs.readdirSync(sharedDir)) {
    const src = path.join(sharedDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(workspaceDir, file));
    }
  }

  // Copy orchestrator prompt into workspace so the agent can read it locally
  const workspacePromptPath = path.join(workspaceDir, 'prompt.md');
  fs.copyFileSync(CONFIG.ORCHESTRATOR_PROMPT_PATH, workspacePromptPath);

  log(`  ✓ Workspace: ${workspaceDir}`, 'green');
  log('');

  // Create session
  log('Creating OpenCode session...', 'cyan');
  const session = await createSession(workspaceDir, 'PQP Orchestrator');
  log(`  ✓ Session: ${session.id}`, 'green');
  log('');

  // Send prompt with explicit workspace instructions
  const orchestratorPromptRaw = fs.readFileSync(CONFIG.ORCHESTRATOR_PROMPT_PATH, 'utf8');
  const orchestratorPrompt = orchestratorPromptRaw
    .replace(/\{\{WORKSPACE_DIR\}\}/g, workspaceDir)
    .replace(/\{PROJECT_ID\}/g, projectId);
  log('Starting orchestrator...', 'cyan');
  const prompt = [
    `Project ID: ${projectId}`,
    `Workspace Directory (stay inside this path): ${workspaceDir}`,
    `All reference files (prompt.md, instructions, connection details) are already copied into this session folder under /app/opencode-workspace.`,
    `Do not attempt to access any other directory—run every command from within this workspace.`,
    ``,
    orchestratorPrompt,
  ].join('\n');

  await sendMessage(session.id, prompt);
  log('  ✓ Prompt sent', 'green');
  log('  ⏳ Waiting for completion (this may take 5-10 minutes)...', 'yellow');
  log('');

  // Wait for completion
  await waitForIdle(session.id);

  log('');
  log('✓ Orchestrator completed', 'green');
  log('');
  log('Check Neo4j Generated DB (port 7690) for results:', 'cyan');
  log('  MATCH (mp:ManagementPlan {type: "PQP"}) OPTIONAL MATCH (mp)-[:HAS_SECTION]->(s) RETURN mp.title, count(s)', 'blue');
}

main().catch(error => {
  log(`✗ Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

