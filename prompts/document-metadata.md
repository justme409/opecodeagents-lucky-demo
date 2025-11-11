# Document Metadata Extraction

## Context and Purpose

Document metadata extraction involves analyzing construction project documents to extract register metadata needed for document management. This creates a comprehensive document register that enables efficient document control, retrieval, and compliance management.

The document register serves multiple critical functions:

1. **Document Control** - Enables systematic document management
2. **Version Control** - Tracks document revisions and superseded versions
3. **Traceability** - Links documents to project activities and deliverables
4. **Compliance** - Demonstrates document control per ISO 9001
5. **Retrieval** - Enables quick location of required documents
6. **Handover** - Provides complete documentation for project handover

**IMPORTANT:** Extract ONLY document register metadata. Do NOT extract domain content such as:
- Standards and specifications content
- Materials, equipment, or quantities
- Hazards, risks, or requirements
- Narrative or descriptive content

## Document Types

### Drawings

Technical drawings including:

- **General Arrangement** - Overall layout and arrangement
- **Plan** - Plan views
- **Section** - Cross-sections and longitudinal sections
- **Elevation** - Elevation views
- **Detail** - Detailed views of specific components
- **Schedule** - Component schedules
- **Diagram** - Schematic diagrams
- **Layout** - Layout drawings

**Drawing Metadata:**
- Document number
- Revision code
- Title
- Type (drawing)
- Discipline (civil, structural, electrical, mechanical, architectural, other)
- Status (draft, in_review, approved, superseded, archived)

### Documents

Non-drawing documents including:

- **Specifications** - Technical specifications
- **Reports** - Technical reports, test reports
- **Contracts** - Contract documents, conditions
- **Correspondence** - Letters, emails
- **Schedules** - Program schedules, payment schedules
- **Manuals** - Operation and maintenance manuals
- **Procedures** - Construction procedures, method statements
- **Plans** - Management plans, quality plans
- **Other** - Other document types

**Document Metadata:**
- Document number
- Revision code
- Title
- Type (specification, report, procedure, plan, correspondence, other)
- Discipline (civil, structural, electrical, mechanical, architectural, other)
- Status (draft, in_review, approved, superseded, archived)

## Metadata Fields

### Core Fields

**docKind** (REQUIRED)
- Either "drawing" or "document"
- Based on evidence in filename and content

**documentNumber** (REQUIRED)
- Unique document identifier
- Extract from title block or document header
- Examples: "C-001", "SPEC-123", "DWG-A-101"

**revisionCode** (REQUIRED)
- Revision identifier
- Common formats: "A", "B", "C" or "R0", "R1", "R2" or "Rev A", "Rev 1"
- Extract from revision field in title block
- Default to "A" if not stated

**title** (REQUIRED)
- Document title
- Extract from title field in document
- Should be concise and descriptive

**type** (REQUIRED)
- Document type classification
- Valid values: 'specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'correspondence' | 'other'
- Use 'specification' for technical specifications
- Use 'drawing' for technical drawings
- Use 'report' for test reports, technical reports, inspection reports
- Use 'procedure' for method statements, work procedures
- Use 'plan' for management plans, quality plans
- Use 'correspondence' for letters, emails, transmittals
- Use 'other' for contracts, schedules, manuals, and other document types

**status** (REQUIRED)
- Document status in workflow
- Valid values: 'draft' | 'in_review' | 'approved' | 'superseded' | 'archived'
- Default to 'draft' for newly extracted documents
- Set to 'approved' if document shows approval stamps/signatures
- Set to 'superseded' if a newer revision exists

**discipline** (optional)
- Engineering discipline
- Valid values: 'civil' | 'structural' | 'electrical' | 'mechanical' | 'architectural' | 'other'
- Use lowercase values exactly as shown
- Use 'other' for disciplines like hydraulic, geotechnical, surveying, etc.
- Extract from discipline field or infer from content

### Optional Fields

**issueDate** (optional Date)
- Date the document was issued or approved
- Extract from document header, title block, or approval section
- Format as ISO 8601 date string (YYYY-MM-DD)

**fileUrl** (optional)
- URL or path to the document file
- Will be automatically populated by the system where available

**fileName** (optional)
- Original filename of the document
- Extract from the file being processed

## Extraction Guidelines

### Evidence-Based Only

