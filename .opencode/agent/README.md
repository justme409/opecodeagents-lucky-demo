# PQP Generation v2 - 3-Agent Architecture

This is a **test implementation** of a simplified, modular agent architecture for PQP generation. It's completely separate from the existing agents and won't affect them.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  @pqp-orchestrator-v2                   │
│                    (Coordinator)                        │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Research │    │  Writer  │    │ Executor │
    │  Agent   │    │  Agent   │    │  Agent   │
    └──────────┘    └──────────┘    └──────────┘
         │               │               │
         ▼               ▼               ▼
    research.json   content.json    Neo4j DB
```

## Agents

### 1. pqp-researcher-v2.md
**Purpose:** Extract data from Neo4j databases

**Input:** Project ID

**Output:** `pqp-research-data.json`

**What it does:**
- Queries 4 Neo4j databases (Standards, Project Docs, IMS, Generated)
- Extracts project details, quality requirements, ITPs, standards, corporate procedures
- Outputs structured JSON with all research data

**Key features:**
- All database connections baked into the prompt
- Clear step-by-step instructions
- Specific output format
- No content generation - just data extraction

### 2. pqp-writer-v2.md
**Purpose:** Generate detailed PQP content

**Input:** `pqp-research-data.json`

**Output:** `pqp-content.json`

**What it does:**
- Reads research data
- Generates comprehensive, practitioner-level content (500-1000+ words per section)
- Follows jurisdiction-specific template
- References corporate procedures
- Outputs structured JSON with HTML content

**Key features:**
- All PQP templates and examples baked into the prompt
- NO database thinking - pure content generation
- Detailed quality requirements (no one-sentence stubs)
- HTML formatting

### 3. pqp-executor-v2.md
**Purpose:** Write data to Neo4j

**Input:** `pqp-content.json`

**Output:** Neo4j nodes and relationships

**What it does:**
- Reads content JSON
- Creates Cypher script using APOC pattern
- Executes against Generated DB (port 7690)
- Verifies the write

**Key features:**
- All Cypher instructions and schema baked into the prompt
- APOC pattern examples
- JSON serialization handling
- Verification queries

### 4. pqp-orchestrator-v2.md
**Purpose:** Coordinate the 3 agents

**Input:** Project ID

**Output:** Complete PQP in Neo4j

**What it does:**
- Calls agents in sequence
- Passes data between them
- Verifies each phase
- Reports completion

## Key Differences from v1

| Aspect | v1 (Original) | v2 (New) |
|--------|---------------|----------|
| **Prompts** | External files in workspace | Baked into agent definitions |
| **Agent count** | 3 subagents + orchestrator | Same, but self-contained |
| **File reading** | Agents read shared/*.md files | All instructions in agent prompt |
| **Database connections** | In connection-details.md | In each agent prompt |
| **Schema** | In AGENT_SCHEMA.md | Simplified in executor prompt |
| **Examples** | In pqp-generation.md | In writer prompt |
| **Complexity** | High (many files to read) | Low (everything in one place) |

## Benefits

1. **Self-contained:** Each agent has everything it needs
2. **Simpler:** No external file dependencies
3. **Clearer:** Single source of truth per agent
4. **Testable:** Easy to modify and test independently
5. **Isolated:** Won't affect existing agents

## How to Run

### Option 1: Using the test script
```bash
cd /app/opecodeagents-lucky-demo
node run-pqp-v2-test.js b168e975-2531-527f-9abd-19cb8f502fe0
```

### Option 2: Manual orchestrator call
```bash
# In OpenCode, call the orchestrator directly:
@pqp-orchestrator-v2 Generate PQP for project b168e975-2531-527f-9abd-19cb8f502fe0
```

## Expected Output

After successful execution, you should have:

1. **In workspace:**
   - `pqp-research-data.json` (research data)
   - `pqp-content.json` (detailed content)
   - `pqp-insert.cypher` (Cypher script)

2. **In Neo4j (port 7690):**
   - 1 ManagementPlan node (type: "PQP")
   - 10-12 DocumentSection nodes
   - Relationships: BELONGS_TO_PROJECT, HAS_SECTION

## Verification Queries

```bash
# Check plan exists
echo "MATCH (mp:ManagementPlan {type: 'PQP'}) RETURN mp.projectId, mp.title, mp.version;" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 --format plain

# Count sections
echo "MATCH (mp:ManagementPlan {type: 'PQP'})-[:HAS_SECTION]->(s) RETURN count(s) AS sectionCount;" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 --format plain

# Check relationships
echo "MATCH (mp:ManagementPlan {type: 'PQP'})-[:BELONGS_TO_PROJECT]->(p:Project) RETURN p.projectName;" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 --format plain
```

## Troubleshooting

### Agent not found
Make sure you're calling the v2 agents:
- `@pqp-researcher-v2` (not `@pqp-researcher`)
- `@pqp-writer-v2` (not `@pqp-writer`)
- `@pqp-executor-v2` (not `@pqp-executor`)

### Research phase fails
- Check database connections (ports 7687, 7688, 7689, 7690)
- Verify project exists in Generated DB

### Writer phase produces stub content
- Check that research data is complete
- Verify the writer agent has the detailed examples in its prompt

### Executor phase fails
- Check Cypher syntax in generated script
- Verify APOC is available: `CALL apoc.help('cypher.runMany')`
- Check for variable scoping issues

## Next Steps

If this works well, we can:

1. Create similar v2 agents for EMP, OHSMP, ITP generation
2. Extract common patterns into reusable agent templates
3. Build a generic orchestrator that works for any plan type
4. Add validation and quality checks between phases

## Files

- `pqp-researcher-v2.md` - Research agent definition
- `pqp-writer-v2.md` - Writer agent definition
- `pqp-executor-v2.md` - Executor agent definition
- `pqp-orchestrator-v2.md` - Orchestrator agent definition
- `README.md` - This file
- `../run-pqp-v2-test.js` - Test runner script

