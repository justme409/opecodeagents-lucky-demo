# Neo4j Generated Database Schema

**Database:** Generated Content (Port 7690)  
**Purpose:** AI-generated content, responses, and agent outputs  
**Access:** READ and WRITE

## Overview

This is your OUTPUT database. All content you generate must be written here as Neo4j graph nodes. The structure of your output should match the schema defined in your task-specific output schema file.

## Current State

The Generated database is currently empty or contains minimal data. You will create the schema through your output.

## Output Schema Requirements

Your output schema is defined in the `output-schema-*.md` file in your workspace. This file specifies:

- **Node labels** to use
- **Required and optional properties**
- **Property data types**
- **Relationship types and directions**
- **Cardinality rules**
- **Validation requirements**

**Always refer to your specific output schema file for exact requirements.**

## Common Output Patterns

### Creating Nodes

```cypher
// Create a single node
CREATE (n:YourNodeType {
  id: $id,
  project_id: $projectId,
  property1: $value1,
  property2: $value2,
  createdAt: datetime(),
  createdBy: 'agent'
})
RETURN n

// Create multiple nodes in a batch
UNWIND $nodes AS nodeData
CREATE (n:YourNodeType)
SET n = nodeData
SET n.createdAt = datetime()
SET n.createdBy = 'agent'
```

### Creating Relationships

```cypher
// Create relationship between existing nodes
MATCH (a:NodeTypeA {id: $idA})
MATCH (b:NodeTypeB {id: $idB})
CREATE (a)-[:RELATIONSHIP_TYPE]->(b)

// Create nodes and relationships together
CREATE (parent:Parent {id: $parentId, name: $parentName})
CREATE (child:Child {id: $childId, name: $childName})
CREATE (parent)-[:HAS_CHILD]->(child)

// Create hierarchical structure using parentId
UNWIND $nodes AS nodeData
CREATE (n:HierarchicalNode)
SET n = nodeData

// Then create relationships
MATCH (child:HierarchicalNode)
WHERE child.parentId IS NOT NULL
MATCH (parent:HierarchicalNode {id: child.parentId})
CREATE (parent)-[:PARENT_OF]->(child)
```

### Using MERGE for Idempotency

```cypher
// MERGE ensures node is created only once
MERGE (n:NodeType {id: $id})
ON CREATE SET
  n.property1 = $value1,
  n.createdAt = datetime(),
  n.createdBy = 'agent'
ON MATCH SET
  n.property1 = $value1,
  n.updatedAt = datetime(),
  n.updatedBy = 'agent'
RETURN n
```

## Common Node Types by Task

### ITP Generation

Expected node types:
- `ITP_Template` or `ITPTemplate`
- `ITP_Section` or `ITPSection`
- `Inspection_Point` or `InspectionPoint`
- `Hold_Point` or `HoldPoint`
- `Test_Requirement` or `TestRequirement`

### Project Details

Expected node types:
- `Project` - Use `project_uuid` as primary key (NOT `id`), `project_name` (NOT `name`), `project_description` (NOT `description`)
- `Party` or `Organisation`
- `Contact` or `Person`
- `Contract`
- `Milestone` or `KeyDate`

**CRITICAL**: For Project nodes, always use the exact field names from the schema:
- `project_uuid` - Primary key
- `project_name` - Project name (REQUIRED)
- `project_description` - Description
- `project_address` - Location
- `html_content` - HTML string (NOT a file path)

### WBS Extraction

Expected node types:
- `WBS_Node` or `WBSNode`
- `Work_Package` or `WorkPackage`

Typical structure:
- Hierarchical with `parentId` relationships
- Leaf nodes represent deliverable work packages

### LBS Extraction

Expected node types:
- `LBS_Node` or `LBSNode`
- `Location` or `WorkLocation`

Typical structure:
- Hierarchical with `parentId` relationships
- Leaf nodes represent specific work locations
- Links to WBS nodes via `applicable_wbs_package_ids`

### Management Plans

Expected node types:
- `Management_Plan` or `ManagementPlan`
- `Plan_Section` or `PlanSection`
- `Content_Block` or `ContentBlock`

Typical structure:
- Hierarchical sections with `parentId`
- Content blocks attached to sections

### Document Metadata

Expected node types:
- `Document`
- `Document_Metadata` or `DocumentMetadata`

Properties:
- Classification, revision, discipline
- Document type, category, subtype

### Standards References

Expected node types:
- `Referenced_Standard` or `ReferencedStandard`
- `Standard_Reference` or `StandardReference`

Links to:
- Source documents
- Standards database entries (by UUID)

## Property Naming Conventions

Use consistent property names:

### Standard Properties

- `id` - Unique identifier (UUID) - **EXCEPT for Project nodes which use `project_uuid`**
- `project_id` - Project identifier - **EXCEPT for Project nodes which use `project_uuid`**
- `project_uuid` - For all nodes, this links to the Project (use this for project reference)
- `parentId` - Parent node ID (for hierarchical structures)
- `name` or `title` - Node name/title - **EXCEPT for Project nodes which use `project_name`**
- `description` - Detailed description - **EXCEPT for Project nodes which use `project_description`**
- `type` or `nodeType` - Type classification

