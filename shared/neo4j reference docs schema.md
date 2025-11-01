# Neo4j Project Docs Database Schema

**Database:** Project Docs (Port 7688)  
**Purpose:** Project-specific construction documents (ITPs, plans, schedules, specifications, drawings)  
**Access:** READ ONLY

## Node Labels

The Project Docs database contains the following node types:

### Document Structure

- **Document** - Project documents (specifications, contracts, reports, drawings)
- **DocumentSection** - Sections within documents
- **Chunk** - Text chunks for semantic search

### Construction Information

- **WorkItem** - Work packages and construction activities
- **ConstructionMethod** - Construction methods and approaches
- **ConstructionProcedure** - Step-by-step construction procedures
- **MaterialSpecification** - Material requirements and specifications
- **DesignElement** - Design components and elements
- **DesignCalculation** - Design calculations and analysis

### Quality and Testing

- **InspectionTestPlan** - ITP requirements
- **QualityControl** - Quality control requirements
- **TestRequirement** - Testing requirements and criteria

### Project Management

- **ManagementPlan** - Management plans (Quality, Safety, Environmental)
- **ContractRequirement** - Contract requirements and obligations
- **ProjectLocation** - Project locations and areas

### Environmental and Safety

- **EnvironmentalControl** - Environmental controls and measures
- **TrafficManagementRequirement** - Traffic management requirements

### References

- **ReferencedStandard** - Standards referenced in project documents
- **DrawingReference** - Drawing references
- **Table** - Tables from documents
- **Figure** - Figures and diagrams

### System Nodes

- **__Entity__** - System entity nodes for knowledge graph
- **__KGBuilder__** - Knowledge graph builder nodes

## Relationship Types

The following relationships connect nodes in the Project Docs database:

### Document Relationships

- **HAS_SECTION** - Document has a section
- **HAS_TABLE** - Document/Section has a table
- **HAS_FIGURE** - Document/Section has a figure
- **NEXT_SECTION** - Sequential section ordering
- **PARENT_OF** - Hierarchical parent-child relationships
- **PART_OF_SECTION** - Entity is part of a section
- **MENTIONED_IN_SECTION** - Entity mentioned in a section

### Reference Relationships

- **REFERENCES_DOCUMENT** - References another document
- **REFERENCES_STANDARD** - References a standard
- **DETAILS_SHOWN_ON** - Details shown on a drawing
- **SHOWN_ON_DRAWING** - Shown on a specific drawing
- **ILLUSTRATED_IN_FIGURE** - Illustrated in a figure
- **SHOWN_IN_TABLE** - Shown in a table

### Work Relationships

- **USES_METHOD** - Uses a construction method
- **USES_PROCEDURE** - Uses a construction procedure
- **CONSTRUCTS_ELEMENT** - Constructs a design element
- **BASED_ON_CALCULATION** - Based on a design calculation
- **SPECIFIES_MATERIAL** - Specifies a material

### Quality Relationships

- **REQUIRES_ITP** - Requires an Inspection Test Plan
- **REQUIRES_TEST** - Requires testing
- **HAS_QUALITY_CONTROL** - Has quality control requirements
- **COMPLIES_WITH** - Complies with standard/requirement

### Location Relationships

- **AT_LOCATION** - Located at a project location
- **APPLIES_TO** - Applies to a specific item

### Management Relationships

- **REQUIRES_PLAN** - Requires a management plan
- **REQUIRES_ENVIRONMENTAL_CONTROL** - Requires environmental control
- **REQUIRES_TRAFFIC_MANAGEMENT** - Requires traffic management
- **HAS_CONTRACT_REQUIREMENT** - Has a contract requirement

## Common Query Patterns

### Finding Project Documents

```cypher
// Get all documents for a project
MATCH (d:Document)
WHERE d.project_id = $projectId
RETURN d

// Get documents by type
MATCH (d:Document)
WHERE d.project_id = $projectId
  AND d.docType = $documentType
RETURN d

// Search document content
MATCH (d:Document)
WHERE d.project_id = $projectId
  AND d.content CONTAINS $searchTerm
RETURN d
```

### Finding Work Items

```cypher
// Get all work items for a project
MATCH (w:WorkItem)
WHERE w.project_id = $projectId
RETURN w

// Get work items with ITP requirements
MATCH (w:WorkItem)-[:REQUIRES_ITP]->(itp:InspectionTestPlan)
WHERE w.project_id = $projectId
RETURN w, itp

// Get work items by location
MATCH (w:WorkItem)-[:AT_LOCATION]->(loc:ProjectLocation)
WHERE w.project_id = $projectId
RETURN w, loc
```

### Finding ITP Requirements

```cypher
// Get all ITP requirements
MATCH (itp:InspectionTestPlan)
WHERE itp.project_id = $projectId
RETURN itp

// Get ITPs for specific work type
MATCH (itp:InspectionTestPlan)
WHERE itp.project_id = $projectId
  AND itp.workType = $workType
RETURN itp

// Get work items requiring ITPs
MATCH (w:WorkItem)-[:REQUIRES_ITP]->(itp:InspectionTestPlan)
WHERE w.project_id = $projectId
RETURN w, itp
```

