#!/usr/bin/env node
/**
 * ITP GENERATION - DYNAMIC MULTI-AGENT
 * 
 * This script:
 * 1. Queries the Generated DB for ITPTemplate nodes created by PQP
 * 2. Spawns a separate agent for EACH ITP template
 * 3. Runs all ITP agents in parallel with event stream monitoring
 * 4. Each agent generates its specific ITP with full context
 * 
 * Uses event stream monitoring for instant completion detection.
 * 
 * Usage:
 *   node run-itp-generation.js [projectId]
 * 
 * Example:
 *   node run-itp-generation.js jervois_street
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { monitorSession } = require('./lib/monitor');

// Configuration
const CONFIG = {
  SERVER_URL: 'http://127.0.0.1:4096',
  MODEL: {
    providerID: 'opencode',
    modelID: 'grok-code'
  },
  NEO4J: {
    GENERATED: {
      uri: 'neo4j://localhost:7690',
      user: 'neo4j',
      password: '27184236e197d5f4c36c60f453ebafd9'
    }
  }
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function error(message) {
  log(`ERROR: ${message}`, 'red');
}

// HTTP request helper
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Query Neo4j for ITP templates
async function getITPTemplates(projectId) {
  log(`Querying Generated DB for ITP templates...`, 'cyan');
  
  const query = `
    MATCH (itp:ITPTemplate {projectId: $projectId})
    RETURN itp.docNo AS docNo,
           itp.description AS description,
           itp.workType AS workType,
           itp.specRef AS specRef,
           itp.applicableStandards AS applicableStandards,
           itp.scopeOfWork AS scopeOfWork
    ORDER BY itp.docNo
  `;
  
  try {
    const result = execSync(
      `cypher-shell -a ${CONFIG.NEO4J.GENERATED.uri} ` +
      `-u ${CONFIG.NEO4J.GENERATED.user} ` +
      `-p ${CONFIG.NEO4J.GENERATED.password} ` +
      `--format plain ` +
      `"${query.replace(/\n/g, ' ').replace(/"/g, '\\"')}" ` +
      `--param "projectId => '${projectId}'"`,
      { encoding: 'utf-8' }
    );
    
    // Parse cypher-shell output
    const lines = result.trim().split('\n');
    const templates = [];
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('docNo')) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          templates.push({
            docNo: parts[0].trim().replace(/"/g, ''),
            description: parts[1].trim().replace(/"/g, ''),
            workType: parts[2].trim().replace(/"/g, ''),
            specRef: parts[3]?.trim().replace(/"/g, '') || '',
            applicableStandards: parts[4]?.trim().replace(/"/g, '') || '',
            scopeOfWork: parts[5]?.trim().replace(/"/g, '') || ''
          });
        }
      }
    }
    
    return templates;
  } catch (err) {
    error(`Failed to query ITP templates: ${err.message}`);
    throw err;
  }
}

// Create custom ITP prompt for specific template
function createITPPrompt(template, projectId) {
  return `# ITP Generation Task: ${template.docNo}

## Your Mission

Generate a comprehensive Inspection and Test Plan (ITP) for:

**ITP Document Number:** ${template.docNo}
**Description:** ${template.description}
**Work Type:** ${template.workType}
**Specification Reference:** ${template.specRef}

## ITP Template Location in Database

The ITP template you need to expand is located in the **Generated Database (port 7690)**:

\`\`\`cypher
MATCH (itp:ITPTemplate {
  projectId: '${projectId}',
  docNo: '${template.docNo}'
})
RETURN itp
\`\`\`

## Related Information

**Applicable Standards:** ${template.applicableStandards || 'Query from Standards DB'}
**Scope of Work:** ${template.scopeOfWork || 'Defined in template'}

## Your Tasks

### 1. Read the ITP Template
Connect to Generated DB and read the full ITP template node to understand all requirements.

### 2. Query Related Standards
Connect to Standards DB (port 7687) and find all relevant standards for this work type:
- Test methods
- Material specifications
- Quality requirements
- Inspection procedures

### 3. Query WBS Requirements
Find which WBS nodes require this ITP:
\`\`\`cypher
MATCH (wbs:WBSNode)-[:REQUIRES_ITP]->(itp:ITPTemplate {docNo: '${template.docNo}'})
RETURN wbs
\`\`\`

### 4. Generate Inspection Points
Create detailed InspectionPoint nodes for this ITP, including:
- Point number and description
- Stage (before/during/after)
- Inspection type (visual/measurement/test)
- Hold point (yes/no)
- Acceptance criteria
- Reference standards
- Test methods
- Frequency

### 5. Write to Generated DB
Create all InspectionPoint nodes and link them to the ITP template:
\`\`\`cypher
CREATE (point:InspectionPoint {
  projectId: '${projectId}',
  itpDocNo: '${template.docNo}',
  pointNumber: '1.1',
  description: 'Check formwork alignment',
  stage: 'before',
  inspectionType: 'measurement',
  holdPoint: true,
  acceptanceCriteria: 'Within ±5mm tolerance',
  referenceStandard: 'AS 3600',
  testMethod: 'Survey measurement',
  frequency: 'Each pour'
})

MATCH (itp:ITPTemplate {docNo: '${template.docNo}'})
CREATE (itp)-[:HAS_POINT]->(point)
\`\`\`

## Database Connections

- **Standards DB:** neo4j://localhost:7687 (READ - for standards/specs)
- **Project Docs DB:** neo4j://localhost:7688 (READ - for project requirements)
- **Generated DB:** neo4j://localhost:7690 (READ/WRITE - for ITP and inspection points)

Credentials are in \`shared/connection details.md\`

## Output Requirements

1. Create 5-15 InspectionPoint nodes (depending on work complexity)
2. Link all points to the ITP template
3. Ensure points cover: before work, during work, after work, and testing
4. Include proper hold points for critical stages
5. Reference applicable standards and test methods

## Success Criteria

- All inspection points created in Generated DB
- Points properly linked to ITP template
- Complete coverage of work stages
- Proper references to standards and test methods
- Hold points identified for critical inspections
`;
}

// Spawn workspace for specific ITP
function spawnITPWorkspace(template, projectId) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const randomId = Math.random().toString(36).substring(2, 8);
  const sessionId = `${timestamp}-${randomId}`;
  const workspacePath = `/app/opencode-workspace/agent-sessions/${sessionId}`;
  
  log(`  Creating workspace for ${template.docNo}...`, 'blue');
  
  try {
    // Create workspace directory
    execSync(`mkdir -p ${workspacePath}/shared`);
    
    // Create custom prompt
    const promptContent = createITPPrompt(template, projectId);
    fs.writeFileSync(`${workspacePath}/prompt.md`, promptContent);
    
    // Create session info
    const sessionInfo = `Session ID: ${sessionId}
Task: itp-generation-${template.docNo}
ITP Document: ${template.docNo}
Description: ${template.description}
Work Type: ${template.workType}
Project ID: ${projectId}
Created: ${new Date().toISOString()}

Workspace Location:
${workspacePath}
`;
    fs.writeFileSync(`${workspacePath}/session-info.txt`, sessionInfo);
    
    // Symlink shared resources
    execSync(`cp -a "/app/opecodeagents-lucky-demo/shared/." "${workspacePath}/shared/"`);
    
    // Copy schema files
    execSync(`cd /app/opecodeagents-lucky-demo && node extract-master-schema.js > ${workspacePath}/MASTER_SCHEMA.md`);
    execSync(`cd /app/opecodeagents-lucky-demo && node extract-agent-schema.js itp-generation > ${workspacePath}/AGENT_SCHEMA.md`);
    
    // Create README
    const readme = `# ITP Generation: ${template.docNo}

**Task:** Generate inspection points for ${template.description}
**ITP Doc:** ${template.docNo}
**Work Type:** ${template.workType}

## Quick Start

1. Read \`prompt.md\` for detailed instructions
2. Check \`shared/connection details.md\` for database credentials
3. Query Generated DB for ITP template
4. Generate inspection points
5. Write results back to Generated DB

## Files

- \`prompt.md\` - Your task instructions
- \`MASTER_SCHEMA.md\` - Complete Neo4j schema
- \`AGENT_SCHEMA.md\` - Relevant entities for this task
- \`shared/\` - Database connections and guides
`;
    fs.writeFileSync(`${workspacePath}/README.md`, readme);
    
    log(`  ✓ Workspace created: ${workspacePath}`, 'green');
    return { sessionId, workspacePath };
    
  } catch (err) {
    error(`Failed to create workspace: ${err.message}`);
    throw err;
  }
}

// Execute single ITP generation
async function executeITP(template, projectId) {
  const taskName = `ITP: ${template.docNo}`;
  log(`\nStarting: ${taskName}`, 'cyan');
  log(`  Description: ${template.description}`, 'blue');
  
  try {
    // Spawn workspace
    const { sessionId, workspacePath } = spawnITPWorkspace(template, projectId);
    
    // Create session
    const session = await request(`${CONFIG.SERVER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `ITP Gen: ${template.docNo}` })
    });
    
    log(`  Session: ${session.id}`, 'blue');
    
    // Start monitoring BEFORE sending prompt
    const monitorPromise = monitorSession(session.id, workspacePath, {
      serverUrl: CONFIG.SERVER_URL,
      onProgress: (progress) => {
        // Optional: log progress for this specific ITP
        // Keeping it quiet to avoid spam when running many ITPs in parallel
      }
    });
    
    // Send prompt
    const prompt = `cd ${workspacePath} && cat prompt.md and follow those instructions`;
    await request(`${CONFIG.SERVER_URL}/session/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
        model: CONFIG.MODEL,
        agent: 'build'
      })
    });
    
    log(`  ✓ Agent executing...`, 'green');
    
    // Wait for completion via event stream
    const result = await monitorPromise;
    
    log(`  ✓ Completed: ${taskName} (${result.duration}s)`, 'green');
    log(`    Tools: ${result.stats.toolCount}, Bash: ${result.stats.bashCount}, Files: ${result.stats.fileOps}`, 'blue');
    
    return {
      success: true,
      docNo: template.docNo,
      sessionId: session.id,
      workspacePath,
      duration: result.duration,
      stats: result.stats
    };
    
  } catch (err) {
    error(`Failed: ${taskName} - ${err.message}`);
    return {
      success: false,
      docNo: template.docNo,
      error: err.message
    };
  }
}

// Main
async function main() {
  const projectId = process.argv[2] || 'jervois_street';
  
  log(`\n${'='.repeat(70)}`, 'bright');
  log(`ITP GENERATION - DYNAMIC MULTI-AGENT`, 'bright');
  log(`${'='.repeat(70)}\n`, 'bright');
  
  log(`Project ID: ${projectId}`, 'cyan');
  log(`Server: ${CONFIG.SERVER_URL}`, 'blue');
  
  try {
    // Step 1: Query for ITP templates
    log(`\nStep 1: Querying for ITP templates...`, 'cyan');
    const templates = await getITPTemplates(projectId);
    
    if (templates.length === 0) {
      log(`\nNo ITP templates found in Generated DB!`, 'yellow');
      log(`\nMake sure you've run the PQP generation first:`, 'yellow');
      log(`  node run-single-task.js pqp-generation`, 'yellow');
      process.exit(1);
    }
    
    log(`\n✓ Found ${templates.length} ITP templates:`, 'green');
    templates.forEach((t, i) => {
      log(`  ${i + 1}. ${t.docNo} - ${t.description} (${t.workType})`, 'blue');
    });
    
    // Step 2: Execute all ITPs in parallel
    log(`\nStep 2: Spawning ${templates.length} ITP agents in parallel...`, 'cyan');
    log(`(Watch stream.py for real-time progress)\n`, 'yellow');
    
    const startTime = Date.now();
    const results = await Promise.all(
      templates.map(template => executeITP(template, projectId))
    );
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    
    // Step 3: Report results
    log(`\n${'='.repeat(70)}`, 'bright');
    log(`RESULTS`, 'bright');
    log(`${'='.repeat(70)}\n`, 'bright');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    log(`Total ITPs: ${templates.length}`, 'cyan');
    log(`Successful: ${successful.length}`, 'green');
    log(`Failed: ${failed.length}`, failed.length > 0 ? 'red' : 'green');
    log(`Total Time: ${totalDuration}s`, 'cyan');
    
    // Calculate total stats
    let totalTools = 0;
    let totalBash = 0;
    let totalFiles = 0;
    
    if (successful.length > 0) {
      log(`\n✓ Successfully generated:`, 'green');
      successful.forEach(r => {
        if (r.stats) {
          totalTools += r.stats.toolCount || 0;
          totalBash += r.stats.bashCount || 0;
          totalFiles += r.stats.fileOps || 0;
          log(`  - ${r.docNo} (${r.duration}s) - Tools: ${r.stats.toolCount}, Bash: ${r.stats.bashCount}, Files: ${r.stats.fileOps}`, 'green');
        } else {
          log(`  - ${r.docNo} (${r.duration}s)`, 'green');
        }
      });
      
      log(`\nTotal Stats:`, 'cyan');
      log(`  Tools: ${totalTools}, Bash: ${totalBash}, Files: ${totalFiles}`, 'blue');
      log(`  Event logs saved to each workspace/session-log.json`, 'blue');
    }
    
    if (failed.length > 0) {
      log(`\n✗ Failed:`, 'red');
      failed.forEach(r => {
        log(`  - ${r.docNo}: ${r.error}`, 'red');
      });
    }
    
    log(`\nCheck Generated DB (port 7690) for InspectionPoint nodes`, 'yellow');
    log(`\nQuery to verify:`, 'cyan');
    log(`  MATCH (itp:ITPTemplate)-[:HAS_POINT]->(point:InspectionPoint)`, 'blue');
    log(`  RETURN itp.docNo, count(point) AS numPoints`, 'blue');
    
    process.exit(failed.length > 0 ? 1 : 0);
    
  } catch (err) {
    error(`Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();

