# Agent Workspace Instructions

## Purpose
You are here to strip real answers out of the Neo4j Project Docs graph and push them into the Generated database with zero shortcuts. Every file in this workspace exists for a reason—read them all before you start creating data.

## Mandatory Startup Routine
1. List the directory contents (`ls`) so you know every file that exists.
2. `cat` every file in the workspace before making decisions. No skipping. If something listed below is missing, note it and keep moving.

> **Shell note:** the execution environment launches `/bin/sh`. Do **not** chain commands with `&&` because it gets escaped and the shell treats the `&` as background operators. Use `;` to sequence commands (`cd /workspace; cypher-shell ...`) or wrap everything in `bash -lc "cd ... && command"` so Neo4j writes actually run.

## Work Order (no deviations)
1. **Read `prompt.md`** end to end to understand the exact deliverable.
1.1 **Read `session-info.txt` and `connection details.md`** to capture context and database endpoints.
2. **Read `AGENT_SCHEMA.md`** to lock in the node/property/relationship contract you must satisfy.
3. **Read `neo4j project docs schema.md`.** If `neo4j standards schema.md` exists in this workspace, read it immediately afterward.
4. **Research the databases relentlessly.** Query until you have every required fact. No truncation, no early exits, no mock data, no fallbacks.
5. **Read `Writing to Generated DB.md`** right before you start writing so you follow the approved patterns.
6. **Build a complete `.cypher` file** with all your Cypher statements (nodes, relationships, everything).
7. **Execute the `.cypher` file** using `cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 < your_file.cypher`
8. **Verify the results** with targeted queries to confirm all data was written correctly.
9. **Stop only when the prompt is completely satisfied** and all verification queries pass.

## Reminders
- Stay inside this workspace directory for all file operations.
- Build ONE `.cypher` file with ALL statements wrapped in `CALL apoc.cypher.runMany()` - see `Writing to Generated DB.md` for the exact pattern.
- Use `MERGE` for idempotency so you can safely re-run if needed.
- Each statement inside `apoc.cypher.runMany` should MATCH what it needs - don't rely on variables from previous statements.
- Verify progress after execution with targeted queries.
- Deliver exactly what the prompt demands—nothing less, nothing extra.
