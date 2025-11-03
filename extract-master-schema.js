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

// Extract all entity interfaces
const entityRegex = /export interface (\w+Node) \{([^}]+)\}/gs;
const entities = [];
let match;

while ((match = entityRegex.exec(content)) !== null) {
  const name = match[1].replace('Node', '');
  const props = match[2]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map(line => line.replace(/;$/, ''));
  
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
    output += `  ${prop}\n`;
  });
  output += '}\n```\n\n';
});

output += `## Business Keys

All entities use \`projectId\` for multi-tenancy plus a natural business key:

| Entity | Business Key |
|--------|-------------|
${entities.map(e => {
  const keyMap = {
    'Project': '`projectId` (unique)',
    'ITPTemplate': '`projectId` + `docNo`',
    'InspectionPoint': '`projectId` + `parentType` + `parentKey` + `sequence`',
    'Standard': '`projectId` + `code`',
    'WorkType': '`projectId` + `code`',
    'AreaCode': '`projectId` + `code`',
    'WBSNode': '`projectId` + `code`',
    'LBSNode': '`projectId` + `code`',
    'ManagementPlan': '`projectId` + `type` + `title` + `version`',
    'Document': '`projectId` + `documentNumber` + `revisionCode`',
    'Material': '`projectId` + `code`',
    'MixDesign': '`projectId` + `code`',
    'TestMethod': '`projectId` + `code`',
    'Sample': '`projectId` + `number`',
    'TestRequest': '`projectId` + `number`',
    'NCR': '`projectId` + `number`',
    'Lot': '`projectId` + `number`',
    'User': '`email` (unique)',
    'Laboratory': '`projectId` + `code`',
    'Supplier': '`projectId` + `code`',
    'Variation': '`projectId` + `number`',
    'ProgressClaim': '`projectId` + `number`',
    'Quantity': '`projectId` + `lotNumber` + `scheduleItemNumber`',
    'ScheduleItem': '`projectId` + `number`',
    'Photo': '`projectId` + `fileUrl`',
    'ITPInstance': '`projectId` + `templateDocNo` + `lotNumber`',
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


