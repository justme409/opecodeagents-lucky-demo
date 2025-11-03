# Project UUID Standardization Plan

## Problem
Currently we have inconsistent naming:
- `id` (used in Project node as the UUID)
- `project_id` (used in other nodes)
- `projectId` (camelCase variant)
- Confusion about what is the "project identifier"

## Solution: Standardize on `project_uuid`

### 1. Project Schema Changes
**File:** `project.schema.ts`

**Current:**
```typescript
export interface ProjectNode {
  id: string;  // ❌ Ambiguous
  projectName: string;
  // ...
}
```

**New:**
```typescript
export interface ProjectNode {
  project_uuid: string;  // ✅ Clear and consistent
  project_name: string;  // ✅ Clear (snake_case for Neo4j)
  project_code?: string;
  contract_number?: string;
  project_description?: string;
  // ...
}
```

### 2. All Other Schemas
**Change:** `project_id: string` → `project_uuid: string`

**Affected files (27 schemas):**
- document.schema.ts
- wbs-node.schema.ts
- lbs-node.schema.ts
- itp-template.schema.ts
- itp-instance.schema.ts
- inspection-point.schema.ts
- management-plan.schema.ts
- test-method.schema.ts
- mix-design.schema.ts
- workflow.schema.ts
- material.schema.ts
- test-request.schema.ts
- ncr.schema.ts
- lot.schema.ts
- photo.schema.ts
- quantity.schema.ts
- sample.schema.ts
- schedule-item.schema.ts
- workflow-step.schema.ts
- approval-instance.schema.ts
- approval-action.schema.ts
- progress-claim.schema.ts
- variation.schema.ts
- work-type.schema.ts
- area-code.schema.ts
- user.schema.ts

### 3. Orchestrator Changes
**File:** `orchestrator.js`

**Change:**
```javascript
// Current
const projectIdHeader = `...This project's UUID is: \`${CONFIG.PROJECT_ID}\`...
You MUST use this exact UUID as the \`id\` field (NOT \`project_id\`)...
All other nodes you create MUST include a \`project_id\` property...`;

// New
const projectUuidHeader = `...This project's UUID is: \`${CONFIG.PROJECT_UUID}\`...
You MUST use this exact UUID as the \`project_uuid\` field when creating the Project node.
All other nodes you create MUST include a \`project_uuid\` property set to this UUID value.`;
```

### 4. Database Migration
**After changes, we need to:**
1. Clear the Generated database
2. Re-run the orchestrator
3. Verify all nodes have `project_uuid` property

## Benefits
✅ **Clarity:** `project_uuid` is unambiguous
✅ **Consistency:** Same term everywhere
✅ **No confusion:** Clear distinction from `project_code`, `contract_number`, etc.
✅ **Database-friendly:** Snake_case matches Neo4j conventions

## Implementation Order
1. ✅ Update Project schema (project.schema.ts)
2. ✅ Update all 27 other schemas
3. ✅ Update orchestrator.js (CONFIG and prompts)
4. ✅ Clear database
5. ✅ Test run orchestrator
6. ✅ Verify frontend displays correctly

