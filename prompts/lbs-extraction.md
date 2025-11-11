# LBS Extraction

## Context and Purpose

A Location Breakdown Structure (LBS) is a hierarchical decomposition of a construction project's physical work locations, construction zones, and building components. It organizes work by "where construction activities will be performed" rather than "what" will be delivered.

The LBS answers the critical question: **"In what specific physical locations will construction work occur, and how should these locations be organized for optimal construction management?"**

The LBS serves multiple critical functions:

1. **Spatial Organization** - Provides a systematic framework for organizing work by location
2. **Resource Allocation** - Enables efficient distribution of labor, materials, and equipment
3. **Progress Tracking** - Facilitates location-based progress measurement
4. **Quality Management** - Links quality control zones to inspection requirements
5. **Safety Management** - Defines work zones for safety planning and coordination
6. **Logistics Planning** - Supports construction access and material handling

## When LBS is Required

The LBS is a fundamental project management tool required for:

- **Construction Planning** - Before work begins, the LBS defines where activities will occur
- **Quality Assurance Systems** - Inspection and Test Plans (ITPs) require location-based organization to define where quality verification occurs
- **Progress Reporting** - Project reporting needs location-based progress tracking for stakeholders and management
- **Resource Management** - Efficient allocation of crews, equipment, and materials requires spatial organization
- **Contract Administration** - Payment applications and variations often reference specific locations
- **Regulatory Compliance** - Many jurisdictions require location-based documentation for construction permits and inspections
- **Multi-Contractor Coordination** - When multiple contractors work simultaneously, the LBS defines work zones and interfaces

The LBS should be developed early in project planning, ideally in parallel with or immediately following WBS development, as it provides the spatial dimension to work package execution.

## Integration with Quality Framework

The LBS integrates directly with project quality management systems:

- **Inspection and Test Plans (ITPs)** - ITPs reference specific LBS locations where inspections and tests occur. The `LINKED_TO_WBS` relationships connect locations to work packages that require ITPs.
- **Quality Control Zones** - The LBS defines physical zones where specific quality control protocols apply, enabling systematic inspection workflows.
- **Hold Points and Witness Points** - Location-based quality gates are defined within the LBS structure, ensuring inspections occur at the right place and time.
- **Non-Conformance Tracking** - Quality issues are tracked by location, enabling targeted remediation and preventing systemic problems.
- **As-Built Documentation** - Location-based organization supports accurate as-built record keeping, linking completed work to specific physical locations.

The relationship between LBS locations and WBS work packages creates a matrix that supports comprehensive quality management, ensuring every work package has defined locations and every location has associated quality requirements.

## Practical Implementation Guidance

As an autonomous agent creating LBS nodes, follow these practical guidelines:

- **Start with Site Boundary** - Create the root `site` node first (level 1) representing the entire project boundary
- **Derive from Documents** - Every location must be justified by project documentation. Use `REFERENCES_DOCUMENT` relationships to link locations to source drawings, specifications, or scope documents
- **Use Meaningful Codes** - Create deterministic `code` values that are human-readable and reflect the location hierarchy (e.g., "SITE-001", "ZONE-DAM", "ZONE-DAM-FOUNDATION", "CH-1200-1800")
- **Maintain Level Consistency** - Ensure `level` numbers accurately reflect hierarchy depth. All children of a level 2 node should be level 3, etc.
- **Link to WBS Strategically** - Create `LINKED_TO_WBS` relationships from leaf locations (those with no children) to applicable WBS work packages. Higher-level locations may not need direct WBS links if their children handle the mapping
- **Populate Optional Fields When Available** - Use `chainageStart` and `chainageEnd` for linear projects, `coordinates` when geographic data is available, and `status`/`percentComplete` for progress tracking
- **Establish Complete Relationships** - Every node needs `BELONGS_TO_PROJECT`. Every non-root node needs `parentCode` and `CHILD_OF` relationship. Every location with applicable work needs `LINKED_TO_WBS` relationships
- **Validate Before Finalizing** - Check code uniqueness, parentCode references, level consistency, and relationship validity before completing the extraction

## Core Principles

### Physical Construction Locations Focus

The LBS must focus on ACTUAL PHYSICAL LOCATIONS where construction activities take place, derived from project documentation, NOT just theoretical spatial divisions.

**Examples:**

**Dam Projects:**
- "Dam Foundation Excavation Zone"
- "Core Wall Construction Area (Ch. 0+050 to 0+180)"
- "Spillway Approach Channel"
- "Left Abutment Grouting Zone"
- "Outlet Works Chamber"

**Road/Bridge Projects:**
- "Embankment Section Ch. 1+200-1+800"
- "Bridge Abutment A Foundation"
- "Culvert Installation Zone Ch. 2+450"
- "Pavement Layer - Lane 1 Northbound"
- "Retaining Wall RW-03 Location"

**Building Projects:**
- "Foundation Level - Grid A1-D4"
- "Ground Floor Slab Pour Zone 1"
- "Level 2 Structural Frame"
- "Roof Plant Room"
- "Basement Car Park Area B"