**IMPORTANT**: Always check your task-specific schema file for the exact property names to use. The schema is the source of truth.

### Audit Properties

- `createdAt` - Creation timestamp (datetime())
- `createdBy` - Creator ('agent' or user ID)
- `updatedAt` - Last update timestamp
- `updatedBy` - Last updater

### Source Tracking

- `sourceDocumentIds` - Array of source document IDs
- `sourceReferences` - Array of source references
- `extractedFrom` - Source information

## Validation Queries

### Check Your Output

```cypher
// Count nodes created
MATCH (n:YourNodeType)
RETURN count(n)

// Verify properties are set
MATCH (n:YourNodeType)
WHERE n.requiredProperty IS NULL
RETURN count(n) AS nodesWithMissingProperty

// Check relationships
MATCH (a:NodeTypeA)-[r:RELATIONSHIP]->(b:NodeTypeB)
RETURN count(r) AS relationshipCount

// Find orphaned nodes (nodes without relationships)
MATCH (n:YourNodeType)
WHERE NOT (n)--()
RETURN count(n) AS orphanedNodes

// Verify hierarchy integrity
MATCH (child:HierarchicalNode)
WHERE child.parentId IS NOT NULL
MATCH (parent:HierarchicalNode {id: child.parentId})
RETURN count(DISTINCT child) AS childrenWithParents

// Find broken parent references
MATCH (child:HierarchicalNode)
WHERE child.parentId IS NOT NULL
  AND NOT EXISTS {
    MATCH (parent:HierarchicalNode {id: child.parentId})
  }
RETURN count(child) AS brokenReferences
```

### Full Structure Validation

```cypher
// For hierarchical outputs (WBS, LBS, ITP sections)
MATCH (root:YourNodeType)
WHERE root.parentId IS NULL
OPTIONAL MATCH path = (root)-[:PARENT_OF*]->(descendant)
RETURN root,
       count(DISTINCT descendant) AS totalDescendants,
       max(length(path)) AS maxDepth
```

## Transaction Management

### For Large Outputs

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(uri, auth=(user, password))

# Batch write
with driver.session(database="neo4j") as session:
    with session.begin_transaction() as tx:
        # Write nodes in batches
        for batch in batches:
            tx.run("""
                UNWIND $nodes AS nodeData
                CREATE (n:NodeType)
                SET n = nodeData
                SET n.createdAt = datetime()
            """, nodes=batch)
        
        # Create relationships
        tx.run("""
            MATCH (child:NodeType)
            WHERE child.parentId IS NOT NULL
            MATCH (parent:NodeType {id: child.parentId})
            CREATE (parent)-[:PARENT_OF]->(child)
        """)
        
        # Commit transaction
        tx.commit()
```

## Best Practices

### 1. Generate Unique IDs

```python
import uuid

node_id = str(uuid.uuid4())
```

### 2. Set Timestamps

```cypher
SET n.createdAt = datetime()
SET n.updatedAt = datetime()
```

### 3. Track Sources

```cypher
SET n.sourceDocumentIds = $documentIds
SET n.extractedFrom = 'agent-' + $taskName
```

### 4. Validate Before Writing

- Check that all required properties are set
- Verify parent IDs reference existing nodes
- Ensure relationships are in correct direction
- Confirm data types match schema

### 5. Use Transactions

- Group related writes
- Commit or rollback as a unit
- Handle errors gracefully

### 6. Test Incrementally

- Write a small sample first
- Validate it matches schema
- Then write full output

## Common Mistakes to Avoid

❌ **Don't create nodes without required properties**
```cypher
CREATE (n:Node {id: $id})  // Missing required properties!
```

✅ **Do include all required properties**
```cypher
CREATE (n:Node {
  id: $id,
  name: $name,
  requiredProperty: $value
})
```

❌ **Don't create relationships to non-existent nodes**
```cypher
MATCH (a {id: $idA})
CREATE (a)-[:REL]->(b:Node {id: $idB})  // b might not exist!
```

✅ **Do verify both nodes exist first**
```cypher
MATCH (a {id: $idA})
MATCH (b {id: $idB})
CREATE (a)-[:REL]->(b)
```

❌ **Don't use wrong relationship direction**
```cypher
CREATE (child)-[:PARENT_OF]->(parent)  // Wrong direction!
```

✅ **Do follow schema relationship direction**
```cypher
CREATE (parent)-[:PARENT_OF]->(child)  // Correct direction
```

## Summary

- **This is YOUR output database** - Write all results here
- **Follow your output schema** - Defined in your workspace
- **Use consistent naming** - Follow conventions
- **Set all required properties** - Don't leave nulls
- **Create correct relationships** - Right direction and cardinality
- **Validate your output** - Check before finalizing
- **Use transactions** - For atomic writes
- **Track sources** - Document where data came from

Refer to your task-specific output schema file for exact node labels, properties, and relationships required for your task.

