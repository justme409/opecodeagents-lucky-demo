# OpenCode Agents - Construction Project Orchestrator

AI-powered agent orchestration for extracting and generating construction project documentation from Neo4j databases.

## What This Does

Runs multiple AI agents in parallel to:
- Extract project metadata, WBS, standards from documents
- Generate management plans (ITP, EMP, OHSMP, PQP, QSE)
- Process construction data and write to Neo4j

Each agent has access to 3 Neo4j databases:
- **Standards DB** (port 7687) - Read-only reference specs
- **Project Docs DB** (port 7688) - Read-only project documents
- **Generated DB** (port 7690) - Write destination for results

---

## Quick Start

### 1. Start Stream Monitor (Always Do This First!)

```bash
cd /app/opecodeagents-lucky-demo
python3 stream.py
```

Shows real-time agent activity:
- Bash commands
- File operations
- Neo4j queries
- Errors

### 2. Run a Task

**Single Task (Testing):**
```bash
node run-single-task.js project-details
```

**All Tasks (Production):**
```bash
node orchestrate.js
```

**Dynamic ITP Generation (After PQP):**
```bash
node run-itp-generation.js
```

---

## Available Tasks

| Task | Description | Dependencies |
|------|-------------|--------------|
| `project-details` | Extract project metadata | None |
| `document-metadata` | Extract document info | None |
| `standards-extraction` | Extract standards/specs | None |
| `wbs-extraction` | Extract Work Breakdown Structure | None |
| `pqp-generation` | Generate Project Quality Plan | None |
| `emp-generation` | Generate Environmental Plan | None |
| `ohsmp-generation` | Generate OH&S Plan | None |
| `qse-generation` | Generate QSE Plan | None |
| `lbs-extraction` | Extract Location Breakdown | `wbs-extraction` |
| `itp-generation` | Generate Inspection Test Plans | `pqp-generation` |

---

## How It Works

### Execution Flow

1. **Spawn workspace** - Creates isolated directory with task prompt and schemas
2. **Create session** - POST to opencode server
3. **Start monitoring** - Subscribe to `/event` stream BEFORE sending prompt
4. **Send prompt** - POST returns immediately, agent runs async
5. **Track progress** - Event stream provides real-time updates
6. **Detect completion** - `session.idle` event signals done
7. **Save logs** - Full event log saved to `workspace/session-log.json`

### Event Stream Architecture (No Polling!)

All orchestration scripts use Server-Sent Events for instant completion detection:

```javascript
// From lib/monitor.js
function monitorSession(sessionId, workspacePath) {
  return new Promise((resolve, reject) => {
    // Subscribe to /event stream
    http.get('/event', (res) => {
      res.on('data', (chunk) => {
        const event = parseSSE(chunk);
        
        // Check for completion
        if (event.type === 'session.idle' && 
            event.properties.sessionID === sessionId) {
          // Save logs and resolve
          fs.writeFileSync('session-log.json', JSON.stringify(logs));
          resolve({ success: true, duration, stats });
        }
      });
    });
  });
}
```

**Key Benefits:**
- ✅ **Instant completion detection** - No 2-second polling delay
- ✅ **Real-time progress tracking** - Tool counts, bash commands, file ops
- ✅ **Full event logs** - Every event captured to `session-log.json`
- ✅ **Parallel efficiency** - Each session monitors independently
- ✅ **Error detection** - `session.error` events caught immediately

**Event Types Monitored:**
- `session.idle` - Task completed successfully
- `session.error` - Task failed with error
- `message.part.updated` - Progress updates (tools, reasoning, text)
- All events logged for debugging

---

## Architecture

### Parallel Execution

```
Wave 1 (8 tasks) ──────────────→ 50s
  ├─ project-details
  ├─ document-metadata
  ├─ standards-extraction
  ├─ wbs-extraction
  ├─ pqp-generation
  ├─ emp-generation
  ├─ ohsmp-generation
  └─ qse-generation

Wave 2 (1 task) ───────→ 70s
  └─ lbs-extraction (waits for wbs)

Wave 3 (1 task) ───────→ 95s
  └─ itp-generation (waits for pqp)

Total: 95s (vs 425s sequential)
```

### Dynamic ITP Generation

The `itp-generation` task is special:
1. Queries Generated DB for ITPTemplate nodes
2. Spawns one agent per ITP found
3. All ITP agents run in parallel
4. Each generates InspectionPoint nodes

Example: 5 ITPs → 5 parallel agents → 120s total

---

## Project Structure

```
opecodeagents-lucky-demo/
├── run-single-task.js      # Run one task
├── orchestrate.js          # Run all tasks
├── run-itp-generation.js   # Dynamic ITP agents
├── spawn-agent.sh          # Create workspace
├── stream.py               # Event monitor
├── prompts/                # Task instructions
├── schemas/neo4j/          # Database schemas
└── shared/                 # Connection details, guides
```

Each agent workspace contains:
```
/app/opencode-workspace/agent-sessions/<timestamp>/
├── prompt.md           # Task instructions
├── MASTER_SCHEMA.md    # Full Neo4j schema
├── AGENT_SCHEMA.md     # Agent-specific entities
└── shared/             # Symlinked resources
```

---

## Troubleshooting

### Neo4j Connection Issues

```bash
# Test connections
cypher-shell -a neo4j://localhost:7687 -u neo4j -p 5b01beec33ac195e1e75acb6d90b4944
cypher-shell -a neo4j://localhost:7688 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

Credentials are in `shared/connection details.md`

### "Grammar is too complex" Error

Schema files are too large. Simplify:
- `MASTER_SCHEMA.md`
- `AGENT_SCHEMA.md`

Remove examples and unnecessary fields.

### Task Hangs or Fails

1. Check `stream.py` output for errors
2. Verify opencode server: `curl http://127.0.0.1:4096/event`
3. Check workspace files in `/app/opencode-workspace/agent-sessions/`
4. Review Neo4j connections

