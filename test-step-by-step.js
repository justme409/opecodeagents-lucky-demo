#!/usr/bin/env node
/**
 * Step-by-step test - FIXED VERSION
 * - Directory in session creation
 * - NO directory in message send
 * - Include workspace path in prompt
 */

const http = require('http');
const { spawn } = require('child_process');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
};

function log(msg) {
  console.log(`[${new Date().toISOString().substring(11, 23)}] ${msg}`);
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout after 10 seconds'));
    }, 10000);
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function test() {
  console.log('\n=== Step-by-Step Test - FIXED ===\n');
  
  // Step 1: Check server
  log('STEP 1: Checking OpenCode server...');
  try {
    await request(`${CONFIG.SERVER_URL}/config`);
    log('✓ Server is responding');
  } catch (error) {
    log(`✗ Server check failed: ${error.message}`);
    process.exit(1);
  }
  
  // Step 2: Spawn workspace
  log('\nSTEP 2: Spawning workspace for project-details...');
  let workspacePath, sessionId;
  try {
    const result = await new Promise((resolve, reject) => {
      const proc = spawn(CONFIG.SPAWNER, ['project-details']);
      let output = '';
      
      proc.stdout.on('data', (data) => output += data.toString());
      proc.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/Session ID: ([^\n]+)/);
          if (match) {
            resolve({
              sessionId: match[1].trim(),
              workspacePath: `${CONFIG.WORKSPACE_BASE}/${match[1].trim()}`
            });
          } else {
            reject(new Error('Could not extract session ID'));
          }
        } else {
          reject(new Error(`Spawner failed with code ${code}`));
        }
      });
    });
    
    sessionId = result.sessionId;
    workspacePath = result.workspacePath;
    log(`✓ Workspace created: ${sessionId}`);
    log(`  Path: ${workspacePath}`);
  } catch (error) {
    log(`✗ Workspace spawn failed: ${error.message}`);
    process.exit(1);
  }
  
  // Step 3: Create session WITH directory
  log('\nSTEP 3: Creating OpenCode session with directory...');
  let apiSessionId;
  try {
    const url = `${CONFIG.SERVER_URL}/session?directory=${encodeURIComponent(workspacePath)}`;
    
    const session = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test: project-details' }),
    });
    
    apiSessionId = session.id;
    log(`✓ Session created: ${apiSessionId}`);
    log(`  Working dir: ${session.directory}`);
  } catch (error) {
    log(`✗ Session creation failed: ${error.message}`);
    process.exit(1);
  }
  
  // Step 4: Send message WITHOUT directory, but WITH path in prompt
  log('\nSTEP 4: Sending message (no directory param, path in prompt)...');
  try {
    const prompt = `cd ${workspacePath} && cat prompt.md and follow those instructions`;
    const url = `${CONFIG.SERVER_URL}/session/${apiSessionId}/message`;  // NO directory!
    const body = {
      parts: [{ type: 'text', text: prompt }],
      model: { providerID: 'opencode', modelID: 'grok-code' },
      agent: 'build',
    };
    
    log(`  Prompt: ${prompt}`);
    
    const message = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    log(`✓ Message sent: ${message.info.id}`);
  } catch (error) {
    log(`✗ Message send failed: ${error.message}`);
    process.exit(1);
  }
  
  // Step 5: Poll for completion
  log('\nSTEP 5: Polling for completion (max 120 seconds)...');
  const maxPolls = 60;
  let polls = 0;
  
  try {
    while (polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      polls++;
      
      const messages = await request(`${CONFIG.SERVER_URL}/session/${apiSessionId}/message`);
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.info.role === 'assistant' && lastMessage.info.time.completed) {
        log(`✓ Task completed in ${polls * 2} seconds!`);
        
        const textPart = lastMessage.parts.find(p => p.type === 'text');
        if (textPart) {
          console.log(`\n  Response preview:\n  ${textPart.text.substring(0, 300)}...`);
        }
        
        process.exit(0);
      }
      
      if (polls % 5 === 0) {
        log(`  Still running... (${polls * 2}s)`);
      }
    }
    
    log(`✗ Timeout after ${maxPolls * 2} seconds`);
    process.exit(1);
  } catch (error) {
    log(`✗ Polling failed: ${error.message}`);
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
