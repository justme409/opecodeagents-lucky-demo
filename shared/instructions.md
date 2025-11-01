# Agent Workspace Instructions

## Overview

This workspace contains all the information you need to complete your assigned task. You will read project documents from Neo4j databases, analyze them, and generate structured output as Neo4j graph nodes.

## Workflow

1. **Read this file completely** to understand the process
2. **Read the task prompt** (`prompt.md`) to understand your specific assignment
3. **Review the exploration guide** to understand database query strategies
4. **Check connection details** for database access
5. **Review Neo4j schemas** to understand available data structures
6. **Review output schema** to understand the required output format
7. **Query source databases** (Standards and Project Docs) for input data
8. **Analyze and process** the information
9. **Generate output** as Neo4j graph nodes in the Generated database
10. **Validate output** against source documents and schema requirements

## Critical Rules

### Output Requirements

✅ **ALL output MUST go to the Generated Database (port 7690) as Neo4j graph nodes**

❌ **NO PostgreSQL inserts**  
❌ **NO JSON files**  
❌ **NO Markdown documents**  
❌ **NO file writes** (except debugging logs if absolutely necessary)

### Database Access

- **Standards DB (port 7687)** - READ ONLY - Contains reference specifications and standards
- **Project Docs DB (port 7688)** - READ ONLY - Contains project-specific documents
- **Generated DB (port 7690)** - WRITE ACCESS - Your output goes here

### Data Integrity

- **Never invent data** - Only use information explicitly found in source documents
- **Cite sources** - Track which documents provided which information
- **Validate references** - Ensure all referenced IDs exist in source databases
- **Check relationships** - Verify relationship directions and cardinality match schema

## Query Strategy

### Start Broad, Then Narrow

1. **Begin with exploratory queries** to understand what data is available
2. **Use filters** to narrow down to relevant information
3. **Follow relationships** to discover connected data
4. **Query progressively** - don't try to get everything in one query

### Jurisdiction Filtering

Many standards and specifications are jurisdiction-specific:

- QLD (Queensland)
- NSW (New South Wales)
- VIC (Victoria)
- SA (South Australia)
- WA (Western Australia)
- TAS (Tasmania)
- NT (Northern Territory)
- ACT (Australian Capital Territory)
- National (Australia-wide)

Always filter by project jurisdiction when querying standards.

### Example Query Flow

```cypher
// 1. Understand project jurisdiction
MATCH (p:Project {id: $projectId})
RETURN p.jurisdiction

// 2. Get relevant standards for jurisdiction
MATCH (s:Standard)
WHERE s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National'
RETURN s

// 3. Get project documents
MATCH (d:Document {project_id: $projectId})
RETURN d

// 4. Follow relationships
MATCH (d:Document)-[:REFERENCES]->(s:Standard)
WHERE d.project_id = $projectId
RETURN d, s
```

## Schema Adherence

### Input Schemas

Review the Neo4j schema files in your workspace to understand:

- Available node labels
- Property types and constraints
- Relationship types and directions
- Query patterns

### Output Schema

Your output MUST conform to the output schema provided in your workspace:

- Use correct node labels
- Include all required properties
- Set correct data types
- Create relationships in correct direction
- Follow cardinality rules (one-to-one, one-to-many, etc.)

## Output Generation

### Writing to Neo4j

Use Cypher CREATE or MERGE statements to write output:

```cypher
// Create a node with properties
CREATE (n:NodeType {
  id: $id,
  property1: $value1,
  property2: $value2,
  createdAt: datetime(),
  createdBy: 'agent'
})

// Create relationships
MATCH (a:NodeTypeA {id: $idA})
MATCH (b:NodeTypeB {id: $idB})
CREATE (a)-[:RELATIONSHIP_TYPE]->(b)
```

### Use Transactions

For large outputs, batch your writes:

- Group related nodes and relationships
- Use transactions to ensure consistency
- Handle errors gracefully

### Generate Unique IDs

- Use UUIDs for node IDs
- Ensure IDs are unique within your output
- Don't reuse IDs from source databases (unless explicitly mapping)

## Validation

### Before Finalizing

Run validation queries to check your output:

```cypher
// Check node counts
MATCH (n:YourNodeType)
RETURN count(n)

// Verify relationships exist
MATCH (a)-[r:YOUR_RELATIONSHIP]->(b)
RETURN count(r)

// Check for orphaned nodes
MATCH (n:YourNodeType)
WHERE NOT (n)--()
RETURN count(n)

// Validate required properties
MATCH (n:YourNodeType)
WHERE n.requiredProperty IS NULL
RETURN count(n)
```

### Full Structure Check

For hierarchical structures (WBS, LBS, ITPs with sections), run a full-tree query to verify:

```cypher
MATCH (root:NodeType {parentId: null})
OPTIONAL MATCH (root)-[:HAS_CHILD*]->(child)
RETURN root, collect(DISTINCT child)
```

### Cross-Reference Source Documents

For each property in your output:

- Verify it came from a source document
- Check the value matches what's in the source
- Confirm interpretation is correct
- Document assumptions if information is inferred

## Troubleshooting

### If you can't find expected data:

1. Check you're querying the correct database
2. Verify your filters aren't too restrictive
3. Try broader queries to see what's available
4. Check property names match schema
5. Verify relationships exist

### If output doesn't match schema:

1. Review output schema requirements
2. Check data types
3. Verify required properties are set
4. Confirm relationships use correct direction
5. Validate cardinality rules

### If relationships fail to create:

1. Confirm both nodes exist
2. Check node IDs are correct
3. Verify relationship type matches schema
4. Ensure direction is correct

## Best Practices

- **Read all documentation first** before starting queries
- **Take notes** as you explore the databases
- **Build incrementally** - test small pieces before full output
- **Validate frequently** - check your work as you go
- **Document reasoning** - explain why you made decisions
- **Be thorough** - don't skip validation steps
- **Ask for clarification** if requirements are ambiguous

## Getting Started

Now that you've read these instructions:

1. Open your task-specific prompt file
2. Understand what you need to produce
3. Review the output schema
4. Check the database connection details
5. Start exploring the source databases
6. Begin generating your output

Good luck!