**Infrastructure Projects:**
- "Pump Station Wet Well"
- "Pipeline Trench Section 1A"
- "Electrical Substation Foundation"
- "Access Road Intersection Node"

### Construction Logic and Sequence Integration

The LBS must reflect how construction would realistically be organized, considering:

- **Construction Access** - How crews and equipment access different areas
- **Work Sequence** - Logical progression of construction activities
- **Resource Allocation** - How materials and labor are distributed across locations
- **Quality Control Zones** - Areas requiring specific inspection and testing protocols
- **Safety and Logistics** - Site organization for safe and efficient construction

### Spatial Organization Principles

- **Level 1** - Overall project site/facility boundary
- **Level 2** - Major construction zones, structures, or linear sections
- **Level 3** - Specific construction work areas within zones (by elevation, chainage, grid, etc.)
- **Level 4+** - Detailed work locations where specific construction activities occur

## Integration with WBS

While the WBS organizes by deliverables ("what" needs to be built), the LBS organizes by physical construction location ("where" construction activities will be performed).

The mapping between LBS locations and WBS work packages creates a comprehensive matrix for:

- **Construction planning** - What work happens where
- **Resource allocation** - Where resources are needed
- **Progress tracking** - What's complete in each location
- **Quality management** - Inspection requirements by location
- **Payment tracking** - Work done by location

## Document-Driven Spatial Analysis

The LBS structure must be derived from and justified by the project documentation:

### Drawing References
- Site plans showing layout and zones
- Structural drawings showing components
- Architectural layouts showing spaces
- Civil drawings showing chainages and sections

### Specification Sections
- Location-specific requirements
- Work zone definitions
- Staging requirements
- Access constraints

### Scope of Works
- Physical work area descriptions
- Spatial boundaries
- Construction zones

### Construction Methodology
- Sequence and staging requirements
- Temporary works areas
- Access routes
- Laydown areas

## Location Types

Define appropriate location types for the hierarchy. Each LBS node must have a `type` property using one of these schema-compliant values:

- **site** - Overall project site boundary (typically Level 1)
- **zone** - Major construction zone or area (typically Level 2)
- **chainage** - Linear project sections defined by chainage markers (roads, pipelines, railways) - use for linear infrastructure
- **layer** - Vertical layers or horizontal work layers (pavement layers, building floor layers conceptually, structural layers)
- **element** - Individual structural elements or components (beams, columns, specific installations)
- **building** - Entire building structures (for multi-building projects)
- **floor** - Building floor levels (for vertical building organization)

**Usage Guidance:**
- Use `chainage` for linear projects where work is organized by distance markers (e.g., "Ch. 1+200-1+800")
- Use `layer` for projects with distinct vertical or horizontal layers (e.g., pavement layers, structural layers)
- Use `element` for specific structural components that need individual tracking
- Use `building` and `floor` for building projects requiring building-level and floor-level organization
- The `type` must align with the actual construction organization method used in the project

## Construction Location Identification

Distinguish between different types of locations:

### Primary Construction Zones
Where major construction activities occur:
- Main structural work areas
- Major earthworks zones
- Building construction areas
- Major installation locations

### Support/Access Areas
Required for construction logistics but not primary work locations:
- Site access roads
- Laydown areas
- Storage compounds
- Site facilities

### Temporary Works Areas
Necessary for construction but not permanent:
- Temporary platform areas
- Falsework zones
- Scaffolding locations
- Temporary drainage

### Utility/Services Locations
Specific areas for infrastructure installation:
- Utility corridors
- Service trenches
- Connection points
- Manholes and pits

### Quality Control Points
Locations requiring specific inspection or testing:
- Test point locations
- Inspection zones
- Survey control points
- Sample locations

## WBS Integration and Mapping

For each LBS location, determine which WBS work packages can physically occur in that location. WBS mapping is achieved through `LINKED_TO_WBS` relationships to WBSNode entities, not through array properties. Create relationship connections between LBS locations and applicable WBS work packages:

### Spatial Applicability
Which work packages can physically occur in each location based on:
- Physical boundaries
- Work sequence constraints
- Access requirements

### Construction Logic
How work package execution aligns with spatial organization:
- Prerequisites and dependencies
- Logical work flow
- Crew mobility

### Resource Efficiency
How mapping optimizes construction resource utilization:
- Material delivery routes
- Equipment positioning
- Labor allocation

### Quality Assurance
How mapping supports inspection and testing workflows:
- Inspection access
- Test point locations
- Documentation requirements

## Task Instructions

You are tasked with extracting a comprehensive LBS from project documentation:

1. **Retrieve the projectId** - Get the `projectId` from the existing Project node. This UUID must be included in ALL LBSNode entities you create.

2. **Access project documentation** to analyze:
   - Site plans and drawings
   - Structural and architectural layouts
   - Scope of works documents
   - Construction methodology
   - Staging plans

