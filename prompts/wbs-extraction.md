# WBS Extraction

## Context and Purpose

A Work Breakdown Structure (WBS) is a hierarchical decomposition of the total scope of work to be carried out by the project team to accomplish the project objectives and create the required deliverables. The WBS organizes and defines the total scope of the project by decomposing it into manageable work packages.

The WBS serves multiple critical functions:

1. **Scope Definition** - Provides a comprehensive framework showing all work required
2. **Project Planning** - Enables detailed planning, scheduling, and resource allocation
3. **Cost Management** - Facilitates cost estimation and budget control
4. **Quality Management** - Links quality requirements and ITPs to specific work packages
5. **Progress Tracking** - Enables measurement of work completion and earned value

## WBS Principles

### Deliverable-Oriented Decomposition
The WBS focuses on DELIVERABLES (what needs to be built) rather than activities (how it will be built). Each level represents increasingly detailed definitions of project deliverables:

- **Level 1** - Overall project deliverable
- **Level 2** - Major deliverable components or systems
- **Level 3** - Sub-deliverables or assemblies
- **Level 4+** - Work packages (smallest deliverable units)

### 100% Rule
The sum of work at each parent level must equal 100% of the work represented by the parent. The WBS includes ALL work required - nothing more, nothing less.

### Hierarchical Structure
Each descending level represents an increasingly detailed definition of the project deliverable. Work packages at the lowest level should be:

- Clearly defined and bounded
- Assignable to a single responsible party
- Have measurable acceptance criteria
- Be independently schedulable and budgetable

## WBS Organization Patterns

### By Major Physical Components
Common for civil and infrastructure projects:
- Earthworks
- Drainage
- Pavements
- Structures (bridges, culverts)
- Services (electrical, mechanical)
- Landscaping

### By Construction Stage
Alternative organization:
- Mobilization
- Site preparation
- Foundations
- Substructure
- Superstructure
- Finishing works
- Testing and commissioning

### By Contract Schedule Items
Aligned with payment schedule:
- Preliminary items
- Earthworks items
- Pavement items
- Structure items
- Services items

## Technical Requirements

### Document-Driven WBS Analysis
The WBS structure must be derived from and justified by the project documentation:

- **Contract scope** - Overall deliverables and boundaries
- **Specification sections** - Technical requirements per work type
- **Schedule of rates** - Contract payment items
- **Drawings** - Physical components and systems
- **Construction methodology** - Work sequence and staging

### Integration with Specifications
Each work package should be linked to:

- **Applicable specifications** - Technical standards and requirements
- **Quality requirements** - Testing and inspection needs
- **ITP requirements** - Whether an ITP is required for the work package
- **Hold points** - Critical inspection or approval points

### ITP Requirements Analysis
For each work package, determine:

- **Is an ITP required?** - Based on criticality, specifications, contract requirements
- **ITP reasoning** - Why an ITP is or is not required
- **Specific quality requirements** - Tests, inspections, acceptance criteria
- **Referenced standards** - Applicable Australian Standards and specifications

## Work Package Definition

Each work package (leaf node) must include:

### Basic Information
- **Name** - Clear, concise work package name
- **Description** - Detailed description of deliverable
- **Node type** - Classification (deliverable, work package, etc.)

### Specifications
- **Applicable specifications** - Primary specifications that govern this work
- **Advisory specifications** - Secondary/reference specifications
- **Specification reasoning** - Why these specifications apply

### Quality Requirements
- **ITP required** - Boolean flag
- **ITP reasoning** - Justification for ITP requirement
- **Specific quality requirements** - List of tests, inspections, acceptance criteria

### Traceability
- **Source reference UUIDs** - Document IDs where information was found
- **Source reference hints** - Location within documents
- **Source reference quotes** - Exact text supporting the work package

## Hierarchical Relationships

The WBS is structured as an adjacency list where:

- Each node has a unique `id`
- Each node (except root) has a `parentId` referencing its parent node
- Root node has `parentId: null`
- Parent nodes are NOT leaf nodes
- Leaf nodes are work packages that can be scheduled and executed

## Task Instructions

You are tasked with extracting a comprehensive WBS from project documentation:

1. **Get the project_uuid** - Query the Generated Database (port 7690) to get the Project node and its `project_uuid`:
   ```cypher
   MATCH (p:Project) RETURN p.project_uuid
   ```
   This UUID must be included in ALL WBSNode entities you create.

2. **Query the Project Docs Database** (port 7688) to access:
   - Contract scope documents
   - Technical specifications
   - Schedule of rates
   - Drawings and plans
   - Construction methodology

2. **Analyze documentation** to understand:
   - Major project deliverables
   - Physical components and systems
   - Work breakdown logic
   - Specification structure
   - Quality requirements

3. **Structure the WBS** by:
   - Identifying major deliverable categories
   - Decomposing into sub-deliverables
   - Defining work packages at appropriate level
   - Ensuring 100% rule compliance
   - Establishing parent-child relationships

4. **Link specifications** by:
   - Mapping specifications to work packages
   - Identifying primary vs advisory specifications
   - Documenting reasoning for specification applicability

5. **Determine ITP requirements** by:
   - Assessing criticality of each work package
   - Checking specification ITP requirements
   - Identifying hold points and witness points
   - Documenting ITP reasoning

6. **Write output** to the **Generated Database** (port 7690)

## Standards Matching

When linking specifications to work packages:

1. **Consider work type** - What type of work is being performed?
2. **Check jurisdiction** - Use state-specific specifications where applicable
3. **Identify primary specs** - Which specifications directly govern this work?
4. **Identify advisory specs** - Which specifications provide supplementary guidance?
5. **Document reasoning** - Why do these specifications apply?

## Validation Requirements

Before finalizing the WBS:

- Verify all nodes have unique IDs
- Confirm all parent IDs reference existing nodes (except root)
- Ensure leaf nodes are marked correctly (`is_leaf_node: true`)
- Validate specification references exist in the Standards database
- Check that ITP requirements align with specification requirements
- Confirm source document references are accurate

## Output Format

Your output must conform to the WBS Node schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties
- Required vs optional fields
- Relationship structure (parent-child via parentId)
- Specification linkage format
- Cypher CREATE statement format

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