- NEVER invent values
- Rely only on content and filename signals
- If unsure, prefer null over guessing
- Extract only what is clearly stated or obvious

### Classification Process

1. **Examine filename** - Look for indicators (DWG, SPEC, RPT, drawing numbers, etc.)
2. **Examine content structure** - Title blocks indicate drawings, document headers indicate documents
3. **Look for drawing elements** - Scale, sheet numbers, technical drawing notation
4. **Look for document elements** - Sections, paragraphs, specification clauses
5. **Classify as drawing or document** based on evidence

### Title Block Extraction (Drawings)

Common title block locations:
- Bottom right corner
- Along bottom edge
- Right side

Title block typically contains:
- Document number
- Title
- Scale
- Sheet number
- Revision
- Discipline
- Approvals

### Document Header Extraction (Documents)

Document headers typically contain:
- Document number
- Title
- Revision
- Date
- Author/Prepared by
- Approved by
- Classification

### Multi-Document Files

If multiple distinct items are present (e.g., multiple drawings or appended documents):
- ONLY extract the dominant/primary item
- Do not emit subdocuments
- Return a single metadata record

## Discipline Inference

When discipline is not explicitly stated, infer from content and use lowercase values:

**'civil':**
- Roads, earthworks, pavements
- Drainage, stormwater
- Site works, retaining walls

**'structural':**
- Structural frames, beams, columns
- Foundations, footings
- Reinforcement details

**'architectural':**
- Building layouts, floor plans
- Elevations, facades
- Interior finishes

**'electrical':**
- Electrical systems, lighting
- Power distribution
- Cable schedules

**'mechanical':**
- HVAC systems
- Plumbing, fire services
- Mechanical equipment

**'other':**
- Hydraulic (water supply, sewer, pumping systems)
- Geotechnical (soil investigations, foundation studies)
- Surveying (site surveys, setting out)
- Any other specialized disciplines not explicitly listed above

## Task Instructions

You are an autonomous agent tasked with extracting document metadata from project files.

### Your Responsibilities

1. **Retrieve the projectId** - Get the Project node's `projectId` UUID from the database

2. **Access source documents** - Query available document files and their content

3. **Extract metadata** for each document:
   - Classify as drawing or document (set `docKind`)
   - Extract all available metadata fields per the schema
   - Infer missing fields where evidence exists
   - Set appropriate defaults (e.g., `status: 'draft'`)
   - Leave optional fields null when no evidence exists

4. **Create Document nodes** in the database:
   - Use the `Document` node label
   - Include all required fields: `projectId`, `documentNumber`, `revisionCode`, `docKind`, `title`, `type`, `status`
   - Include optional fields where data was extracted
   - Set `createdAt` and `updatedAt` timestamps
   - Create `[:BELONGS_TO_PROJECT]` relationship to the Project node

### Example Node Structure

```cypher
CREATE (d:Document {
  projectId: $projectId,
  documentNumber: "DWG-C-001",
  revisionCode: "B",
  docKind: "drawing",
  title: "Site General Arrangement",
  type: "drawing",
  discipline: "civil",
  status: "approved",
  issueDate: datetime("2024-01-15"),
  fileName: "site-ga-rev-b.pdf",
  createdAt: datetime(),
  updatedAt: datetime(),
  isDeleted: false
})
```

### Validation Checklist

- [ ] `projectId` is set and matches the Project node
- [ ] `documentNumber` is unique and descriptive
- [ ] `docKind` is either 'drawing' or 'document'
- [ ] `type` uses valid enum value from schema
- [ ] `discipline` uses valid lowercase enum value (if set)
- [ ] `status` is set (default to 'draft')
- [ ] All field names use camelCase
- [ ] All values have supporting evidence from the document

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the Document schema from `master-schema.ts`:

**Required fields:**
- `projectId` (string UUID)
- `documentNumber` (string)
- `revisionCode` (string)
- `docKind` ('drawing' | 'document')
- `title` (string)
- `type` ('specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'correspondence' | 'other')
- `status` ('draft' | 'in_review' | 'approved' | 'superseded' | 'archived')

**Optional fields:**
- `discipline` ('civil' | 'structural' | 'electrical' | 'mechanical' | 'architectural' | 'other')
- `issueDate` (Date)
- `fileUrl` (string)
- `fileName` (string)

All output must be written as Neo4j Document nodes with proper relationships to the Project node.

