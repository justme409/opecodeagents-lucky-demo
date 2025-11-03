# OpenCode Agent Orchestrator Guide

**Complete guide to running all agent tasks in the correct order with parallel execution**

---

## Overview

The orchestrator manages the execution of all 10 agent tasks, handling:
- ✅ **Task dependencies** - Ensures tasks run in the correct order
- ✅ **Parallel execution** - Runs independent tasks simultaneously
- ✅ **Dynamic ITP generation** - Extracts ITP list from PQP, generates in parallel
- ✅ **Progress monitoring** - Real-time status updates
- ✅ **Error handling** - Retries and graceful failures
- ✅ **Comprehensive logging** - Detailed execution reports

---

## Quick Start

### Run the Orchestrator

```bash
cd /app/opecodeagents-lucky-demo
./run-orchestrator.sh
```

That's it! The orchestrator will:
1. Execute all tasks in dependency order
2. Run parallel tasks simultaneously
3. Extract ITP list from PQP
4. Generate all ITPs in parallel
5. Provide real-time progress updates
6. Generate a final report

---

## Task Execution Order

### Phase 1: Foundation (Parallel)
- **project-details** - Extract project metadata
- **standards-extraction** - Extract standards
- **document-metadata** - Extract document metadata

### Phase 2: Structure
- **wbs-extraction** - Work Breakdown Structure (depends on project-details)

### Phase 3: Location
- **lbs-extraction** - Location Breakdown Structure (depends on wbs-extraction)

### Phase 4: Management Plans (Parallel where possible)
- **pqp-generation** - Project Quality Plan (depends on wbs, standards)
- **emp-generation** - Environmental Plan (parallel with PQP)
- **ohsmp-generation** - OHS Plan (parallel with PQP)
- **qse-generation** - QSE System (parallel with PQP)

### Phase 5: ITPs (Dynamic Parallel)
- **itp-generation** - Extracts ITP list from PQP, generates all in parallel

---

## How It Works

### 1. Dependency Management

The orchestrator uses a task graph:

```javascript
{
  'project-details': {
    dependencies: [],  // No dependencies, runs first
    parallel: false,
  },
  'wbs-extraction': {
    dependencies: ['project-details'],  // Waits for project-details
    parallel: false,
  },
  'emp-generation': {
    dependencies: ['project-details', 'wbs-extraction'],
    parallel: true,  // Can run alongside other parallel tasks
  },
  // ... more tasks
}
```

### 2. Parallel Execution

Tasks marked as `parallel: true` run simultaneously if their dependencies are met:

```
Phase 1:
  ├─ project-details    ─┐
  ├─ standards          ─┼─ Run together
  └─ document-metadata  ─┘

Phase 4:
  ├─ emp-generation     ─┐
  ├─ ohsmp-generation   ─┼─ Run together
  └─ qse-generation     ─┘
```

### 3. Dynamic ITP Generation

The ITP task is special:

```
1. PQP completes
2. Orchestrator queries Generated DB
3. Extracts list of required ITPs from PQP
4. Spawns multiple ITP agents (one per ITP)
5. Generates all ITPs in parallel (max 5 concurrent)
```

Example:
```
PQP contains: ["Concrete ITP", "Steel ITP", "Formwork ITP"]

Orchestrator spawns:
  ├─ Agent 1: Concrete ITP    ─┐
  ├─ Agent 2: Steel ITP       ─┼─ Run in parallel
  └─ Agent 3: Formwork ITP    ─┘
```

### 4. Workspace Management

Each task gets its own workspace:

```
/app/opencode-workspace/agent-sessions/
├── 20251101-143022-abc123/  ← project-details
├── 20251101-143045-def456/  ← wbs-extraction
├── 20251101-143120-ghi789/  ← pqp-generation
├── 20251101-143145-jkl012/  ← ITP: Concrete Works
├── 20251101-143146-mno345/  ← ITP: Steel Reinforcement
└── ...
```

Each workspace has:
- Unique OpenCode server (different port)
- All required files (prompt, schemas, shared docs)
- Independent execution environment

---

## Configuration