### Finding Material Specifications

```cypher
// Get all material specifications
MATCH (ms:MaterialSpecification)
WHERE ms.project_id = $projectId
RETURN ms

// Get materials for a work item
MATCH (w:WorkItem)-[:SPECIFIES_MATERIAL]->(ms:MaterialSpecification)
WHERE w.project_id = $projectId
RETURN w, ms
```

### Finding Standards References

```cypher
// Get all referenced standards
MATCH (rs:ReferencedStandard)
WHERE rs.project_id = $projectId
RETURN DISTINCT rs.standardCode, rs.standardName

// Get documents referencing a standard
MATCH (d:Document)-[:REFERENCES_STANDARD]->(rs:ReferencedStandard)
WHERE d.project_id = $projectId
  AND rs.standardCode = $standardCode
RETURN d
```

### Finding Test Requirements

```cypher
// Get all test requirements
MATCH (tr:TestRequirement)
WHERE tr.project_id = $projectId
RETURN tr

// Get tests for specific work
MATCH (w:WorkItem)-[:REQUIRES_TEST]->(tr:TestRequirement)
WHERE w.project_id = $projectId
  AND w.workType = $workType
RETURN tr
```

### Finding Construction Methods

```cypher
// Get construction methods for work item
MATCH (w:WorkItem)-[:USES_METHOD]->(cm:ConstructionMethod)
WHERE w.project_id = $projectId
RETURN w, cm

// Get procedures for a method
MATCH (cm:ConstructionMethod)-[:USES_PROCEDURE]->(cp:ConstructionProcedure)
WHERE cm.project_id = $projectId
RETURN cm, cp
```

### Finding Management Plans

```cypher
// Get all management plans
MATCH (mp:ManagementPlan)
WHERE mp.project_id = $projectId
RETURN mp

// Get items requiring specific plan
MATCH (w:WorkItem)-[:REQUIRES_PLAN]->(mp:ManagementPlan)
WHERE w.project_id = $projectId
  AND mp.planType = $planType
RETURN w, mp
```

## Typical Node Properties

### Document Nodes

- `id` - Unique identifier
- `project_id` - Project identifier
- `title` - Document title
- `docType` - Document type
- `docNumber` - Document number
- `revision` - Document revision
- `content` - Document text content
- `metadata` - Document metadata

### WorkItem Nodes

- `id` - Unique identifier
- `project_id` - Project identifier
- `name` - Work item name
- `description` - Work item description
- `workType` - Type of work (earthworks, concrete, etc.)
- `scope` - Scope of work
- `specifications` - Applicable specifications

### InspectionTestPlan Nodes

- `id` - Unique identifier
- `project_id` - Project identifier
- `name` - ITP name
- `workType` - Work type covered
- `specificationRef` - Specification reference
- `inspectionPoints` - Required inspection points
- `testRequirements` - Required tests

### MaterialSpecification Nodes

- `id` - Unique identifier
- `project_id` - Project identifier
- `materialName` - Material name
- `specification` - Material specification
- `source` - Material source requirements
- `testingRequirements` - Testing requirements
- `certificationRequired` - Certification requirements

### ProjectLocation Nodes

- `id` - Unique identifier
- `project_id` - Project identifier
- `name` - Location name
- `description` - Location description
- `chainage` - Chainage (if applicable)
- `coordinates` - GPS coordinates (if applicable)

## Usage Notes

### Project Scoping

All queries should filter by `project_id` to ensure you're accessing the correct project's data:

```cypher
MATCH (n:NodeType)
WHERE n.project_id = $projectId
RETURN n
```

### Semantic Search

Use Chunk nodes for semantic search to find relevant information based on meaning:

```cypher
MATCH (c:Chunk)
WHERE c.project_id = $projectId
// Use vector similarity if available
RETURN c
```

### Following Relationships

Leverage relationships to discover connected information:

```cypher
// Start with what you know
MATCH (w:WorkItem {id: $workItemId})

// Explore connected information
OPTIONAL MATCH (w)-[:REQUIRES_ITP]->(itp)
OPTIONAL MATCH (w)-[:SPECIFIES_MATERIAL]->(mat)
OPTIONAL MATCH (w)-[:REQUIRES_TEST]->(test)
OPTIONAL MATCH (w)-[:AT_LOCATION]->(loc)

RETURN w, collect(DISTINCT itp) AS itps,
       collect(DISTINCT mat) AS materials,
       collect(DISTINCT test) AS tests,
       collect(DISTINCT loc) AS locations
```

## Best Practices

1. **Always filter by project_id** to scope queries to correct project
2. **Use LIMIT** on exploratory queries
3. **Follow relationships** to discover full context
4. **Search Chunks** for semantic information retrieval
5. **Check referenced standards** to understand compliance requirements
6. **Respect READ ONLY access** - do not attempt writes

