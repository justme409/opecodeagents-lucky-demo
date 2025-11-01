# Neo4j Database Exploration Guide

## Query Strategy

When exploring the Neo4j databases, follow this systematic approach to efficiently discover and retrieve the information you need.

## Start Broad, Then Narrow Down

### Phase 1: Initial Discovery

Begin with broad exploratory queries to understand what data exists:

```cypher
// See all node labels in the database
CALL db.labels()

// See all relationship types
CALL db.relationshipTypes()

// Count nodes by label
MATCH (n)
RETURN labels(n)[0] AS label, count(n) AS count
ORDER BY count DESC

// Sample a few nodes of each type
MATCH (n:LabelName)
RETURN n
LIMIT 5
```

### Phase 2: Understand Structure

Once you know what labels exist, understand their structure:

```cypher
// See all properties for a label
MATCH (n:LabelName)
RETURN DISTINCT keys(n)
LIMIT 1

// Get property types and sample values
MATCH (n:LabelName)
WITH n LIMIT 10
UNWIND keys(n) AS key
RETURN DISTINCT key, collect(DISTINCT n[key])[0..3] AS sampleValues

// Understand relationships for a node type
MATCH (n:LabelName)-[r]-(m)
RETURN type(r) AS relationshipType, 
       labels(m)[0] AS connectedNodeType,
       count(*) AS occurrences
ORDER BY occurrences DESC
```

### Phase 3: Apply Filters

Now narrow down to relevant data:

```cypher
// Filter by property value
MATCH (n:LabelName)
WHERE n.property = $value
RETURN n

// Filter by multiple criteria
MATCH (n:LabelName)
WHERE n.property1 = $value1
  AND n.property2 IN $valueList
  AND n.property3 IS NOT NULL
RETURN n

// Filter with pattern matching
MATCH (n:LabelName)
WHERE n.textProperty CONTAINS $searchTerm
  OR n.textProperty STARTS WITH $prefix
RETURN n
```

### Phase 4: Follow Relationships

Explore connected data:

```cypher
// Direct relationships
MATCH (n:LabelName {id: $id})-[r:RELATIONSHIP_TYPE]->(m)
RETURN n, r, m

// Multi-hop relationships
MATCH (n:LabelName {id: $id})-[*1..3]-(m)
RETURN DISTINCT labels(m)[0], count(m)

// Specific path patterns
MATCH path = (a:LabelA)-[:REL1]->(b:LabelB)-[:REL2]->(c:LabelC)
WHERE a.property = $value
RETURN path
```

## Jurisdiction-Specific Queries

Many construction standards and specifications are jurisdiction-specific. Always filter by jurisdiction when relevant.

### Available Jurisdictions

- **QLD** - Queensland
- **NSW** - New South Wales
- **VIC** - Victoria
- **SA** - South Australia
- **WA** - Western Australia
- **TAS** - Tasmania
- **NT** - Northern Territory
- **ACT** - Australian Capital Territory
- **National** - Australia-wide (applies to all jurisdictions)

### Jurisdiction Filtering Patterns

```cypher
// Get standards for specific jurisdiction
MATCH (s:Standard)
WHERE s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National'
RETURN s

// Get jurisdiction-specific specifications
MATCH (spec:Specification)
WHERE spec.jurisdiction = $jurisdiction
RETURN spec

// Include national standards as fallback
MATCH (s:Standard)
WHERE s.jurisdiction IN [$jurisdiction, 'National']
RETURN s
ORDER BY 
  CASE s.jurisdiction 
    WHEN $jurisdiction THEN 0 
    ELSE 1 
  END
```

### Jurisdiction Priority

When querying:

1. **First** - Look for jurisdiction-specific items
2. **Second** - Include National/Australia-wide items
3. **Prefer** - Jurisdiction-specific over national if both exist

## Common Query Patterns

### Finding Standards

```cypher
// Find standard by code
MATCH (s:Standard)
WHERE s.code = $standardCode
  AND (s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National')
RETURN s

// Search standards by keyword
MATCH (s:Standard)
WHERE s.name CONTAINS $keyword
  AND (s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National')
RETURN s

// Get all standards for a work type
MATCH (s:Standard)
WHERE s.workType = $workType
  AND (s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National')
RETURN s
```

### Finding Specifications

```cypher
// Get specifications by section
MATCH (spec:Specification)
WHERE spec.sectionNumber = $sectionNumber
  AND spec.jurisdiction = $jurisdiction
RETURN spec

// Find specification clauses
MATCH (spec:Specification)-[:HAS_CLAUSE]->(clause:Clause)
WHERE spec.id = $specId
RETURN clause

// Search specification content
MATCH (clause:Clause)
WHERE clause.content CONTAINS $searchTerm
  AND clause.jurisdiction = $jurisdiction
RETURN clause
LIMIT 20
```

### Finding Project Documents

