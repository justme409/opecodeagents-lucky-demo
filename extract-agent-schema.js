#!/usr/bin/env node
/**
 * Extract Agent-Specific Schema
 * 
 * Extracts only the entities and schema relevant to a specific agent
 */

const fs = require('fs');
const path = require('path');

const taskName = process.argv[2];
if (!taskName) {
  console.error('Usage: node extract-agent-schema.js <task-name>');
  process.exit(1);
}

// Load manifest
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const task = manifest.tasks[taskName];
if (!task) {
  console.error(`Task '${taskName}' not found`);
  process.exit(1);
}

// Load master schema
const schemaPath = path.join(__dirname, 'schemas/neo4j/master-schema.ts');
const content = fs.readFileSync(schemaPath, 'utf8');

// Extract entity definitions for this agent's entities
const output = `# Agent Schema: ${task.agent_id}

**Task:** ${taskName}  
**Description:** ${task.description}

## Your Entities

You are responsible for generating these ${task.entities.length} entity type(s):

${task.entities.map(e => `- **${e}**`).join('\n')}

## Entity Definitions

${task.entities.map(entityName => {
  // Extract the interface definition
  const interfaceRegex = new RegExp(`export interface ${entityName}Node \\{([^}]+)\\}`, 's');
  const match = content.match(interfaceRegex);
  
  if (!match) return `### ${entityName}\n\n*Definition not found*\n`;
  
  const props = match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'));
  
  return `### ${entityName}

\`\`\`typescript
interface ${entityName}Node {
${props.map(p => `  ${p}`).join('\n')}
}
\`\`\`
`;
}).join('\n')}

## Business Keys

${task.entities.map(e => {
  const keyMap = {
    'Project': 'projectId (unique)',
    'ITPTemplate': 'projectId + docNo',
    'InspectionPoint': 'projectId + parentType + parentKey + sequence',
    'Standard': 'projectId + code',
    'WorkType': 'projectId + code',
    'AreaCode': 'projectId + code',
    'WBSNode': 'projectId + code',
    'LBSNode': 'projectId + code',
    'ManagementPlan': 'projectId + type + title + version',
    'Document': 'projectId + documentNumber + revisionCode',
    'Material': 'projectId + code',
    'MixDesign': 'projectId + code',
    'TestMethod': 'projectId + code',
    'Sample': 'projectId + number',
    'TestRequest': 'projectId + number',
    'NCR': 'projectId + number',
    'Lot': 'projectId + number',
    'User': 'email (unique)',
    'Laboratory': 'projectId + code',
    'Supplier': 'projectId + code',
  };
  return `- **${e}**: ${keyMap[e] || 'projectId + code'}`;
}).join('\n')}

## Output Format

Your output must be valid JSON:

\`\`\`json
{
${task.entities.map(e => `  "${e}": ${e === 'Project' ? '{...}' : '[...]'}`).join(',\n')}
}
\`\`\`

## Validation Checklist

Before finishing, ensure:

- [ ] All entities include \`projectId\` field
- [ ] Business keys are set correctly (NO UUIDs!)
- [ ] All required properties are present
- [ ] Relationships reference valid business keys
- [ ] All \`createdAt\` and \`updatedAt\` fields set
- [ ] Data is traceable to source documents

## Database Operations

Write to Generated DB (port 7690):

\`\`\`cypher
// Create node with business key
CREATE (n:${task.entities[0]} {
  projectId: $projectId,
  ${task.entities[0] === 'Project' ? 'name' : 'code'}: $${task.entities[0] === 'Project' ? 'name' : 'code'},
  createdAt: datetime(),
  updatedAt: datetime()
})
RETURN n
\`\`\`

## Important Rules

1. **NO UUIDs** - Use business keys only
2. **projectId Required** - All entities need this
3. **Follow Schema Exactly** - Match property names and types
4. **Create Relationships** - Link to project and other entities
5. **Validate Output** - Check against schema before finishing
`;

console.log(output);

