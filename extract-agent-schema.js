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

const BUSINESS_KEY_DATA = {
  AreaCode: { description: 'projectId + code', props: ['code'] },
  Document: { description: 'projectId + documentNumber + revisionCode', props: ['documentNumber', 'revisionCode'] },
  InspectionPoint: { description: 'projectId + parentType + parentKey + sequence', props: ['parentType', 'parentKey', 'sequence'] },
  ITPInstance: { description: 'projectId + templateDocNo + lotNumber', props: ['templateDocNo', 'lotNumber'] },
  ITPTemplate: { description: 'projectId + docNo', props: ['docNo'] },
  Laboratory: { description: 'projectId + code', props: ['code'] },
  LBSNode: { description: 'projectId + code', props: ['code'] },
  Lot: { description: 'projectId + number', props: ['number'] },
  ManagementPlan: { description: 'projectId + type + title + version', props: ['type', 'title', 'version'] },
  Material: { description: 'projectId + code', props: ['code'] },
  MixDesign: { description: 'projectId + code', props: ['code'] },
  NCR: { description: 'projectId + number', props: ['number'] },
  Photo: { description: 'projectId + url', props: ['url'] },
  ProgressClaim: { description: 'projectId + number', props: ['number'] },
  Project: { description: 'projectId (unique)', props: ['projectName'] },
  Quantity: { description: 'projectId + lotNumber + scheduleItemNumber', props: ['lotNumber', 'scheduleItemNumber'] },
  Sample: { description: 'projectId + number', props: ['number'] },
  ScheduleItem: { description: 'projectId + number', props: ['number'] },
  Standard: { description: 'projectId + code', props: ['code'] },
  Supplier: { description: 'projectId + code', props: ['code'] },
  TestMethod: { description: 'projectId + code', props: ['code'] },
  TestRequest: { description: 'projectId + number', props: ['number'] },
  User: { description: 'email (unique)', props: ['email'] },
  Variation: { description: 'projectId + number', props: ['number'] },
  WBSNode: { description: 'projectId + code', props: ['code'] },
  WorkType: { description: 'projectId + code', props: ['code'] },
};

function extractInterface(entityName) {
  const search = `export interface ${entityName}Node`;
  const interfaceStart = content.indexOf(search);
  if (interfaceStart === -1) {
    return null;
  }

  const braceStart = content.indexOf('{', interfaceStart);
  if (braceStart === -1) {
    return null;
  }

  let depth = 0;
  let index = braceStart;
  while (index < content.length) {
    const char = content[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const snippet = content.slice(interfaceStart, index + 1);
        return snippet.replace(/^export\s+/, '').trim();
      }
    }
    index += 1;
  }

  return null;
}

function formatBusinessKey(entityName) {
  const data = BUSINESS_KEY_DATA[entityName];
  if (data) {
    return data.description;
  }
  return 'projectId + code';
}

function getKeyProps(entityName) {
  const data = BUSINESS_KEY_DATA[entityName];
  if (data) {
    return data.props;
  }
  return ['code'];
}

function buildEntityDefinition(entityName) {
  const interfaceText = extractInterface(entityName);
  if (!interfaceText) {
    return `### ${entityName}\n\n*Definition not found*\n`;
  }

  return `### ${entityName}

\`\`\`typescript
${interfaceText}
\`\`\`
`;
}

function buildDatabaseSample(entityName) {
  if (entityName === 'User') {
    return `CREATE (n:User {
  email: $email,
  userId: $userId,
  name: $name,
  role: $role,
  organizationId: $organizationId,
  createdAt: datetime(),
  updatedAt: datetime()
})`;
  }

  const keyProps = getKeyProps(entityName);
  const propLines = keyProps
    .map(prop => `  ${prop}: $${prop},`)
    .join('\n');

  const bodyLines = [
    '  projectId: $projectId,'
  ];

  if (propLines) {
    bodyLines.push(propLines);
  }

  bodyLines.push('  createdAt: datetime(),');
  bodyLines.push('  updatedAt: datetime()');

  return `CREATE (n:${entityName} {
${bodyLines.join('\n')}
})`;
}

const primaryEntity = task.entities[0];

const output = `# Agent Schema: ${task.agent_id}

**Task:** ${taskName}  
**Description:** ${task.description}

## Your Entities

You are responsible for generating these ${task.entities.length} entity type(s):

${task.entities.map(e => `- **${e}**`).join('\n')}

## Entity Definitions

${task.entities.map(buildEntityDefinition).join('\n')}

## Business Keys

${task.entities.map(e => `- **${e}**: ${formatBusinessKey(e)}`).join('\n')}

## Output Format

Your output must be valid JSON:

\`\`\`json
{
${task.entities.map(e => `  "${e}": ${e === 'Project' ? '{...}' : '[...]'}`).join(',\n')}
}
\`\`\`

## Validation Checklist

Before finishing, ensure:

- [ ] All entities include \`projectId\` field${task.entities.includes('User') ? ' (except User)' : ''}
- [ ] Business keys are set correctly (NO UUIDs!)
- [ ] All required properties are present
- [ ] Relationships reference valid business keys
- [ ] All \`createdAt\` and \`updatedAt\` fields set
- [ ] Data is traceable to source documents

## Database Operations

Write to Generated DB (port 7690):

\`\`\`cypher
// Create node with business key
${buildDatabaseSample(primaryEntity)}
RETURN n
\`\`\`

## Important Rules

1. **NO UUIDs** - Use business keys only
2. **projectId Required** - All entities need this${task.entities.includes('User') ? ' (User sync handled separately)' : ''}
3. **Follow Schema Exactly** - Match property names and types
4. **Create Relationships** - Link to project and other entities
5. **Validate Output** - Check against schema before finishing
`;

console.log(output);