### Stream Shows No Commands

- Agent might be outputting text instead of using tools
- Check prompt encourages tool usage
- Verify agent is set to "build" (has all tools)

---

## Verification

### Check Results in Neo4j

```bash
cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

```cypher
-- Count all nodes by type
MATCH (n) RETURN labels(n)[0] as type, count(n) as count ORDER BY type;

-- View project
MATCH (p:Project) RETURN p;

-- View ITP templates
MATCH (itp:ITPTemplate) RETURN itp.docNo, itp.description;

-- View inspection points per ITP
MATCH (itp:ITPTemplate)-[:HAS_POINT]->(point:InspectionPoint)
RETURN itp.docNo, count(point) AS points;
```

---

## Key Improvements

### 1. Event Stream Monitoring (lib/monitor.js)

**Shared monitoring library** used by all orchestration scripts:

```javascript
const { monitorSession } = require('./lib/monitor');

// Usage in any script
const result = await monitorSession(sessionId, workspacePath, {
  serverUrl: 'http://127.0.0.1:4096',
  onProgress: (progress) => {
    // Optional progress callbacks
    if (progress.type === 'bash') {
      console.log(`Bash commands: ${progress.count}`);
    }
  }
});

// Returns: { success, duration, stats, logPath }
// stats: { toolCount, bashCount, fileOps }
```

**Benefits:**
- Consistent completion detection across all scripts
- Real-time progress tracking
- Full event log capture
- Parallel execution support

### 2. Stream.py Improvements

**Zero-buffering event display:**

```python
# Uses http.client instead of requests
# Reads byte-by-byte for instant delivery
conn = http.client.HTTPConnection(host, port)
response = conn.getresponse()
chunk = response.read(1)  # Instant!
```

**Shows model thinking:**

```
============================================================
[REASONING]
============================================================
The project requires extracting metadata from documents...
```

**Benefits:**
- Instant event display (no lag)
- Shows LLM reasoning process
- Clear formatting for tool calls
- Real-time debugging

### 3. Orchestration Scripts Updated

**All scripts now use event stream:**

| Script | Old Method | New Method | Improvement |
|--------|-----------|------------|-------------|
| `run-single-task.js` | ✅ Event stream | ✅ Event stream | Already updated |
| `orchestrate.js` | ❌ HTTP polling | ✅ Event stream | **Instant completion** |
| `run-itp-generation.js` | ❌ HTTP polling | ✅ Event stream | **Parallel efficiency** |

**Old (Polling):**
```javascript
// Poll every 2 seconds
while (true) {
  await sleep(2000);
  const messages = await get('/session/{id}/message');
  if (messages[last].completed) break;
}
```

**New (Event Stream):**
```javascript
// Instant notification
const result = await monitorSession(sessionId, workspacePath);
// Resolves immediately when session.idle received
```

### 4. Progress Visibility

**High-level status updates:**

```
[12:10:05] Starting: project-details
[12:10:05]   Workspace: 20251104-121005-abc123
[12:10:05]   Session: ses_xyz789
[12:10:05]   Prompt sent, agent executing...
[12:10:07]   Running bash commands (5 total)
[12:10:12]   File operations (3 total)
[12:10:15]   Agent thinking...
[12:10:18]   Deep reasoning...
[12:12:18]   ✓ Completed: project-details (133s)
[12:12:18]     Tools: 45, Bash: 20, Files: 8
```

### 5. Log Capture

**Every session saves full event log:**

```
workspace/
├── session-log.json    ← Full event stream (1000+ events)
├── prompt.md
├── README.md
└── shared/
```

**Use for debugging:**
```bash
# Count events
jq 'length' session-log.json

# Find errors
jq '.[] | select(.type == "session.error")' session-log.json

# Count tool usage
jq '[.[] | select(.type == "message.part.updated") | 
    select(.event.properties.part.type == "tool")] | length' session-log.json
```

---

## Requirements

- **Node.js** - Orchestrator
- **Python 3** - Stream monitor
- **OpenCode Server** - Port 4096
- **Neo4j** - 3 databases (ports 7687, 7688, 7690)

---

## Tips

1. **Always run stream.py first** - See exactly what's happening
2. **Test single task first** - Before running full orchestrator
3. **Check Neo4j connections** - Most failures are auth issues
4. **Keep schemas simple** - Avoid "grammar too complex" errors
5. **Use event stream** - Don't poll for completion

---

## Example Session

**Terminal 1:**
```bash
cd /app/opecodeagents-lucky-demo
python3 stream.py
```

**Terminal 2:**
```bash
cd /app/opecodeagents-lucky-demo
node run-single-task.js project-details
```

**Output:**
```
[12:10:05 AM] Step 1: Spawning workspace...
[12:10:05 AM]   ✓ Workspace created
[12:10:05 AM] Step 2: Creating opencode session...
[12:10:05 AM]   ✓ Session created: ses_abc123
[12:10:05 AM] Step 3: Subscribing to event stream...
[12:10:05 AM]   ✓ Listening for session.idle event
[12:10:05 AM] Step 4: Sending prompt to agent...
[12:10:05 AM]   ✓ Prompt sent
[12:10:05 AM]   ✓ Agent is now executing...
[12:10:05 AM] Step 5: Waiting for completion...
[12:12:18 AM]   ✓ Task completed in 133s
SUCCESS!
```

---

## Support

For issues:
- Check stream.py output
- Review workspace files in `/app/opencode-workspace/agent-sessions/`
- Test Neo4j connections
- Verify opencode server is running
