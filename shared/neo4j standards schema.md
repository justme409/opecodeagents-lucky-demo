# Neo4j Standards Database Schema

**Database:** Standards (Port 7687)  
**Purpose:** Reference specifications & standards (MRTS, MRS, test methods, Australian Standards)  
**Access:** READ ONLY

## Node Labels

The Standards database contains the following node types:

### Primary Nodes

- **Chunk** - Text chunks from documents for semantic search and retrieval
- **Clause** - Individual clauses from standards and specifications
- **Document** - Standard documents and specifications
- **DocumentSection** - Sections within standard documents
- **Figure** - Figures and diagrams from standards
- **Material** - Material specifications and requirements
- **Standard** - Australian Standards, international standards
- **Table** - Tables from standard documents
- **TestRequirement** - Test requirements and acceptance criteria

### System Nodes

- **__Entity__** - System entity nodes for knowledge graph
- **__KGBuilder__** - Knowledge graph builder nodes (internal system use)

## Relationship Types

The following relationships connect nodes in the Standards database:

- **HAS_FIGURE** - Document/Section has a figure
- **HAS_SECTION** - Document has a section
- **HAS_TABLE** - Document/Section has a table
- **NEXT_SECTION** - Sequential section ordering
- **PARENT_OF** - Hierarchical parent-child relationships

## Common Query Patterns

### Finding Standards

```cypher
// Find standard by code
MATCH (s:Standard)
WHERE s.code = 'AS 3600'
RETURN s

// Find standards by jurisdiction
MATCH (s:Standard)
WHERE s.jurisdiction = 'QLD' OR s.jurisdiction = 'National'
RETURN s

// Search standards by name
MATCH (s:Standard)
WHERE s.name CONTAINS 'concrete'
RETURN s
```

### Finding Document Sections

```cypher
// Get all sections of a document
MATCH (d:Document)-[:HAS_SECTION]->(sec:DocumentSection)
WHERE d.id = $documentId
RETURN sec
ORDER BY sec.sectionNumber

// Get hierarchical structure
MATCH (parent:DocumentSection)-[:PARENT_OF*]->(child:DocumentSection)
WHERE parent.documentId = $documentId
  AND parent.parentId IS NULL
RETURN parent, collect(child)
```

### Finding Clauses

```cypher
// Find clauses in a section
MATCH (sec:DocumentSection)-[:CONTAINS]->(clause:Clause)
WHERE sec.id = $sectionId
RETURN clause

// Search clause content
MATCH (clause:Clause)
WHERE clause.content CONTAINS $searchTerm
RETURN clause
LIMIT 20
```

### Finding Test Requirements

```cypher
// Get test requirements for a work type
MATCH (tr:TestRequirement)
WHERE tr.workType = $workType
  AND (tr.jurisdiction = $jurisdiction OR tr.jurisdiction = 'National')
RETURN tr

// Find test methods
MATCH (tr:TestRequirement)
WHERE tr.testMethod CONTAINS 'AS 1012'
RETURN tr
```

### Finding Tables and Figures

```cypher
// Get tables from a document
MATCH (d:Document)-[:HAS_TABLE]->(t:Table)
WHERE d.id = $documentId
RETURN t

// Get figures from a section
MATCH (sec:DocumentSection)-[:HAS_FIGURE]->(f:Figure)
WHERE sec.id = $sectionId
RETURN f
```

## Typical Node Properties

### Document Nodes

Typical properties (may vary by document):
- `id` - Unique identifier
- `title` - Document title
- `code` - Document code (e.g., "MRTS04", "AS 3600")
- `jurisdiction` - QLD, NSW, VIC, SA, WA, TAS, NT, ACT, or National
- `version` - Document version or year
- `type` - Document type (standard, specification, etc.)

### DocumentSection Nodes

Typical properties:
- `id` - Unique identifier
- `documentId` - Parent document ID
- `parentId` - Parent section ID (null for top-level)
- `sectionNumber` - Section number (e.g., "3.2.1")
- `title` - Section title
- `content` - Section content text
- `level` - Hierarchy level

### Clause Nodes

Typical properties:
- `id` - Unique identifier
- `documentId` - Parent document ID
- `sectionId` - Parent section ID
- `clauseNumber` - Clause number
- `type` - Clause type (requirement, test, material, etc.)
- `content` - Clause text
- `requirement` - Specific requirement text
- `acceptanceCriteria` - Acceptance criteria

### Standard Nodes

Typical properties:
- `id` - Unique identifier
- `code` - Standard code (e.g., "AS 3600", "ISO 9001")
- `name` - Full standard name
- `jurisdiction` - Applicable jurisdiction
- `year` - Publication year
- `status` - Current, superseded, etc.

### TestRequirement Nodes

Typical properties:
- `id` - Unique identifier
- `workType` - Type of work (earthworks, concrete, steel, etc.)
- `testMethod` - Test method standard (e.g., "AS 1012.3.1")
- `testName` - Name of test
- `frequency` - Testing frequency
- `acceptanceCriteria` - Pass/fail criteria
- `jurisdiction` - Applicable jurisdiction

## Jurisdiction Codes

Standards are organized by Australian state/territory:

- **QLD** - Queensland
- **NSW** - New South Wales
- **VIC** - Victoria
- **SA** - South Australia
- **WA** - Western Australia
- **TAS** - Tasmania
- **NT** - Northern Territory
- **ACT** - Australian Capital Territory
- **National** - Australia-wide (applicable to all jurisdictions)

## Usage Notes

### Jurisdiction Filtering

Always filter by jurisdiction when querying standards:

```cypher
MATCH (n:Standard)
WHERE n.jurisdiction = $projectJurisdiction OR n.jurisdiction = 'National'
RETURN n
```

### Semantic Search

The database includes Chunk nodes for semantic search. These are optimized for vector similarity queries and can be used to find relevant sections based on meaning rather than exact text matching.

### Knowledge Graph

__Entity__ and __KGBuilder__ nodes are part of the internal knowledge graph system. These are generated by the graph builder and support advanced querying and relationship discovery.

## Best Practices

1. **Always filter by jurisdiction** when querying standards
2. **Use LIMIT** on exploratory queries to avoid overwhelming results
3. **Follow relationships** to discover connected information
4. **Search Chunks** for semantic similarity
5. **Check __Entity__ nodes** for extracted entities and relationships
6. **Respect READ ONLY access** - do not attempt writes to this database

