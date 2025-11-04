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
- Discipline (Civil, Structural, Electrical, Mechanical, Architectural)
- Sheet number
- Total sheets
- Scale (e.g., 1:100 @A1)
- Drawing type/subtype

### Documents

Non-drawing documents including:

- **Specifications** - Technical specifications (general spec, technical spec)
- **Reports** - Technical reports, test reports
- **Contracts** - Contract documents, conditions
- **Correspondence** - Letters, emails
- **Schedules** - Program schedules, payment schedules
- **Manuals** - Operation and maintenance manuals
- **Procedures** - Construction procedures, method statements
- **Other** - Other document types

**Document Metadata:**
- Document number
- Revision code
- Title
- Discipline
- Classification level (internal, confidential, public)
- Category (specification, report, contract, correspondence, schedule, manual, procedure, other)
- Subtype (non-prescriptive label inferred from evidence)

## Metadata Fields

### Core Fields

**docKind** (REQUIRED)
- Either "drawing" or "document"
- Based on evidence in filename and content

**documentNumber** (string or null)
- Unique document identifier
- Extract from title block or document header
- Examples: "C-001", "SPEC-123", "DWG-A-101"

**revisionCode** (string or null)
- Revision identifier
- Common formats: "A", "B", "C" or "R0", "R1", "R2" or "Rev A", "Rev 1"
- Extract from revision field in title block

**title** (string or null)
- Document title
- Extract from title field in document
- Should be concise and descriptive

**discipline** (string or null)
- Engineering discipline
- Options: Civil, Structural, Electrical, Mechanical, Architectural, Hydraulic, Geotechnical
- Extract from discipline field or infer from content

**classificationLevel** (string or null)
- Security/confidentiality classification
- Common values: Internal, Confidential, Public, Commercial in Confidence
- Default to "Internal" if not stated

### Drawing-Specific Fields

**sheetNumber** (string or null)
- Sheet number within document set
- Example: "1", "2 of 10", "A-101"

**totalSheets** (integer or null)
- Total number of sheets in document set
- Extract from "Sheet X of Y" notation

**scale** (string or null)
- Drawing scale
- Examples: "1:100 @A1", "1:50", "NTS" (not to scale), "As shown"

### Document-Specific Fields

**category** (string or null)
- High-level document category
- Options: specification, report, contract, correspondence, schedule, manual, procedure, other

**subtype** (string or null)
- More specific document type
- Non-prescriptive label inferred from evidence
- Examples for documents: generalSpec, technicalSpec, methodStatement, contractConditions
- Examples for drawings: generalArrangement, section, elevation, detail, plan, schedule, diagram, layout

### Additional Fields

**additionalFields** (JSON string or null)
- Additional metadata not covered by standard fields
- Must be a valid JSON object encoded as a string
- Example: `"{\"edition\":\"3rd\",\"issuingBody\":\"TfNSW\"}"`
- Do NOT return structured objects - return a string
- Common fields: edition, issuingBody, preparedBy, approvedBy, dateIssued

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

When discipline is not explicitly stated, infer from:

**Civil:**
- Roads, earthworks, pavements
- Drainage, stormwater
- Site works, retaining walls

**Structural:**
- Structural frames, beams, columns
- Foundations, footings
- Reinforcement details

**Architectural:**
- Building layouts, floor plans
- Elevations, facades
- Interior finishes

**Electrical:**
- Electrical systems, lighting
- Power distribution
- Cable schedules

**Mechanical:**
- HVAC systems
- Plumbing, fire services
- Mechanical equipment

**Hydraulic:**
- Water supply, sewer
- Pumping systems
- Hydraulic structures

## Category and Subtype Inference

### Specification Documents

**Category:** specification

**Subtypes:**
- generalSpec - General specifications
- technicalSpec - Technical/detailed specifications
- performanceSpec - Performance-based specifications

### Report Documents

**Category:** report

**Subtypes:**
- testReport - Laboratory test reports
- technicalReport - Engineering analysis reports
- inspectionReport - Inspection and audit reports
- surveyReport - Survey reports

### Contract Documents

**Category:** contract

**Subtypes:**
- contractConditions - General and special conditions
- contractSchedule - Contract schedules
- tenderDocuments - Tender documentation

## Task Instructions

You are tasked with extracting document metadata from project files:

1. **Get the projectId** - Query the Generated Database (port 7690) to get the Project node and its `projectId`:
   ```cypher
   MATCH (p:Project) RETURN p.projectId
   ```
   This UUID must be included in ALL Document entities you create.

2. **Query the Project Docs Database** (port 7688) to access:
   - Document files and content
   - Filenames
   - Existing partial metadata

3. **Analyze each document** to determine:
   - Whether it's a drawing or non-drawing document
   - Extract all available metadata fields
   - Infer missing fields where evidence exists
   - Set null for fields without evidence

3. **Classify systematically**:
   - Determine docKind first
   - Extract core fields
   - Extract type-specific fields (drawing vs document)
   - Compile additionalFields if present

4. **Validate extraction**:
   - Ensure docKind is set
   - Check that drawing-specific fields are only set for drawings
   - Verify additionalFields is a valid JSON string (not object)
   - Confirm all values have supporting evidence

5. **Write output** to the **Generated Database** (port 7690)

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the Document schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties (use camelCase for all field names)
- Required vs optional fields
- Field data types
- Validation rules
- Cypher CREATE statement format

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

