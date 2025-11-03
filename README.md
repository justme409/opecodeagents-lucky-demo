# OpeCodeAgents Lucky Demo

This repository contains the OpeCodeAgents Lucky Demo project - a comprehensive system for managing construction project workflows with AI-powered agents.

## Overview

This project provides:
- **Agent Schemas**: Neo4j graph database schemas for construction project entities
- **AI Prompts**: Specialized prompts for extracting and generating construction documentation
- **Shared Resources**: Connection details, instructions, and exploration guides
- **Agent Spawner**: Shell script for spawning and managing AI agents

## Structure

```
opecodeagents-lucky-demo/
├── schemas/neo4j/          # Neo4j database schemas for all entities
├── prompts/                # AI agent prompts for various tasks
├── shared/                 # Shared documentation and connection details
├── spawn-agent.sh          # Agent spawning utility
└── manifest.json           # Project manifest and configuration
```

## Key Features

### Schemas
**Master Schema** (`schemas/neo4j/master-schema.ts`):
- 26 comprehensive entity types in a single source of truth
- Business key architecture (no UUIDs)
- Agent metadata (which agent creates each entity)
- Page metadata (where each entity is displayed)
- Relationship definitions (incoming/outgoing)
- Full TypeScript + Zod validation

**Entity Coverage**:
- Quality Core: Lot, ITP, Inspection Points, NCR, Tests, Materials
- Project Structure: WBS, LBS, Work Types, Area Codes
- Documents & Records: Documents, Photos, Management Plans
- Progress & Payment: Schedule Items, Claims, Variations, Quantities
- Reference Data: Standards, Suppliers, Laboratories
- Infrastructure: Project, Users

### AI Prompts
- Document metadata extraction
- WBS and LBS extraction from documents
- Management plan generation (ITP, EMP, OHSMP, PQP, QSE)
- Standards extraction
- Project details extraction

## Getting Started

### Quick Start - Run All Tasks Automatically

```bash
cd /app/opecodeagents-lucky-demo
./run-orchestrator.sh
```

The orchestrator will execute all 10 agent tasks in the correct order with parallel execution where possible.

### Manual Task Execution

1. Review the `SETUP_COMPLETE.md` for detailed setup information
2. Check `shared/connection details.md` for database connection configuration
3. Use `spawn-agent.sh` to launch AI agents for specific tasks
4. Refer to `shared/instructions.md` for operational guidelines

## Documentation

- **schemas/neo4j/MASTER_SCHEMA_GUIDE.md**: Comprehensive guide for using the master schema
- **schemas/neo4j/MIGRATION_SUMMARY.md**: Schema migration and consolidation summary
- **schemas/neo4j/master-schema.ts**: Single source of truth for all entities
- **schemas/neo4j/agent-manifest.ts**: Agent-to-schema mapping and helper functions
- **shared/instructions.md**: Agent operation instructions
- **shared/Exploration guide.md**: Guide for exploring the system

## License

See LICENSE file for details.

