# Neo4j Schema System

This directory contains the complete schema definitions for the Agent-First Architecture. Each schema file serves as the **single source of truth** between AI agents and the frontend.

## Philosophy: Schema as Contract

```
Agent → Outputs data matching Schema → Neo4j stores it → Frontend reads using same Schema
```

The schema sits between agents and frontend as the interface definition. Both sides reference the same file, ensuring consistency and type safety across the entire stack.

## Schema File Structure

Each schema file contains these sections:

### 1. File Header
Description and purpose of the schema

### 2. TypeScript Interfaces
Node properties and relationships for frontend type safety

### 3. Zod Schemas
Runtime validation for agent outputs and API inputs

### 4. Neo4j Cypher
Constraints, indexes, and database validation

### 5. Agent Output Format
Exact structure that agents must produce

### 6. Common Queries
Frequently used Cypher queries for this node type

### 7. Relationship Definitions
Incoming and outgoing relationships with cardinality

## Schema Categories

### Quality Core (10 schemas)
- `lot.schema.ts` - Lot tracking and status
- `itp-template.schema.ts` - ITP templates from specifications
- `itp-instance.schema.ts` - Lot-specific ITP instances
- `inspection-point.schema.ts` - Hold/witness/surveillance points
- `ncr.schema.ts` - Non-conformance reports
- `test-request.schema.ts` - Test requests and results
- `test-method.schema.ts` - Test methods and standards
- `sample.schema.ts` - Sample tracking
- `material.schema.ts` - Material approvals and certificates
- `mix-design.schema.ts` - Concrete/asphalt mix designs

### Progress & Payment (4 schemas)
- `schedule-item.schema.ts` - Contract schedule items
- `progress-claim.schema.ts` - Progress claims with claim items
- `variation.schema.ts` - Variations and change orders
- `quantity.schema.ts` - Lot quantities linked to schedule items

### Project Structure (4 schemas)
- `wbs-node.schema.ts` - Work breakdown structure hierarchy
- `lbs-node.schema.ts` - Location breakdown structure hierarchy
- `work-type.schema.ts` - Work type reference data
- `area-code.schema.ts` - Area code reference data

### Documents & Records (3 schemas)
- `document.schema.ts` - Document register with revisions
- `photo.schema.ts` - Photos with EXIF and relationships
- `management-plan.schema.ts` - Management plans and approvals

### Approvals (4 schemas)
- `workflow.schema.ts` - Workflow definitions
- `workflow-step.schema.ts` - Individual workflow steps
- `approval-instance.schema.ts` - Active approval instances
- `approval-action.schema.ts` - Approval history/actions

### Infrastructure (2 schemas)
- `project.schema.ts` - Project metadata node
- `user.schema.ts` - User node (synced from Postgres)

## Usage Examples

### Frontend (Server Component)
```typescript
import { LotNode, LOT_QUERIES } from '@/schemas/neo4j/lot.schema';
import { neo4jClient } from '@/lib/neo4j';

export default async function LotsPage({ params }) {
  const lots = await neo4jClient.read<LotNode>(
    LOT_QUERIES.getAllLots,
    { projectId: params.projectId }
  );
  
  return <LotsTable data={lots} />;
}
```

### API Route
```typescript
import { LotNodeSchema, LotNode } from '@/schemas/neo4j/lot.schema';
import { neo4jClient } from '@/lib/neo4j';

export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate with Zod
  const validatedData = LotNodeSchema.parse(body);
  
  // Create in Neo4j
  const result = await neo4jClient.writeOne<LotNode>(
    LOT_QUERIES.createLot,
    { properties: validatedData }
  );
  
  return Response.json(result);
}
```

### Agent Output
```typescript
// Agent reads the schema to know what structure to produce
import { AgentLotOutput } from '@/schemas/neo4j/lot.schema';

const agentOutput: AgentLotOutput = {
  lots: [
    {
      number: "SG-CH0000-CH0500-001",
      description: "Subgrade Ch 0 to 500",
      workType: "SG",
      areaCode: "MC01",
      startChainage: 0,
      endChainage: 500,
      startDate: "2024-01-15",
      relationships: {
        itpTemplateDocNo: "ITP-SG-001",
        wbsCodes: ["1.2.3"],
        lbsCode: "MC01-CH0000"
      }
    }
  ]
};
```

## Schema Development Workflow

1. **Define Page Requirements** - What data does the page need?
2. **Create/Update Schema** - Define the node structure in this directory
3. **Update Agent Prompt** - Agent references schema for output format
4. **Update Frontend** - Frontend imports types from schema
5. **Both sides stay in sync** - Single source of truth

## Benefits

✅ **Type Safety** - TypeScript types across frontend  
✅ **Validation** - Zod schemas catch bad data at runtime  
✅ **Documentation** - Schema file is self-documenting  
✅ **Maintainability** - Change schema once, update both sides  
✅ **Agent Clarity** - Agent knows exactly what to output  
✅ **Query Library** - Common queries live with the schema  

## Relationship Types

All schemas use standardized relationship types defined in `/lib/neo4j/types.ts`:

### Structural
- `PARENT_OF` - Hierarchical parent-child
- `PART_OF` - Component of larger whole
- `INSTANCE_OF` - Instance of a template
- `TEMPLATE_FOR` - Template for instances
- `VERSION_OF` - Version relationship
- `SUPERSEDES` - Replaces older version

### Project/Spatial
- `BELONGS_TO_PROJECT` - Links to project
- `LOCATED_IN` - Physical location
- `COVERS_WBS` - Work breakdown coverage
- `APPLIES_TO` - Application scope
- `RELATED_TO` - General relationship

### Compliance/Governance
- `GOVERNED_BY` - Governance relationship
- `IMPLEMENTS` - Implementation of requirement
- `EVIDENCES` - Evidence for requirement
- `SATISFIES` - Satisfies requirement

### Process/Workflow
- `APPROVED_BY` - Approval relationship
- `REVIEWED_BY` - Review relationship
- `OWNED_BY` - Ownership
- `ASSIGNED_TO` - Assignment
- `REPORTED_BY` - Reporter
- `RESOLVED_BY` - Resolver

### Quality Specific
- `HAS_NCR` - Has non-conformance
- `HAS_TEST` - Has test request
- `HAS_QUANTITY` - Has quantity
- `HAS_POINT` - Has inspection point
- `USES_MATERIAL` - Uses material

## Conventions

### Node Properties
- All nodes have `id` (UUID), `createdAt`, `updatedAt`
- Status fields use enums (defined in schema)
- Dates are ISO 8601 strings
- Arrays for multi-value properties

### Naming
- Node labels: PascalCase (e.g., `Lot`, `ITP_Template`)
- Properties: camelCase (e.g., `startDate`, `percentComplete`)
- Relationships: UPPER_SNAKE_CASE (e.g., `BELONGS_TO_PROJECT`)

### Validation
- Required fields marked in Zod schema
- Enums for constrained values
- Min/max for numeric ranges
- Custom validators for business rules

## Migration from Postgres

When migrating existing features:
1. Create Neo4j schema first
2. Define relationships in schema
3. Update API routes to use Neo4j
4. Update frontend to import from schema
5. Test with sample data
6. Migrate production data
7. Remove Postgres tables

## Contributing

When adding a new schema:
1. Copy an existing schema as template
2. Update all sections (types, Zod, Cypher, queries, relationships)
3. Add to appropriate category in this README
4. Update relationship definitions in related schemas
5. Test with sample data
6. Document any special considerations

