#!/usr/bin/env node
/**
 * Systematic test to determine the correct use of directory parameters
 */

const http = require('http');
const { spawn } = require('child_process');

const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
};

function log(msg, color = '') {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  const c = colors[color] || '';
  console.log(`${c}${msg}${colors.reset}`);
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    }, 8000);
    
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

async function spawnWorkspace() {
  return new Promise((resolve, reject) => {
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
}

async function testScenario(name, config) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`TEST: ${name}`, 'cyan');
  log('='.repeat(70), 'cyan');
  
  const { sessionDirParam, messageDirParam, promptHasCD } = config;
  
  log(`  Session directory param: ${sessionDirParam ? 'YES' : 'NO'}`, 'blue');
  log(`  Message directory param: ${messageDirParam ? 'YES' : 'NO'}`, 'blue');
  log(`  Prompt has cd command: ${promptHasCD ? 'YES' : 'NO'}`, 'blue');
  
  try {
    // 1. Spawn workspace
    log('\n  [1/5] Spawning workspace...', 'yellow');
    const { workspacePath } = await spawnWorkspace();
    log(`    ✓ Workspace: ${workspacePath}`, 'green');
    
    // 2. Create session
    log('  [2/5] Creating session...', 'yellow');
    const sessionUrl = sessionDirParam 
      ? `${CONFIG.SERVER_URL}/session?directory=${encodeURIComponent(workspacePath)}`
      : `${CONFIG.SERVER_URL}/session`;
    
    const session = await request(sessionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Test: ${name}` }),
    });
    
    log(`    ✓ Session: ${session.id}`, 'green');
    log(`    ✓ Session directory: ${session.directory}`, 'green');
    
    // 3. Send message
    log('  [3/5] Sending message...', 'yellow');
    const messageUrl = messageDirParam
      ? `${CONFIG.SERVER_URL}/session/${session.id}/message?directory=${encodeURIComponent(workspacePath)}`
      : `${CONFIG.SERVER_URL}/session/${session.id}/message`;
    
    const prompt = promptHasCD
      ? `cd ${workspacePath} && pwd && ls -la prompt.md`
      : `pwd && ls -la prompt.md`;
    
    const messageResult = await request(messageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
        model: { providerID: 'opencode', modelID: 'grok-code' },
        agent: 'build',
      }),
    });
    
    log(`    ✓ Message sent: ${messageResult.info.id}`, 'green');
    
    // 4. Wait for completion
    log('  [4/5] Waiting for completion...', 'yellow');
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const messages = await request(`${CONFIG.SERVER_URL}/session/${session.id}/message`);
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.info.role === 'assistant' && lastMessage.info.time.completed) {
        log(`    ✓ Completed in ${attempts * 2}s`, 'green');
        
        // 5. Check result
        log('  [5/5] Checking result...', 'yellow');
        const textPart = lastMessage.parts.find(p => p.type === 'text');
        const responseText = textPart?.text || '';
        
        // Check if response contains the workspace path and prompt.md
        const hasWorkspacePath = responseText.includes(workspacePath);
        const hasPromptMd = responseText.includes('prompt.md') && !responseText.includes('cannot access');
        
        log(`    Response contains workspace path: ${hasWorkspacePath ? 'YES' : 'NO'}`, hasWorkspacePath ? 'green' : 'red');
        log(`    Response shows prompt.md exists: ${hasPromptMd ? 'YES' : 'NO'}`, hasPromptMd ? 'green' : 'red');
        
        const success = hasWorkspacePath && hasPromptMd;
        
        if (success) {
          log(`\n  ✓✓✓ SUCCESS ✓✓✓`, 'green');
        } else {
          log(`\n  ✗✗✗ FAILED ✗✗✗`, 'red');
          log(`    Response preview: ${responseText.substring(0, 150)}`, 'yellow');
        }
        
        return { success, responseText: responseText.substring(0, 200) };
      }
    }
    
    log(`    ✗ Timeout after 60s`, 'red');
    return { success: false, error: 'Timeout' };
    
  } catch (error) {
    log(`    ✗ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     DIRECTORY PARAMETER TEST SUITE                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const scenarios = [
    {
      name: 'Scenario 1: Directory in session only, cd in prompt',
      config: { sessionDirParam: true, messageDirParam: false, promptHasCD: true }
    },
    {
      name: 'Scenario 2: Directory in session only, NO cd in prompt',
      config: { sessionDirParam: true, messageDirParam: false, promptHasCD: false }
    },
    {
      name: 'Scenario 3: No directory params, cd in prompt',
      config: { sessionDirParam: false, messageDirParam: false, promptHasCD: true }
    },
    {
      name: 'Scenario 4: No directory params, NO cd in prompt',
      config: { sessionDirParam: false, messageDirParam: false, promptHasCD: false }
    },
  ];
  
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await testScenario(scenario.name, scenario.config);
    results.push({ ...scenario, result });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause between tests
  }
  
  // Summary
  log('\n\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     SUMMARY                                                    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  results.forEach((r, i) => {
    const status = r.result.success ? '✓ SUCCESS' : '✗ FAILED';
    const color = r.result.success ? 'green' : 'red';
    log(`${i + 1}. ${r.name}`, 'blue');
    log(`   ${status}`, color);
    if (r.result.error) {
      log(`   Error: ${r.result.error}`, 'red');
    }
    log('');
  });
  
  // Recommendation
  const successfulScenarios = results.filter(r => r.result.success);
  if (successfulScenarios.length > 0) {
    log('╔════════════════════════════════════════════════════════════════╗', 'green');
    log('║     RECOMMENDATION                                             ║', 'green');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'green');
    
    const best = successfulScenarios[0];
    log('Use this configuration:', 'green');
    log(`  • Session directory param: ${best.config.sessionDirParam ? 'YES' : 'NO'}`, 'green');
    log(`  • Message directory param: ${best.config.messageDirParam ? 'NO (causes timeout)' : 'NO'}`, 'green');
    log(`  • Prompt with cd command: ${best.config.promptHasCD ? 'YES' : 'NO'}`, 'green');
  }
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, 'red');
  process.exit(1);
});

