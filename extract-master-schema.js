#!/usr/bin/env node
/**
 * Extract Master Schema Overview
 * 
 * Extracts a clean schema overview from master-schema.ts
 * WITHOUT agent metadata (createdBy, displayedOn) - just pure schema structure
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schemas/neo4j/master-schema.ts');
const content = fs.readFileSync(schemaPath, 'utf8');

function extractInterface(startIndex) {
  const braceStart = content.indexOf('{', startIndex);
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
        return {
          body: content.slice(braceStart + 1, index),
          endIndex: index + 1,
        };
      }
    }
    index += 1;
  }

  return null;
}

const interfaceRegex = /export interface (\w+)Node/g;
const entities = [];
let match;

while ((match = interfaceRegex.exec(content)) !== null) {
  const name = match[1].replace('Node', '');
  const interfaceData = extractInterface(match.index);
  if (!interfaceData) {
    continue;
  }

  const props = interfaceData.body
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .filter(line => line.trim().length > 0);

  entities.push({ name, properties: props });
}

// Generate clean markdown
let output = `# Master Schema Overview

**Total Entities:** ${entities.length}

This is the complete schema structure for the project. All entities use business keys (projectId + natural key) instead of UUIDs.

## Entity Definitions

`;

entities.forEach(({ name, properties }) => {
  output += `### ${name}\n\n`;
  output += '```typescript\n';
  output += `interface ${name}Node {\n`;
  properties.forEach(prop => {
    const formatted = prop.startsWith(' ') ? prop : `  ${prop}`;
    output += `${formatted}\n`;
  });
  output += '}\n```\n\n';
});

output += `## Business Keys

All entities use \`projectId\` for multi-tenancy plus a natural business key:

| Entity | Business Key |
|--------|-------------|
${entities.map(e => {
  const keyMap = {
    AreaCode: '`projectId` + `code`',
    Document: '`projectId` + `documentNumber` + `revisionCode`',
    InspectionPoint: '`projectId` + `parentType` + `parentKey` + `sequence`',
    ITPInstance: '`projectId` + `templateDocNo` + `lotNumber`',
    ITPTemplate: '`projectId` + `docNo`',
    Laboratory: '`projectId` + `code`',
    LBSNode: '`projectId` + `code`',
    Lot: '`projectId` + `number`',
    ManagementPlan: '`projectId` + `type` + `title` + `version`',
    Material: '`projectId` + `code`',
    MixDesign: '`projectId` + `code`',
    NCR: '`projectId` + `number`',
    Photo: '`projectId` + `url`',
    ProgressClaim: '`projectId` + `number`',
    Project: '`projectId` (unique)',
    Quantity: '`projectId` + `lotNumber` + `scheduleItemNumber`',
    Sample: '`projectId` + `number`',
    ScheduleItem: '`projectId` + `number`',
    Standard: '`projectId` + `code`',
    Supplier: '`projectId` + `code`',
    TestMethod: '`projectId` + `code`',
    TestRequest: '`projectId` + `number`',
    User: '`email` (unique)',
    Variation: '`projectId` + `number`',
    WBSNode: '`projectId` + `code`',
    WorkType: '`projectId` + `code`',
  };
  return `| **${e.name}** | ${keyMap[e.name] || '`projectId` + `code`'} |`;
}).join('\n')}

## Important Rules

1. **NO UUIDs**: Never generate UUIDs. Use business keys only.
2. **projectId Required**: All entities (except User) must have \`projectId\`
3. **Composite Keys**: Some entities use multiple fields for uniqueness
4. **Audit Fields**: All entities have \`createdAt\`, \`updatedAt\`
5. **Soft Deletes**: Use \`isDeleted\` flag where applicable

## Relationships

Relationships are defined using Neo4j relationship types:
- \`BELONGS_TO_PROJECT\` - Links entity to project
- \`MAPPED_TO\` - WBS ↔ LBS mappings
- \`COVERS_WBS\` - ITP covers WBS nodes
- \`USES_WORK_TYPE\` - Entity uses work type
- \`REFERENCES\` - Document references
- And many more...

See the full master schema file for complete relationship definitions.
`;

console.log(output);


