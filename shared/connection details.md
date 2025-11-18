# Neo4j Database Connection Details

## Overview

Four Neo4j databases are available:

1. **Standards** - Reference specifications (READ ONLY)
2. **Project Docs** - Project documents (READ ONLY)
3. **IMS/QSE System** - Corporate management system (READ ONLY)
4. **Generated** - Your output destination (READ & WRITE)

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

## Database 3: IMS/QSE System

**Purpose:** Corporate Integrated Management System (Quality, Safety, Environmental)

**Connection:**
```
URI:      neo4j://localhost:7689
Username: neo4j
Password: ims_qse_2024_secure
Database: neo4j
```

**Access:** READ ONLY (for plan generation agents)

**Contains:**
- Corporate QSE procedures and policies
- ISO 9001/14001/45001 compliant procedures
- Form templates and work instructions
- Registers (Risk, NCR, Compliance, Training, etc.)
- Management system documentation
- 49 QSE items across 20+ categories

**Node Types:**
- `:QSEItem` - Procedures, Policies, Registers, Templates, Forms, Plans

**Key Properties:**
- `id` - QSE item identifier (e.g., QSE-8.1-PROC-01)
- `title` - Full title of the item
- `type` - Procedure, Policy, Register, Template, Form, etc.
- `category` - Functional category (Quality, Safety, Environmental, etc.)
- `path` - URL path for linking (e.g., /ims/procedures/ncr-procedure)
- `isoClause` - Related ISO clause (e.g., 4.1, 8.1, 10.2)
- `html` - Full HTML content of the item
- `keywords` - Searchable keywords
- `status` - approved, draft, superseded

**Relationships:**
- `(:QSEItem)-[:REFERENCES]->(:QSEItem)` - Cross-references between items

**Quick Test:**
```bash
cypher-shell -a neo4j://localhost:7689 -u neo4j -p ims_qse_2024_secure
```

**Example Queries:**
```cypher
// Find all procedures
MATCH (item:QSEItem {type: 'Procedure'})
RETURN item.id, item.title
ORDER BY item.id

// Find items related to quality
MATCH (item:QSEItem)
WHERE 'quality' IN item.keywords
RETURN item.id, item.title, item.type

// Find items by ISO clause
MATCH (item:QSEItem {isoClause: '8.1'})
RETURN item.id, item.title, item.type
```

---

## Database 4: Generated

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