### Environment Variables

```bash
# OpenCode server configuration
export OPENCODE_PORT=4096      # Starting port (increments for each task)
export OPENCODE_HOST=127.0.0.1 # Server hostname

# Run orchestrator
./run-orchestrator.sh
```

### Advanced Configuration

Edit `orchestrator.js` to customize:

```javascript
const CONFIG = {
  OPENCODE_PORT: 4096,           // Starting port
  MAX_PARALLEL: 5,               // Max parallel ITP generations
  RETRY_ATTEMPTS: 2,             // Retry failed tasks
  TIMEOUT_MS: 300000,            // 5 minutes per task
  WORKSPACE_BASE: '/app/...',    // Workspace directory
  LOG_DIR: '/app/...',           // Log directory
};
```

---

## Monitoring Execution

### Real-Time Output

The orchestrator provides color-coded output:

```
[2025-11-01T14:30:22.123Z] Starting task: project-details
[2025-11-01T14:30:23.456Z] ✓ Workspace created: 20251101-143022-abc123
[2025-11-01T14:30:25.789Z] ✓ Server started on port 4097
[2025-11-01T14:30:26.012Z] Executing task: project-details
[2025-11-01T14:32:45.678Z] ✓ Task completed: project-details
```

### Log Files

Execution logs are saved to:
```
/app/opencode-workspace/orchestrator-logs/
└── orchestration-1730471422123.json
```

Log format:
```json
{
  "startTime": 1730471422123,
  "endTime": 1730471892456,
  "duration": 470.333,
  "taskStates": {
    "project-details": "completed",
    "wbs-extraction": "completed",
    "itp-generation": "completed"
  },
  "taskResults": {
    "project-details": {
      "success": true,
      "sessionId": "ses_abc123",
      "workspacePath": "/app/...",
      "port": 4097
    },
    "itp-generation": {
      "success": true,
      "itpResults": [
        { "itpName": "Concrete ITP", "success": true },
        { "itpName": "Steel ITP", "success": true }
      ],
      "count": 2
    }
  }
}
```

---

## Final Report

After completion, you'll see:

```
╔════════════════════════════════════════════════════════════════╗
║          Orchestration Complete - Final Report                ║
╚════════════════════════════════════════════════════════════════╝

Total execution time: 470.33s

Tasks completed: 10/10
Tasks failed: 0/10

Task results:
  ✓ project-details: completed
  ✓ standards-extraction: completed
  ✓ document-metadata: completed
  ✓ wbs-extraction: completed
  ✓ lbs-extraction: completed
  ✓ pqp-generation: completed
  ✓ emp-generation: completed
  ✓ ohsmp-generation: completed
  ✓ qse-generation: completed
  ✓ itp-generation: completed
    Generated 5 ITPs

Report saved to: /app/opencode-workspace/orchestrator-logs/orchestration-1730471892456.json
```

---

## Troubleshooting

### Task Fails

If a task fails:
1. Check the error message in the output
2. Review the log file
3. Check the workspace directory for that task
4. Review event logs: `/tmp/opencode-*.log`

### Server Port Conflicts

If you get port conflicts:
```bash
# Use a different starting port
export OPENCODE_PORT=5000
./run-orchestrator.sh
```

### Timeout Issues

If tasks timeout:
1. Edit `orchestrator.js`
2. Increase `TIMEOUT_MS`:
```javascript
TIMEOUT_MS: 600000,  // 10 minutes
```

### Memory Issues

If running out of memory with parallel tasks:
1. Reduce `MAX_PARALLEL`:
```javascript
MAX_PARALLEL: 3,  // Fewer parallel ITPs
```

---

## Advanced Usage

### Run Specific Tasks Only

Edit `orchestrator.js` and comment out tasks:

```javascript
const TASK_GRAPH = {
  'project-details': { ... },
  // 'wbs-extraction': { ... },  // Skip this
  'lbs-extraction': { ... },
};
```

### Custom Task Order

Modify dependencies:

```javascript
'emp-generation': {
  dependencies: ['project-details'],  // Remove wbs dependency
  parallel: true,
},
```