```cypher
// Get all project documents
MATCH (d:Document)
WHERE d.project_id = $projectId
RETURN d

// Get documents by type
MATCH (d:Document)
WHERE d.project_id = $projectId
  AND d.docType = $documentType
RETURN d

// Get documents with specific content
MATCH (d:Document)
WHERE d.project_id = $projectId
  AND d.content CONTAINS $searchTerm
RETURN d

// Get document relationships
MATCH (d:Document {project_id: $projectId})-[r]-(related)
RETURN d, type(r), labels(related)[0], count(related)
```

## Optimizing Queries

### Use Indexes

Take advantage of database indexes:

```cypher
// Indexed properties are faster
// Usually: id, code, name, jurisdiction

// Good - uses index
MATCH (s:Standard {code: 'AS 3600'})
RETURN s

// Less efficient - full scan
MATCH (s:Standard)
WHERE s.description CONTAINS 'concrete'
RETURN s
```

### Limit Results

Always limit exploratory queries:

```cypher
// Limit for exploration
MATCH (n:LabelName)
RETURN n
LIMIT 10

// Limit with count
MATCH (n:LabelName)
WITH n LIMIT 100
RETURN count(n)
```

### Use DISTINCT Wisely

```cypher
// DISTINCT can be expensive
MATCH (a)-[r]->(b)
RETURN DISTINCT type(r)  // Good - small result set

MATCH (a)-[r]->(b)
RETURN DISTINCT a, b  // Potentially expensive
```

## Progressive Discovery

### Example: Finding ITP Requirements

```cypher
// Step 1: Understand what work types exist
MATCH (spec:Specification)
WHERE spec.jurisdiction = 'QLD'
RETURN DISTINCT spec.workType
LIMIT 20

// Step 2: Get specifications for specific work type
MATCH (spec:Specification)
WHERE spec.jurisdiction = 'QLD'
  AND spec.workType = 'Earthworks'
RETURN spec

// Step 3: Find ITP-related clauses
MATCH (spec:Specification)-[:HAS_CLAUSE]->(clause:Clause)
WHERE spec.jurisdiction = 'QLD'
  AND spec.workType = 'Earthworks'
  AND (clause.content CONTAINS 'ITP' 
       OR clause.content CONTAINS 'Inspection and Test Plan')
RETURN clause

// Step 4: Extract specific requirements
MATCH (spec:Specification)-[:HAS_CLAUSE]->(clause:Clause)
WHERE spec.jurisdiction = 'QLD'
  AND spec.workType = 'Earthworks'
  AND clause.type = 'quality_requirement'
RETURN clause.requirement, clause.testMethod, clause.frequency
```

## Handling Large Results

### Pagination

```cypher
// Page through results
MATCH (n:LabelName)
WHERE n.property = $value
RETURN n
ORDER BY n.id
SKIP $offset
LIMIT $pageSize
```

### Aggregation

```cypher
// Summarize before returning
MATCH (d:Document {project_id: $projectId})
WITH d.docType AS type, collect(d.title)[0..5] AS samples, count(d) AS total
RETURN type, total, samples
```

## Debugging Queries

### Check What Exists

```cypher
// Verify node exists
MATCH (n:LabelName {id: $id})
RETURN n IS NOT NULL AS exists

// Check relationship exists
MATCH (a:LabelA {id: $idA})-[r:REL_TYPE]->(b:LabelB {id: $idB})
RETURN r IS NOT NULL AS exists

// Find why pattern doesn't match
MATCH (a:LabelA {id: $idA})
OPTIONAL MATCH (a)-[r:REL_TYPE]->(b:LabelB)
RETURN a, count(r) AS relationshipCount, collect(b.id)[0..5] AS connectedIds
```

### Inspect Property Values

```cypher
// See actual values
MATCH (n:LabelName {id: $id})
RETURN keys(n), n

// Check for nulls
MATCH (n:LabelName)
WHERE n.importantProperty IS NULL
RETURN count(n)
```

## Best Practices

1. **Always start broad** - Understand the landscape before diving deep
2. **Use LIMIT in exploration** - Prevent overwhelming results
3. **Filter by jurisdiction** - When querying standards/specifications
4. **Follow relationships** - Discover connected data
5. **Validate assumptions** - Check your understanding with queries
6. **Document your findings** - Keep notes on useful patterns
7. **Build incrementally** - Test small queries before complex ones
8. **Use EXPLAIN** - Understand query performance if needed

## Example Exploration Session

```cypher
// 1. What's in this database?
CALL db.labels()

// 2. How many of each type?
MATCH (n) RETURN labels(n)[0], count(n)

// 3. Sample some standards
MATCH (s:Standard) RETURN s LIMIT 5

// 4. What jurisdictions are covered?
MATCH (s:Standard) 
RETURN DISTINCT s.jurisdiction, count(s) AS count
ORDER BY count DESC

// 5. Get QLD standards
MATCH (s:Standard)
WHERE s.jurisdiction = 'QLD'
RETURN s.code, s.name
LIMIT 20

// 6. Find earthworks standards
MATCH (s:Standard)
WHERE s.jurisdiction = 'QLD'
  AND (s.name CONTAINS 'earth' OR s.code CONTAINS 'MRTS04')
RETURN s

// 7. Success - found what I need!
```

This methodical approach ensures you efficiently discover and retrieve the data you need without getting lost in the database.
