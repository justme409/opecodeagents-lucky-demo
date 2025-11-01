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
- Project, Document, and User management
- Work Breakdown Structure (WBS) and Location Breakdown Structure (LBS)
- Management Plans (ITP, EMP, OHSMP, PQP, QSE)
- Quality Control (NCRs, Test Requests, Samples)
- Progress tracking and approvals

### AI Prompts
- Document metadata extraction
- WBS and LBS extraction from documents
- Management plan generation (ITP, EMP, OHSMP, PQP, QSE)
- Standards extraction
- Project details extraction

## Getting Started

1. Review the `SETUP_COMPLETE.md` for detailed setup information
2. Check `shared/connection details.md` for database connection configuration
3. Use `spawn-agent.sh` to launch AI agents for specific tasks
4. Refer to `shared/instructions.md` for operational guidelines

## Documentation

- **SETUP_COMPLETE.md**: Complete setup and configuration guide
- **shared/instructions.md**: Agent operation instructions
- **shared/Exploration guide.md**: Guide for exploring the system
- **schemas/neo4j/README.md**: Database schema documentation
- **schemas/neo4j/RELATIONSHIPS.md**: Entity relationship documentation

## License

See LICENSE file for details.

