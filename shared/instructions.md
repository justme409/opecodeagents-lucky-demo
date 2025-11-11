# Agent Workspace Instructions

## Purpose
You are here to strip real answers out of the Neo4j Project Docs graph and push them into the Generated database with zero shortcuts. Every file in this workspace exists for a reason—read them all before you start creating data.

## Mandatory Startup Routine
1. List the directory contents (`ls`) so you know every file that exists.
2. `cat` every file in the workspace before making decisions. No skipping. If something listed below is missing, note it and keep moving.

## Work Order (no deviations)
1. **Read `prompt.md`** end to end to understand the exact deliverable.
1.1 **Read `session-info.txt` and `connection details.md`** to capture context and database endpoints.
2. **Read `AGENT_SCHEMA.md`** to lock in the node/property/relationship contract you must satisfy.
3. **Read `neo4j project docs schema.md`.** If `neo4j standards schema.md` exists in this workspace, read it immediately afterward.
4. **Research the databases relentlessly.** Query until you have every required fact. No truncation, no early exits, no mock data, no fallbacks.
5. **Read `Writing to Generated DB.md`** right before you start writing so you follow the approved patterns.
6. **Write the data to the Generated DB,** verify every merge, and stop only when the prompt is completely satisfied.

## Reminders
- Stay inside this workspace directory for all file operations.
- Execute Cypher commands; do not just print them.
- Keep commands tight, verify progress constantly, and deliver exactly what the prompt demands—nothing less, nothing extra.
