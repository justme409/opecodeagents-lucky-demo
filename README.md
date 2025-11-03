# OpenCode Agents - Construction Project Orchestrator

AI-powered agent orchestration system for extracting and generating construction project documentation from Neo4j databases.

## What This Does

This system runs multiple AI agents in parallel to:
- Extract project metadata, WBS, standards from documents
- Generate management plans (ITP, EMP, OHSMP, PQP, QSE)
- Process construction data and write to Neo4j databases

Each agent works in its own workspace with access to 3 Neo4j databases:
- **Standards DB** (read-only) - Reference specifications
- **Project Docs DB** (read-only) - Project documents
- **Generated DB** (write) - Output destination

---

## Quick Start

### 1. Monitor the Stream (Recommended)

**Start the stream monitor to see all agent activity in real-time:**

```bash
cd /app/opecodeagents-lucky-demo
python3 stream.py
```

You'll see:
```
Connected to opencode server

Session: ses_abc123...

============================================================
[BASH] $ cypher-shell -a bolt://localhost:7687 ...
============================================================
[OUTPUT]
Connected to Neo4j
Project: jervois_street
------------------------------------------------------------

[READ] connection details.md
[WRITE] output.cypher
```

**Stream shows:**
- Bash commands being executed (with `====` separators)
- File operations (READ, WRITE, EDIT, LIST)
- Tool outputs (with `----` separators)
- Errors and status updates

### 2. Run the Orchestrator

**In a separate terminal:**

```bash
cd /app/opecodeagents-lucky-demo
node orchestrate.js
```

This launches 10 agents in parallel:
1. project-details
2. document-metadata
3. standards-extraction
4. wbs-extraction
5. pqp-generation
6. emp-generation
7. ohsmp-generation
8. qse-generation
9. lbs-extraction (depends on wbs-extraction)
10. itp-generation (depends on pqp, wbs, standards)

---

## Project Structure

```
opecodeagents-lucky-demo/
├── orchestrate.js           # Main orchestrator (runs all agents)
├── spawn-agent.sh           # Creates agent workspace + files
├── stream.py                # Real-time event monitor
├── stream-debug.py          # Debug version (shows all events)
├── extract-master-schema.js # Extracts schema for each agent
├── extract-agent-schema.js  # Extracts agent-specific schema
├── prompts/                 # Agent task prompts
│   ├── project-details.md
│   ├── document-metadata.md
│   ├── wbs-extraction.md
│   ├── lbs-extraction.md
│   ├── standards-extraction.md
│   ├── pqp-generation.md
│   ├── emp-generation.md
│   ├── ohsmp-generation.md
│   ├── qse-generation.md
│   └── itp-generation.md
├── schemas/neo4j/           # Database schemas
│   ├── master-schema.ts     # Complete schema (26 entities)
│   └── agent-manifest.ts    # Agent-to-entity mapping
└── shared/                  # Shared across all agents
    ├── connection details.md
    ├── instructions.md
    ├── Exploration guide.md
    ├── neo4j reference docs schema.md
    └── neo4j standards schema.md
```

---

## How It Works

### Agent Workflow

1. **Spawn Workspace**: `spawn-agent.sh <task-name>` creates:
   ```
   /app/opencode-workspace/agent-sessions/<timestamp-id>/
   ├── prompt.md              # Task instructions
   ├── session-info.txt       # Session metadata
   ├── MASTER_SCHEMA.md       # Full Neo4j schema
   ├── AGENT_SCHEMA.md        # Agent-specific entities
   ├── README.md              # Quick reference
   └── shared/                # Symlinked shared resources
   ```

2. **Create Session**: Orchestrator creates an opencode session

3. **Send Prompt**: Sends `cd <workspace> && cat prompt.md` to agent

4. **Agent Executes**: Agent reads files, connects to Neo4j, processes data

5. **Poll for Completion**: Orchestrator polls until agent finishes

### OpenCode Server

The orchestrator communicates with the opencode server (running on port 4096):
- **POST** `/session` - Create new session
- **POST** `/session/{id}/message` - Send prompt to agent
- **GET** `/session/{id}/message` - Check completion status
- **GET** `/event` - Stream all events (SSE)