### Dry Run Mode

Add to `orchestrator.js`:

```javascript
const DRY_RUN = true;  // Don't actually execute

async executeTask(taskName) {
  if (DRY_RUN) {
    log(`[DRY RUN] Would execute: ${taskName}`, 'yellow');
    this.taskStates[taskName] = 'completed';
    return;
  }
  // ... normal execution
}
```

---

## Integration with Testing Suite

Monitor orchestration with the testing suite:

**Terminal 1** (Monitor):
```bash
cd /app/opencode-server-testing
./stream-monitor.sh
```

**Terminal 2** (Orchestrator):
```bash
cd /app/opecodeagents-lucky-demo
./run-orchestrator.sh
```

Watch all events in real-time!

---

## Expected Execution Time

Approximate times (depends on data size):

| Task | Est. Time | Notes |
|------|-----------|-------|
| project-details | 2-5 min | Depends on document size |
| standards-extraction | 1-3 min | Parallel with above |
| document-metadata | 1-3 min | Parallel with above |
| wbs-extraction | 3-7 min | Depends on scope |
| lbs-extraction | 3-7 min | Depends on locations |
| pqp-generation | 5-10 min | Complex generation |
| emp-generation | 4-8 min | Parallel with PQP |
| ohsmp-generation | 4-8 min | Parallel with PQP |
| qse-generation | 3-6 min | Parallel with PQP |
| itp-generation | 10-30 min | Depends on ITP count |

**Total**: ~30-90 minutes (with parallelization)

---

## Output Validation

After orchestration, validate outputs:

```bash
# Connect to Generated DB
cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9

# Check node counts
MATCH (n:Project) RETURN count(n);
MATCH (n:WBSNode) RETURN count(n);
MATCH (n:LBSNode) RETURN count(n);
MATCH (n:ManagementPlan) RETURN count(n);
MATCH (n:ITPTemplate) RETURN count(n);

# Check relationships
MATCH ()-[r]->() RETURN type(r), count(r);
```

---

## Best Practices

### 1. Clean Database Before Running

```cypher
// Connect to Generated DB
MATCH (n) DETACH DELETE n;
```

### 2. Monitor Resource Usage

```bash
# Watch memory and CPU
watch -n 1 'ps aux | grep opencode'
```

### 3. Save Logs

```bash
# Redirect output to file
./run-orchestrator.sh 2>&1 | tee orchestration-$(date +%Y%m%d-%H%M%S).log
```

### 4. Backup Generated Data

```bash
# After successful run
neo4j-admin dump --database=generated --to=/backup/generated-$(date +%Y%m%d).dump
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator                              │
│  - Manages task dependencies                                 │
│  - Spawns agent workspaces                                   │
│  - Starts OpenCode servers                                   │
│  - Monitors execution                                        │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─► spawn-agent.sh ─► Creates workspace
               │
               ├─► OpenCode Server ─► Runs in workspace
               │
               └─► Event Stream ─► Monitors completion
                   
┌─────────────────────────────────────────────────────────────┐
│                    Task Execution                            │
│                                                              │
│  1. Spawn workspace (spawn-agent.sh)                         │
│  2. Start server (opencode serve)                            │
│  3. Create session (POST /session)                           │
│  4. Send prompt (POST /session/{id}/message)                 │
│  5. Stream events (GET /event)                               │
│  6. Wait for session.idle                                    │
│  7. Mark complete                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Files

- **orchestrator.js** - Main orchestrator logic
- **run-orchestrator.sh** - Simple runner script
- **ORCHESTRATOR_GUIDE.md** - This file

---

## Next Steps

1. **Run a test**: `./run-orchestrator.sh`
2. **Monitor execution**: Use stream-monitor.sh
3. **Validate output**: Query Generated DB
4. **Review logs**: Check orchestrator-logs/
5. **Iterate**: Adjust configuration as needed

---

**Ready to orchestrate?** Run `./run-orchestrator.sh` now! 🚀

---

**Last Updated**: November 1, 2025  
**Version**: 1.0  
**Status**: Production Ready

