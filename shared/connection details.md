# Neo4j Database Connection Details

## Overview

Three Neo4j databases are available:

1. **Standards** - Reference specifications (READ ONLY)
2. **Project Docs** - Project documents (READ ONLY)
3. **Generated** - Your output destination (READ & WRITE)

---

## Database 1: Standards

**Purpose:** Reference specifications, standards, and test methods

**Connection:**
```
URI:      neo4j://localhost:7687
Username: neo4j
Password: 5b01beec33ac195e1e75acb6d90b4944
Database: neo4j
```

**Access:** READ ONLY

**Contains:**
- Australian Standards (AS, AS/NZS)
- State specifications (MRTS, MRS, QA Specs)
- Test methods (AS 1012, AS 1289, AS 1141)
- International standards (ISO, ASTM)

**Quick Test:**
```bash
cypher-shell -a neo4j://localhost:7687 -u neo4j -p 5b01beec33ac195e1e75acb6d90b4944
```

---

## Database 2: Project Docs

**Purpose:** Project-specific construction documents and extracted data

**Connection:**
```
URI:      neo4j://localhost:7688
Username: neo4j
Password: 27184236e197d5f4c36c60f453ebafd9
Database: neo4j
```

**Access:** READ ONLY

**Contains:**
- Project documents (specs, contracts, reports)
- Document metadata and content
- Project requirements
- Extracted project information

**Quick Test:**
```bash
cypher-shell -a neo4j://localhost:7688 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

---

## Database 3: Generated

**Purpose:** AI-generated output and results destination

**Connection:**
```
URI:      neo4j://localhost:7690
Username: neo4j
Password: 27184236e197d5f4c36c60f453ebafd9
Database: neo4j
```

**Access:** READ & WRITE

**Contains:**
- Your generated output (ITPs, WBS, LBS, etc.)
- Processed and structured data
- All agent-created nodes and relationships

**Quick Test:**
```bash
cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```


