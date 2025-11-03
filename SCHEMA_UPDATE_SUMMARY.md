# Neo4j Schema Update Summary

## Changes Made

### 1. Orchestrator Updates (`orchestrator.js`)

✅ **Added PROJECT_ID constant**
- Set to `b168e975-2531-527f-9abd-19cb8f502fe0` (frontend's project UUID)
- Can be overridden via environment variable

✅ **Removed standards-extraction task**
- Commented out in TASK_GRAPH
- Removed from PQP dependencies
- Reason: Takes too long without providing immediate value

✅ **Added project_id injection to all prompts**
- Prepends project context header to every agent prompt
- For Project node: Uses UUID as `id` field
- For all other nodes: Adds `project_id` property

### 2. Required Schema Updates

**IMPORTANT**: All Neo4j schemas need to add `project_id` as a REQUIRED property (not optional).

#### Why?
- Prevents nodes from getting "lost" in the database
- Enables efficient querying by project
- Provides redundancy alongside `BELONGS_TO_PROJECT` relationship
- Frontend queries can filter by `project_id` property directly

#### Pattern to Add:

**In TypeScript Interface:**
```typescript
export interface [NodeType]Node {
  id: string;
  project_id: string;  // <-- ADD THIS (required, not optional)
  // ... rest of fields
}
```

**In Zod Schema:**
```typescript
export const [NodeType]NodeSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),  // <-- ADD THIS
  // ... rest of fields
});
```

**In CREATE Query:**
```cypher
CREATE (n:[NodeType])
SET n = $properties
SET n.id = randomUUID()
SET n.project_id = $projectId  // <-- ADD THIS
SET n.createdAt = datetime()
RETURN n
```

#### Schemas to Update:

- ✅ `project.schema.ts` - Special case: uses `id` field, not `project_id`
- ⚠️ `document.schema.ts`
- ⚠️ `wbs-node.schema.ts`
- ⚠️ `lbs-node.schema.ts`
- ⚠️ `itp-template.schema.ts`
- ⚠️ `itp-instance.schema.ts`
- ⚠️ `inspection-point.schema.ts`
- ⚠️ `management-plan.schema.ts`
- ⚠️ `test-method.schema.ts`
- ⚠️ `test-request.schema.ts`
- ⚠️ `material.schema.ts`
- ⚠️ `mix-design.schema.ts`
- ⚠️ `sample.schema.ts`
- ⚠️ `lot.schema.ts`
- ⚠️ `ncr.schema.ts`
- ⚠️ `photo.schema.ts`
- ⚠️ `quantity.schema.ts`
- ⚠️ `schedule-item.schema.ts`
- ⚠️ `workflow.schema.ts`
- ⚠️ `workflow-step.schema.ts`
- ⚠️ `approval-instance.schema.ts`
- ⚠️ `approval-action.schema.ts`
- ⚠️ `progress-claim.schema.ts`
- ⚠️ `variation.schema.ts`
- ⚠️ `work-type.schema.ts`
- ⚠️ `area-code.schema.ts`
- ⚠️ `user.schema.ts` - May not need project_id (global resource)

### 3. Recurring Errors Found in Logs

**Error**: `File /tmp/standards_list.txt is not in the current working directory`

**Frequency**: 47 occurrences in standards-extraction task

**Cause**: Agent trying to create/access files in `/tmp` which is outside the workspace directory

**Impact**: Tool calls fail, but agent continues and completes task

**Recommendation**: 
- Update agent instructions to only create files in current workspace
- Add explicit instruction: "Do NOT use /tmp directory - use current workspace only"
- Consider adding this to shared/instructions.md

### 4. Next Steps

1. ⚠️ **Update all schemas** to include `project_id` property (REQUIRED)
2. ⚠️ **Test with fresh database** to ensure all nodes have project_id
3. ⚠️ **Update shared instructions** to prevent /tmp file access
4. ⚠️ **Run orchestrator again** with updated schemas and project_id injection

## Testing Checklist

- [ ] Clear Generated database
- [ ] Run orchestrator with new configuration
- [ ] Verify all created nodes have `project_id` property
- [ ] Verify Project node has correct `id` (b168e975-2531-527f-9abd-19cb8f502fe0)
- [ ] Check frontend can now display project details
- [ ] Verify no /tmp file access errors in logs

## Notes

- Standards-extraction removed for now (can be re-enabled later)
- Project UUID is hardcoded for testing (will need parameterization for production)
- All agents now receive project context in their prompts

