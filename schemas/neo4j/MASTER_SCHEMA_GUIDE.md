# Master Schema Guide

## Overview

The Neo4j schema has been consolidated into a single master schema file (`master-schema.ts`) that serves as the **single source of truth** for all entities, relationships, and agent outputs in the system.

## Key Changes

### 1. **Consolidated Schema**
- All 27+ individual schema files have been superseded by `master-schema.ts`
- Old schema files moved to `/app/recycle_bin_all_files_within_are_superseded/neo4j_schemas_old/`
- All imports now use `@/schemas/neo4j` (index.ts) which exports from the master schema

### 2. **Business Keys Instead of UUIDs**
- **No more UUID fields** in schemas
- Each entity uses natural business keys:
  - `Lot`: `projectId` + `number`
  - `ITPTemplate`: `projectId` + `docNo`
  - `Material`: `projectId` + `code`
  - `Document`: `projectId` + `documentNumber` + `revisionCode`
- Composite uniqueness constraints: `(projectId, businessKey)`

### 3. **Shared Reference Nodes**
- Extracted common properties into dedicated nodes:
  - `Standard`: Industry standards (AS/NZS, ISO, etc.)
  - `Supplier`: Material suppliers
  - `Laboratory`: Testing laboratories
  - `WorkType`: Work classifications
  - `AreaCode`: Location codes
- These are linked via relationships instead of duplicated as strings

### 4. **Agent-First Architecture**
- Each entity includes metadata about:
  - Which agent creates it
  - Which pages display it
  - What relationships it has
- Helper functions to query by agent or page

## Usage

### Importing Schemas

```typescript
// Import everything from the master schema
import {
  LotNode,
  ITPTemplateNode,
  MaterialNode,
  getEntityMetadata,
  getEntitySchema,
  ALL_ENTITIES,
} from '@/schemas/neo4j';
```

### Getting Entity Information

```typescript
import { getEntityMetadata, getEntitySchema } from '@/schemas/neo4j';

// Get metadata (agent, pages, relationships)
const metadata = getEntityMetadata('ITPTemplate');
console.log(metadata.createdBy); // [{ agent: 'ITP_AGENT', prompt: '...' }]
console.log(metadata.displayedOn); // ['/projects/[projectId]/itps', ...]

// Get Zod validation schema
const schema = getEntitySchema('ITPTemplate');
const validated = schema.parse(data);
```

### Querying by Agent or Page

```typescript
import { getEntitiesByAgent, getEntitiesByPage } from '@/schemas/neo4j';

// Get all entities an agent can create
const itpEntities = getEntitiesByAgent('ITP_AGENT');
// Returns: ['ITPTemplate', 'InspectionPoint', 'Standard']

// Get all entities displayed on a page
const lotPageEntities = getEntitiesByPage('/projects/[projectId]/lots/[lotId]');
// Returns: ['Lot', 'ITPInstance', 'NCR', 'TestRequest', 'Material', 'Photo', ...]
```

## Agent Manifest

The `agent-manifest.ts` file provides a comprehensive mapping of agents to their schemas.

### Using the Agent Manifest

```typescript
import {
  getAgentManifest,
  getAgentSchema,
  getAgentOutputSpec,
  getAgentSchemaInstruction,
} from '@/schemas/neo4j/agent-manifest';

// Get agent definition
const agent = getAgentManifest('ITP_AGENT');
console.log(agent.entities); // ['ITPTemplate', 'InspectionPoint', 'Standard']
console.log(agent.promptPath); // '@prompts/itp-generation.md'

// Get combined Zod schema for agent output
const schema = getAgentSchema('ITP_AGENT');
// Returns: z.object({
//   ITPTemplate: z.array(...).optional(),
//   InspectionPoint: z.array(...).optional(),
//   Standard: z.array(...).optional(),
// })

// Get full output specification (schemas + relationships)
const spec = getAgentOutputSpec('ITP_AGENT');
console.log(spec.entities); // Full entity definitions
console.log(spec.relationships); // All relationships between entities

// Get formatted instruction for agent prompt
const instruction = getAgentSchemaInstruction('ITP_AGENT');
// Returns formatted markdown with schema structure and rules
```

### Available Agents

