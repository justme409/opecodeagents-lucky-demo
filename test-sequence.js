#!/usr/bin/env node

/**
 * Test Sequence: Project Details → PQP → Single ITP
 * 
 * Tests the new orchestrator architecture with a focused sequence
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const CONFIG = {
  OPENCODE_PORT: 4096,
  OPENCODE_HOST: '127.0.0.1',
  WORKSPACE_BASE: '/app/opencode-workspace/agent-sessions',
  AGENT_SPAWNER: '/app/opecodeagents-lucky-demo/spawn-agent.sh',
  PROJECT_ID: 'b168e975-2531-527f-9abd-19cb8f502fe0',
  NEO4J_GENERATED_URI: 'neo4j://localhost:7690',
  NEO4J_USER: 'neo4j',
  NEO4J_PASS: '27184236e197d5f4c36c60f453ebafd9',
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// HTTP helper
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
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
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Clear Neo4j Generated database
async function clearGeneratedDB() {
  log('Clearing Neo4j Generated database...', 'blue');
  
  return new Promise((resolve, reject) => {
    const cypher = spawn('cypher-shell', [
      '-a', CONFIG.NEO4J_GENERATED_URI,
      '-u', CONFIG.NEO4J_USER,
      '-p', CONFIG.NEO4J_PASS,
      'MATCH (n) DETACH DELETE n'
    ]);
    
    cypher.on('close', (code) => {
      if (code === 0) {
        log('✓ Database cleared', 'green');
        resolve();
      } else {
        reject(new Error(`Failed to clear database: code ${code}`));
      }
    });
  });
}

// Spawn workspace
function spawnWorkspace(taskName) {
  return new Promise((resolve, reject) => {
    log(`Spawning workspace: ${taskName}`, 'blue');
    
    const spawner = spawn(CONFIG.AGENT_SPAWNER, [taskName]);
    let output = '';
    
    spawner.stdout.on('data', (data) => output += data.toString());
    spawner.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/Session ID: ([^\n]+)/);
        if (match) {
          const sessionId = match[1].trim();
          const workspacePath = `${CONFIG.WORKSPACE_BASE}/${sessionId}`;
          log(`✓ Workspace: ${sessionId}`, 'green');
          resolve({ sessionId, workspacePath });
        } else {
          reject(new Error('Could not extract session ID'));
        }
      } else {
        reject(new Error(`Spawner failed: ${code}`));
      }
    });
  });
}

// Execute task with event monitoring
function executeTask(sessionId, workspacePath, taskName, prompt) {
  return new Promise((resolve, reject) => {
    const baseUrl = `http://${CONFIG.OPENCODE_HOST}:${CONFIG.OPENCODE_PORT}`;
    const timeout = setTimeout(() => reject(new Error('Task timeout')), 900000);
    
    log(`Executing: ${taskName}`, 'cyan');
    
    // Create session
    request(`${baseUrl}/session?directory=${encodeURIComponent(workspacePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Test: ${taskName}` }),
    })
      .then((session) => {
        const apiSessionId = session.id;
        log(`  Session: ${apiSessionId}`, 'gray');
        
        // Start event stream
        http.get(`${baseUrl}/event`, (res) => {
          let buffer = '';
          let taskComplete = false;
          
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            const events = buffer.split('\n\n');
            buffer = events.pop();
            
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
              
              if (!eventData) return;
              
              // Only log events for our session
              if (eventData.properties?.sessionID !== apiSessionId) return;
              
              // Log tool calls
              if (eventData.type === 'message.part.updated' && 
                  eventData.properties?.part?.type === 'tool') {
                const tool = eventData.properties.part.tool;
                const status = eventData.properties.part.state?.status;
                const title = eventData.properties.part.state?.title;
                if (status === 'running' && title) {
                  log(`  🔧 ${tool}: ${title}`, 'gray');
                }
              }
              
              // Handle completion
              if (eventData.type === 'session.idle') {
                taskComplete = true;
                clearTimeout(timeout);
                res.destroy();
                log(`✓ Completed: ${taskName}`, 'green');
                resolve({ success: true, sessionId: apiSessionId });
              }
              
              // Handle errors
              if (eventData.type === 'session.error') {
                clearTimeout(timeout);
                res.destroy();
                const error = eventData.properties?.error?.data?.message || 'Unknown error';
                log(`✗ Failed: ${taskName} - ${error}`, 'red');
                reject(new Error(error));
              }
            });
          });
          
          res.on('end', () => {
            if (!taskComplete) {
              clearTimeout(timeout);
              reject(new Error('Event stream ended unexpectedly'));
            }
          });
        });
        
        // Send prompt with model specification
        setTimeout(() => {
          request(`${baseUrl}/session/${apiSessionId}/message?directory=${encodeURIComponent(workspacePath)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts: [{ type: 'text', text: prompt }],
              model: {
                providerID: 'anthropic',
                modelID: 'claude-sonnet-4-20250514'
              }
            }),
          }).then(() => {
            log(`  Message sent`, 'gray');
          }).catch((err) => {
            log(`  Error sending message: ${err.message}`, 'red');
            reject(err);
          });
        }, 2000);
      })
      .catch(reject);
  });
}

// Main test sequence
async function main() {
  try {
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║          Test Sequence: Project → PQP → ITP                   ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');
    
    // Step 1: Clear database
    await clearGeneratedDB();
    log('');
    
    // Step 2: Project Details
    log('═══ STEP 1: Project Details ═══', 'yellow');
    const { sessionId: projSession, workspacePath: projWorkspace } = await spawnWorkspace('project-details');
    const projPrompt = `# Project Context

**IMPORTANT: Project ID**

This project's ID is: \`${CONFIG.PROJECT_ID}\`

You MUST use this exact value as the \`projectId\` field in all nodes you create.

**Use Business Keys:** Do NOT generate UUIDs. Use natural business keys as defined in AGENT_SCHEMA.md.

---

Follow the instructions in prompt.md and AGENT_SCHEMA.md to extract project details from the source databases and create the Project node with WorkTypes and AreaCodes in the Generated database (port 7690).`;
    
    await executeTask(projSession, projWorkspace, 'project-details', projPrompt);
    log('');
    
    // Step 3: PQP Generation
    log('═══ STEP 2: PQP Generation ═══', 'yellow');
    const { sessionId: pqpSession, workspacePath: pqpWorkspace } = await spawnWorkspace('pqp-generation');
    const pqpPrompt = `# Project Context

**IMPORTANT: Project ID**

This project's ID is: \`${CONFIG.PROJECT_ID}\`

All nodes you create MUST include a \`projectId\` property set to this value.

**Use Business Keys:** Do NOT generate UUIDs. Use natural business keys as defined in AGENT_SCHEMA.md.

---

Follow the instructions in prompt.md and AGENT_SCHEMA.md to generate the Project Quality Plan. Query the Generated database (port 7690) for the Project node and other context, then create the ManagementPlan node (type='PQP') with comprehensive quality management content.

Include a list of required ITPs in the content.`;
    
    await executeTask(pqpSession, pqpWorkspace, 'pqp-generation', pqpPrompt);
    log('');
    
    // Step 4: Single ITP
    log('═══ STEP 3: ITP Generation (Concrete Works) ═══', 'yellow');
    const { sessionId: itpSession, workspacePath: itpWorkspace } = await spawnWorkspace('itp-generation');
    const itpPrompt = `# Project Context

**IMPORTANT: Project ID**

This project's ID is: \`${CONFIG.PROJECT_ID}\`

All nodes you create MUST include a \`projectId\` property set to this value.

**Use Business Keys:** Do NOT generate UUIDs. Use natural business keys as defined in AGENT_SCHEMA.md.

---

Generate the Inspection and Test Plan (ITP) for: "Concrete Works ITP"

Follow the instructions in prompt.md and AGENT_SCHEMA.md. Query the databases for relevant information about concrete works. Generate the complete ITP structure with:
- ITPTemplate node (use docNo like "ITP-001")
- InspectionPoint nodes (with proper sequence numbers)
- Standard nodes (reference relevant standards)

Write all output to the Generated database (port 7690).`;
    
    await executeTask(itpSession, itpWorkspace, 'itp-generation', itpPrompt);
    log('');
    
    // Summary
    log('╔════════════════════════════════════════════════════════════════╗', 'green');
    log('║          Test Sequence Complete!                              ║', 'green');
    log('╚════════════════════════════════════════════════════════════════╝', 'green');
    log('');
    log('Results:', 'cyan');
    log('  ✓ Database cleared', 'green');
    log('  ✓ Project details created', 'green');
    log('  ✓ PQP generated', 'green');
    log('  ✓ Concrete Works ITP created', 'green');
    log('');
    log('Verify in Neo4j Generated DB (port 7690):', 'cyan');
    log('  cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9', 'gray');
    log('  MATCH (n) RETURN labels(n), count(n)', 'gray');
    log('');
    
    process.exit(0);
  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