---

## Stream Monitor Usage

### Basic Usage
```bash
python3 stream.py
```

### Run in Background
```bash
python3 stream.py > stream.log 2>&1 &
```

### Filter Specific Events
```bash
python3 stream.py | grep -E '\[BASH\]|\[ERROR\]'
```

### Debug Mode (Shows All Events)
```bash
python3 stream-debug.py
```

### What You'll See

**Bash Commands:**
```
============================================================
[BASH] $ cypher-shell -a bolt://localhost:7687 -u neo4j -p password
============================================================
[OUTPUT]
Connected to Neo4j
------------------------------------------------------------
```

**File Operations:**
```
[READ] connection details.md
[WRITE] output.cypher
[EDIT] script.js
[LIST] /workspace
```

**Errors:**
```
Error: The client is unauthorized due to authentication failure
```

---

## Troubleshooting

### Stream Not Showing Commands

If you only see output but no bash commands:
- The AI might be outputting text instead of calling tools
- Check that prompts explicitly request tool usage
- Verify agent is set to "build" (has all tools enabled)

### "Grammar is too complex" Error

The schema files are too large for the AI model:
- Simplify `MASTER_SCHEMA.md` and `AGENT_SCHEMA.md`
- Remove unnecessary examples and fields
- Break complex schemas into smaller parts

### Neo4j Authentication Failures

```bash
# Test connection manually:
cypher-shell -a bolt://localhost:7687 -u neo4j -p your_password

# Verify databases exist:
SHOW DATABASES;
```

Check credentials in `shared/connection details.md`

### Orchestrator Hangs

- Check stream output for errors
- Verify opencode server is running: `curl http://127.0.0.1:4096/event`
- Check agent workspace was created properly
- Look for permission errors in stream

---

## Key Files Explained

### `orchestrate.js`
Main orchestrator that:
- Defines task dependencies
- Spawns workspaces for each agent
- Creates sessions and sends prompts
- Polls for completion
- Manages parallel execution

### `spawn-agent.sh`
Creates agent workspace with:
- Task-specific prompt
- Relevant schema files
- Shared resources (symlinked)
- Session metadata

### `stream.py`
Real-time event monitor showing:
- Bash commands with visual separators
- File operations (read/write/edit/list)
- Tool outputs
- Errors and status updates

### `extract-master-schema.js`
Generates `MASTER_SCHEMA.md` from `master-schema.ts`:
- All 26 entity types
- Properties, relationships, business keys
- Agent and page metadata

### `extract-agent-schema.js`
Generates `AGENT_SCHEMA.md` for specific agent:
- Only entities the agent creates/uses
- Filtered from master schema
- Smaller, focused schema

---

## Neo4j Schema

The system uses a master schema with 26 entity types:

**Quality & Compliance:**
- Lot, ITP, InspectionPoint, NCR, Test, Material

**Project Structure:**
- WBS, LBS, WorkType, AreaCode

**Documents:**
- Document, Photo, ManagementPlan

**Progress & Payment:**
- ScheduleItem, ProgressClaim, Variation, Quantity

**Reference Data:**
- Standard, Supplier, Laboratory

**Infrastructure:**
- Project, User

Each entity has:
- Business key (no UUIDs)
- Properties with types
- Incoming/outgoing relationships
- Agent metadata (which agent creates it)
- Page metadata (where it's displayed)

---

## Requirements

- **Node.js** - For orchestrator
- **Python 3** - For stream monitor
- **OpenCode Server** - Running on port 4096
- **Neo4j** - 3 databases on ports 7687, 7688, 7689

---

## Tips

1. **Always run the stream monitor** - It shows you exactly what's happening
2. **Test one agent first** - Before running the full orchestrator
3. **Check Neo4j connections** - Most failures are auth issues
4. **Simplify schemas** - If you get "grammar too complex" errors
5. **Use debug mode** - `stream-debug.py` shows raw events for troubleshooting

---

## Support

For issues or questions, check:
- Stream output for real-time errors
- Agent workspace files in `/app/opencode-workspace/agent-sessions/`
- OpenCode server logs
- Neo4j connection status