| Agent ID | Name | Entities Generated |
|----------|------|-------------------|
| `PROJECT_DETAILS` | Project Details Agent | Project, WorkType, AreaCode |
| `DOCUMENT_METADATA` | Document Metadata Extraction | Document |
| `ITP_AGENT` | ITP Generation Agent | ITPTemplate, InspectionPoint, Standard |
| `STANDARDS_EXTRACTION` | Standards Extraction Agent | Standard |
| `WBS_EXTRACTION` | WBS Extraction Agent | WBSNode |
| `LBS_EXTRACTION` | LBS Extraction Agent | LBSNode |
| `PQP_GENERATION` | PQP Generation Agent | ManagementPlan |
| `OHSMP_GENERATION` | OHSMP Generation Agent | ManagementPlan |
| `EMP_GENERATION` | EMP Generation Agent | ManagementPlan |
| `QSE_GENERATION` | QSE Document Generation | ManagementPlan, Document |
| `MATERIAL_AGENT` | Material Extraction Agent | Material, MixDesign, Supplier |
| `TEST_METHOD_AGENT` | Test Method Extraction | TestMethod, Laboratory |
| `SCHEDULE_EXTRACTION` | Schedule Extraction Agent | ScheduleItem |

## Master Schema Structure

### Entity Definition Format

Each entity in the master schema includes:

```typescript
export interface EntityNode {
  // Business keys
  projectId: string;
  code: string; // or number, docNo, etc.
  
  // Entity properties
  name: string;
  // ... other fields
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

export const EntityMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'AGENT_ID', prompt: 'path/to/prompt.md' },
  ],
  displayedOn: [
    '/path/to/page',
  ],
  relationships: {
    outgoing: [
      { type: 'REL_TYPE', target: 'TargetEntity', description: '...' },
    ],
    incoming: [
      { type: 'REL_TYPE', source: 'SourceEntity', description: '...' },
    ],
  },
};

export const EntitySchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  // ... validation rules
});
```

### Helper Functions

```typescript
// Get all entity types
import { ALL_ENTITIES } from '@/schemas/neo4j';
console.log(ALL_ENTITIES); // ['AreaCode', 'Document', 'ITPTemplate', ...]

// Get metadata for an entity
const metadata = getEntityMetadata('ITPTemplate');

// Get Zod schema for an entity
const schema = getEntitySchema('ITPTemplate');

// Get entities by agent
const entities = getEntitiesByAgent('ITP_AGENT');

// Get entities by page
const entities = getEntitiesByPage('/projects/[projectId]/lots');
```

## Migration Notes

### For Developers

1. **Import Changes**: All imports from `@/schemas/neo4j/lot.schema` should now be `@/schemas/neo4j`
   - This has been done automatically via sed replacement
   
2. **UUID Removal**: 
   - Remove any `id` or `uuid` fields from queries
   - Use business keys instead: `number`, `code`, `docNo`, etc.
   - Update `MATCH` clauses to use `(projectId, businessKey)`

3. **Relationship Changes**:
   - Replace string properties with relationships to shared nodes
   - Example: `workType: string` → `USES_WORK_TYPE` relationship to `WorkType` node

### For Agents

1. **No UUID Generation**: Agents should NOT generate UUIDs
2. **Use Business Keys**: Generate natural identifiers (codes, numbers, etc.)
3. **Include projectId**: All entities must have `projectId` field
4. **Follow Schema**: Use `getAgentSchemaInstruction()` to get formatted output requirements

## Examples

### Creating a Lot (API Route)

```typescript
import { LotNode, LotSchema } from '@/schemas/neo4j';

// Validate input
const validated = LotSchema.parse(body);

// Create in Neo4j using business keys
await neo4jWriteOne<LotNode>(
  `
  MATCH (p:Project {projectId: $projectId})
  CREATE (l:Lot {
    projectId: $projectId,
    number: $number,
    name: $name,
    status: $status,
    createdAt: datetime(),
    updatedAt: datetime()
  })
  CREATE (l)-[:BELONGS_TO_PROJECT]->(p)
  RETURN l
  `,
  { projectId, number, name, status }
);
```

### Agent Output Validation

```typescript
import { getAgentSchema } from '@/schemas/neo4j/agent-manifest';

const agentSchema = getAgentSchema('ITP_AGENT');

// Validate agent output
const validated = agentSchema.parse(agentOutput);
// validated = {
//   ITPTemplate: [...],
//   InspectionPoint: [...],
//   Standard: [...]
// }
```

## Benefits

1. **Single Source of Truth**: All schema definitions in one place
2. **Type Safety**: TypeScript interfaces + Zod validation
3. **Agent Integration**: Direct mapping from agents to schemas
4. **Relationship Clarity**: Explicit relationship definitions
5. **Maintainability**: One file to update instead of 27+
6. **Consistency**: Standardized structure across all entities
7. **Documentation**: Built-in metadata about usage and relationships

## Future Enhancements

1. **Automated Constraint Generation**: Generate Neo4j constraints from schema
2. **GraphQL Schema Generation**: Auto-generate GraphQL types
3. **Migration Scripts**: Generate migration scripts from schema changes
4. **Validation Hooks**: Runtime validation in API routes
5. **Agent Orchestration**: Use manifest for dynamic agent routing

