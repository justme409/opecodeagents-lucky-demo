# Schema Cleanup - Legacy Fields Removed

## Changes Made

### Project Schema (`project.schema.ts`)

**Removed Legacy Fields:**
- ❌ `name` (use `project_name` instead)
- ❌ `client` (not in new schema)
- ❌ `location` (use `project_address` instead)
- ❌ `start_date` (use `key_dates.commencement_date` instead)
- ❌ `end_date` (use `key_dates.practical_completion_date` instead)
- ❌ `description` (use `project_description` instead)

**Kept:**
- ✅ `status` - Still useful (planning, active, on_hold, completed, archived)

### Result

The schema now enforces the new standardized field names:

```typescript
export interface ProjectNode {
  project_uuid: string;              // PRIMARY KEY
  project_name: string;              // REQUIRED - no more 'name' fallback
  project_description?: string;      // No more 'description' fallback
  project_address?: string;          // No more 'location' fallback
  // ... other fields
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
}
```

### Impact

**Next Orchestrator Run:**
- ✅ Agent will use `project_name` (required field)
- ✅ Agent will use `project_description` 
- ✅ Agent will use `project_address`
- ✅ No ambiguity about which field to use

**Frontend:**
- ⚠️ Remove fallbacks like `project.name || project.project_name`
- ✅ Use only `project.project_name`
- ✅ Use only `project.project_description`
- ✅ Use only `project.project_address`

## Why This Matters

**Before:**
```typescript
// Agent could choose either:
name: "Project Name"  // Legacy
// OR
project_name: "Project Name"  // New standard
```

**After:**
```typescript
// Agent MUST use:
project_name: "Project Name"  // Only option
```

This eliminates confusion and ensures consistency.

## Files Updated

1. `/app/opecodeagents-lucky-demo/schemas/neo4j/project.schema.ts`
   - Removed legacy fields from TypeScript interface
   - Removed legacy fields from Zod schema
   - Kept `status` field (still useful)

## Next Steps

1. ✅ Schema cleaned up
2. ⏳ **DO NOT run orchestrator yet** (as requested)
3. ⏳ When ready: Clear database and re-run orchestrator
4. ⏳ Verify Project node has `project_name` field
5. ⏳ Update frontend to remove legacy field fallbacks

---

**Status:** ✅ Complete - Ready for next orchestrator run
**Date:** November 1, 2025, 08:18 UTC