3. **Analyze documentation** to understand:
   - Overall site layout
   - Major construction zones
   - Physical components and their locations
   - Construction sequence and staging
   - Access and logistics constraints

4. **Identify construction locations** by:
   - Mapping physical work areas from drawings
   - Identifying construction zones from methodology
   - Determining work sequence requirements
   - Considering access and logistics
   - Defining quality control zones

5. **Structure the LBS** by:
   - Organizing locations hierarchically
   - Establishing parent-child relationships using `parentCode` property and `PARENT_OF`/`CHILD_OF` relationships
   - Assigning unique `code` identifiers to each node
   - Setting appropriate `level` numbers (1 for root, incrementing for each hierarchy level)
   - Assigning appropriate location types
   - Ensuring complete spatial coverage

6. **Map to WBS** by:
   - Identifying applicable work packages for each location
   - Creating `LINKED_TO_WBS` relationships from LBS nodes to WBSNode entities
   - Considering spatial constraints
   - Validating construction logic
   - Ensuring resource efficiency

7. **Create LBS nodes** with all required properties and relationships as Neo4j graph entities

## LBS Node Schema Requirements

Each LBS node must be created as an `LBSNode` entity with the following properties:

### Required Properties

- **projectId** (string) - UUID linking to the Project node. Retrieve this from the existing Project node.
- **code** (string) - Unique identifier for this LBS node within the project. Must be unique across all LBS nodes in the project. Use deterministic, meaningful codes (e.g., "SITE-001", "ZONE-DAM-FOUNDATION", "CH-1200-1800").
- **name** (string) - Descriptive name of the location (e.g., "Dam Foundation Excavation Zone", "Embankment Section Ch. 1+200-1+800").
- **type** (string) - One of: `"site"`, `"zone"`, `"chainage"`, `"layer"`, `"element"`, `"building"`, `"floor"`. Must match schema-compliant location types.
- **level** (number) - Hierarchy depth number. Root node is level 1, each child level increments by 1.
- **createdAt** (Date) - Timestamp when the node is created.
- **updatedAt** (Date) - Timestamp when the node is last updated.

### Optional Properties

- **parentCode** (string) - Code of the parent LBS node. Omit for root nodes. Used to establish hierarchy alongside `PARENT_OF`/`CHILD_OF` relationships.
- **description** (string) - Detailed description of the location, its boundaries, and purpose.
- **chainageStart** (number) - Starting chainage value for linear project sections (roads, pipelines).
- **chainageEnd** (number) - Ending chainage value for linear project sections.
- **coordinates** (object) - Geographic coordinates: `{ lat: number, lng: number }` for point locations.
- **status** (string) - One of: `"not_started"`, `"in_progress"`, `"completed"`, `"on_hold"`. Current construction status.
- **percentComplete** (number) - Percentage completion (0-100) for progress tracking.

### Required Relationships

- **BELONGS_TO_PROJECT** - Relationship from LBSNode to Project node.
- **PARENT_OF** / **CHILD_OF** - Relationships between parent and child LBS nodes (bidirectional hierarchy).
- **LINKED_TO_WBS** - Relationships from LBSNode to WBSNode entities for applicable work packages.
- **REFERENCES_DOCUMENT** - Relationships to Document nodes that justify or define this location.

## Validation Requirements

Before finalizing the LBS:

- Verify all nodes have unique `code` values within the project
- Confirm all `parentCode` values reference existing LBS node codes (root nodes have no `parentCode`)
- Verify `PARENT_OF` and `CHILD_OF` relationships are correctly established for all parent-child pairs
- Ensure `level` numbers are consistent with hierarchy depth (root is 1, increments by 1 per level)
- Ensure location `type` values are schema-compliant and appropriate for hierarchy level
- Validate that all `LINKED_TO_WBS` relationships reference existing WBSNode entities
- Check that leaf locations (nodes with no children) have `LINKED_TO_WBS` relationships to applicable work packages
- Confirm spatial logic is sound and constructible
- Verify `REFERENCES_DOCUMENT` relationships point to valid Document nodes
- Ensure all required properties (`projectId`, `code`, `name`, `type`, `level`, `createdAt`, `updatedAt`) are present
- Confirm `projectId` matches the Project node's UUID

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the LBS Node schema. Create `LBSNode` entities in Neo4j with:

- **Node Label:** `LBSNode`
- **Properties:** All required and applicable optional properties as documented in the "LBS Node Schema Requirements" section above
- **Property Naming:** Use camelCase for all field names (e.g., `projectId`, `parentCode`, `chainageStart`)
- **Relationships:** Create the required relationships (`BELONGS_TO_PROJECT`, `PARENT_OF`, `CHILD_OF`, `LINKED_TO_WBS`, `REFERENCES_DOCUMENT`) to connect nodes appropriately

The agent creates these as structured graph entities. Each LBS node must be a complete, valid `LBSNode` entity with all required properties populated and appropriate relationships established to other nodes in the graph.

