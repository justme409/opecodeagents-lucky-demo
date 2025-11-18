# Project Quality Plan (PQP) Generation

## Context and Purpose

A Project Quality Plan (PQP) is a comprehensive document that describes how quality will be managed throughout the project lifecycle. It demonstrates the contractor's commitment to quality and compliance with ISO 9001 (AS/NZS ISO 9001) and project-specific quality requirements.

The PQP serves multiple critical functions:

1. **Quality System Documentation** - Demonstrates ISO 9001 compliance
2. **Process Control** - Defines procedures for controlling work quality
3. **Inspection and Testing** - Establishes ITP requirements and test frequencies
4. **Materials Management** - Controls materials approval and certification
5. **Records Management** - Defines documentation and record-keeping requirements
6. **Non-Conformance Management** - Establishes procedures for managing NCRs

The PQP is typically a pre-start contractual deliverable that the Principal treats as a hold point before site mobilisation. Issue the initial plan prior to commencing construction activities, then revise it at each major phase gate or whenever scope changes introduce new work lots, ITPs, or quality risks that warrant updated controls.

## Regulatory and Standards Context

### ISO 9001:2016 (AS/NZS ISO 9001)

The PQP must demonstrate compliance with ISO 9001 requirements:

- **Clause 4** - Context of the organization and quality management system
- **Clause 5** - Leadership and commitment to quality
- **Clause 6** - Planning for quality objectives
- **Clause 7** - Support (resources, competence, documented information)
- **Clause 8** - Operational planning and control
- **Clause 9** - Performance evaluation and monitoring
- **Clause 10** - Improvement and corrective action

### Jurisdiction-Specific Requirements

Different Australian jurisdictions have specific quality system requirements:

**Queensland (MRTS50):**
- Department of Transport and Main Roads specifications
- Specific quality system requirements
- Hold points and witness points
- NATA testing requirements
- CMTSRS compliance

**South Australia:**
- Department for Infrastructure and Transport requirements
- SA-specific quality procedures
- State road authority requirements

**Victoria (Section 168A):**
- Department of Transport (Vic) requirements
- VicRoads specifications
- Quality management system requirements

**New South Wales:**
- Transport for NSW requirements
- RMS specifications and standards
- QA Specification compliance

## PQP Structure

### Standard PQP Sections

1. **Introduction** - Project overview and quality policy
2. **Definitions** - Definition of quality terms
3. **Referenced Documents** - Standards, specifications, codes
4. **Quality System Requirements** - ISO 9001 compliance demonstration

5. **Project Quality Plan** including:
   - Quality objectives and commitment
   - Roles, responsibilities and authorities
   - Construction procedures and ITPs
   - Lot numbering, identification and registration
   - Materials approval and control
   - Sampling and testing (frequencies, NATA, CMTSRS)
   - Hold points, witness points, milestones and records
   - Document control and distribution
   - Non-conformance and corrective action
   - Internal audits and management review

6. **Annexures** (as required):
   - ITP Register
   - Materials Register
   - Testing Schedule
   - Hold Point Register
   - Roles and Responsibilities Matrix

## Technical Requirements

### Document Control
- Version control procedures
- Distribution lists
- Approval processes
- Document retention

### Lot Control System
- Lot numbering methodology
- Lot identification and tracking
- Lot registration procedures
- Conformance process

### Materials Management
- Materials approval process
- Certification requirements
- Material traceability
- Storage and handling

### Inspection and Test Plans
- ITP register (comprehensive list)
- ITP approval process
- Hold point identification
- Witness point procedures
- Testing frequencies
- NATA requirements
- **Required ITP summary for database** - For every ITP referenced in the PQP, capture exactly the schema fields (`docNo`, `workType`, `mandatory`, optional `specRef`) so it can be written to the ManagementPlan `requiredItps` array.
- **Non-negotiable:** The `requiredItps` array must never be empty. Exhaust every project source (drawings, specifications, schedules, WBS/lot requirements). If the contract genuinely omits ITP references, synthesize an evidence-based list using best practice and mark each entry as "assumed" inside the PQP narrative or plan notes.

### Sampling and Testing
- Test method references
- Sampling frequencies
- Laboratory requirements
- Test result reporting
- Non-conformance thresholds

### Non-Conformance Management
- NCR raising process
- Investigation procedures
- Root cause analysis
- Corrective action
- Close-out procedures

### Records and Documentation
- Quality records to be maintained
- Record storage and retention
- Traceability requirements
- Handover documentation

## ITP Handling

When extracting lists of ITPs (Inspection and Test Plans):

- Copy them exactly from the supplied PROJECT DOCUMENTS list
- Maintain a 1:1 correspondence - do not combine items
- Do not leave any out
- Preserve the original structure and content as provided
- Include all hold points and witness points as specified
- **Cross-check:** Reconcile the extracted list against WBS requirements, lot registers, and testing schedules to ensure no ITP is overlooked.

## QSE System Integration

The PQP should leverage existing corporate QSE (Quality, Safety, Environment) system procedures where available:

- Reference corporate procedures by title and path
- Do not duplicate corporate content - cross-reference instead
- Only reference items present in the provided QSE system reference
- Where no relevant corporate procedure exists, develop project-specific content
- Indicate which procedures are project-specific vs corporate

Record each adopted corporate procedure by linking or referencing its existing `Document` or `ITPTemplate` node and capture any project-specific supplements inside the plan narrative or plan notes.

## Content Requirements

### Exhaustive and Implementable
- Be highly detailed across ALL sections
- Target comprehensive, practitioner-level content
- Expand major sections into multiple detailed entries
- Prefer specificity grounded in project documents
- Where project documents are absent, provide best-practice defaults and mark as "Assumption"

### Detailed Section Content

For each relevant topic include:
- Purpose and scope
- Definitions
- Roles and responsibilities
- Step-by-step procedures
- Required resources and tools
- Competency requirements
- References to standards/codes
- Acceptance criteria
- Inspection and test checkpoints
- Records and evidence to retain

### Matrices and Tables

Provide matrices/tables where suitable:
- RACI (Responsible, Accountable, Consulted, Informed)
- ITP register (with doc number, status, work type, spec reference, mandatory/optional flag)
- Materials register
- Testing schedule with frequencies
- Hold point register
- Document register
- KPIs with targets and measurement methods

## Task Instructions

You are tasked with generating a comprehensive PQP based on project documentation:

1. **Get the projectId** - Query the Generated Database (port 7690) to get the Project node and its `projectId`:
   ```cypher
   MATCH (p:Project) RETURN p.projectId
   ```
   This UUID must be included in the ManagementPlan entity you create.

2. **Query the Project Docs Database** (port 7688) to access:
   - Contract quality requirements
   - Specifications and technical requirements
   - Existing quality procedures
   - ITP lists and requirements
   - Testing requirements

3. **Query the IMS/QSE Database** (port 7689) to find corporate content:
   - Search for relevant quality procedures
   - Find approved templates and forms
   - Identify applicable registers
   - Reference existing corporate procedures instead of duplicating
   - See `ims-integration-guide.md` for detailed integration instructions

4. **Query the Standards Database** (port 7687) to understand:
   - Jurisdiction-specific quality requirements
   - Applicable Australian Standards
   - Test method standards

5. **Analyze documentation** to determine:
   - Project-specific quality requirements
   - ITP requirements
   - Materials approval requirements
   - Testing frequencies
   - Hold and witness points

6. **Catalogue every required ITP before drafting content**
   - Build a master list from all sources (contract quality sections, schedules, WBS requirements, testing matrices, appendices).
   - For each ITP capture exactly the schema fields (`docNo`, `workType`, `mandatory`, optional `specRef`) so the data aligns with `ManagementPlan.requiredItps`.
   - Document provenance and any assumed rationale within the PQP narrative, plan notes, or linked source documents rather than adding extra properties to the array.
   - Do not proceed to the narrative sections until the list is complete.

7. **Structure the PQP** according to jurisdictional template:
   - Use QLD template (MRTS50) for Queensland projects
   - Use SA template (PC-QA2) for South Australia projects
   - Use VIC template (Section 160) for Victoria projects
   - Use NSW template (TfNSW Q6) for New South Wales projects
   - Use Generic template if no specific jurisdiction applies
   
   **Available Templates:**

### QLD Template (MRTS50)
```json
{
  "title": "Queensland Project Quality Plan (PQP) — Layout (MRTS50)",
  "revision": "March 2025",
  "metadata": {
    "jurisdiction": "QLD",
    "agency": "Department of Transport and Main Roads",
    "source_document": "MRTS50 Specific Quality System Requirements",
    "standards": "AS/NZS ISO 9001"
  },
  "sections": [
    { "id": "introduction", "title": "Introduction (read with MRTS01)" },
    { "id": "definitions", "title": "Definition of Terms" },
    { "id": "referenced-docs", "title": "Referenced Documents" },
    { "id": "quality-system", "title": "Quality System Requirements (ISO 9001 compliant)" },
    {
      "id": "quality-plan",
      "title": "Project Quality Plan",
      "children": [
        { "id": "objectives", "title": "Quality Objectives and Commitment" },
        { "id": "roles-responsibilities", "title": "Roles, Responsibilities and Authorities (incl. subcontractors)" },
        { "id": "procedures-itps", "title": "Construction Procedures and ITPs (register; schedule)" },
        { "id": "lot-control", "title": "Lot Numbering, Identification and Registration" },
        { "id": "materials-approval", "title": "Materials Approval and Control" },
        { "id": "sampling-testing", "title": "Sampling and Testing (frequencies; NATA; CMTSRS)" },
        { "id": "hold-witness", "title": "Hold Points, Witness Points, Milestones and Records" },
        { "id": "nonconformance", "title": "Nonconformance and Corrective Action Procedures" },
        { "id": "records", "title": "Records Retention and Access" }
      ]
    }
  ]
}
```

### SA Template (PC-QA2)
```json
{
  "title": "South Australia Project Quality Plan (PQP) — Layout (PC-QA2)",
  "revision": "September 2024",
  "metadata": {
    "jurisdiction": "SA",
    "agency": "Department for Infrastructure and Transport",
    "source_document": "Master Specification PC-QA2 Quality Management Requirements for Major Projects",
    "standards": "AS/NZS ISO 9001"
  },
  "sections": [
    { "id": "general", "title": "General" },
    {
      "id": "documentation",
      "title": "Documentation",
      "children": [
        { "id": "pqp", "title": "Project Quality Plan (content; organisation; policy; team)" },
        { "id": "as-built", "title": "As-Built Records (digital engineering; registers; QA records)" }
      ]
    },
    { "id": "qms", "title": "Quality Management System (ISO 9001; accessibility; electronic)" },
    { "id": "management-responsibility", "title": "Management Responsibility and Authority (Construction Quality Representative)" },
    { "id": "resource-management", "title": "Resource Management (competency; calibration; equipment)" },
    { "id": "product-realisation", "title": "Product Realisation (procurement; subcontracting; design involvement)" },
    { "id": "work-lots", "title": "Work Lots and Traceability (lot registers; validation)" },
    { "id": "inspection-testing", "title": "Inspection and Testing (ITPs; schedules; competency)" },
    { "id": "nonconformance", "title": "Non-Conformance and System Non-Conformance (registers)" },
    { "id": "audits-surveillance", "title": "Auditing, Surveillance and Notices (Principal, IDC, CV involvement)" },
    { "id": "performance-eval", "title": "Performance Evaluation and Improvement (CAPA register)" },
    { "id": "hold-witness", "title": "Hold Points and Witness Points (register; durations; delegation)" }
  ]
}
```

### VIC Template (Section 160)
```json
{
  "title": "Victoria Project Quality Plan (PQP) — Layout (Section 160 Part A)",
  "revision": "November 2018",
  "metadata": {
    "jurisdiction": "VIC",
    "agency": "Department of Transport (Vic)",
    "source_document": "Section 160 Construction General (Part A Management Systems)",
    "standards": "AS/NZS ISO 9001; AS/NZS ISO 14001; AS/NZS 4801/ISO 45001"
  },
  "sections": [
    { "id": "qms-standards", "title": "Quality Management System Standards and Definitions" },
    { "id": "qmr", "title": "Quality Management Representative" },
    {
      "id": "quality-plans",
      "title": "Quality Plans and Procedures",
      "children": [
        { "id": "incident", "title": "Incident Management and Reporting (cross-ref Sections 168 & 176)" },
        { "id": "mgmt-system-plans", "title": "Management System Plans: TMP, EMP, HS Coordination Plan" },
        { "id": "hold-points", "title": "Nominated Hold Points" },
        { "id": "records", "title": "Records (format; indexing; media requirements)" },
        { "id": "surveillance-audits", "title": "Surveillance and Audits by the Superintendent" }
      ]
    }
  ]
}
```

### NSW Template (TfNSW Q6)
```json
{
  "title": "New South Wales Project Quality Plan (PQP) — Layout (TfNSW Q6)",
  "revision": "February 2024",
  "metadata": {
    "jurisdiction": "NSW",
    "agency": "Transport for NSW",
    "source_document": "QA Specification Q6 Quality Management (Major Works)",
    "standards": "AS/NZS ISO 9001; AS ISO 10005; AS/NZS ISO 10013"
  },
  "sections": [
    { "id": "scope", "title": "General and Scope" },
    { "id": "quality-manual", "title": "Quality Manual (structure; mapping to ISO 9001)" },
    {
      "id": "project-quality-plan",
      "title": "Project Quality Plan",
      "children": [
        { "id": "staging", "title": "Stage Submissions (coverage of activities)" },
        { "id": "pqr", "title": "Project Quality Representative (authority; availability)" },
        { "id": "competence", "title": "Competence and Awareness (induction and training)" },
        { "id": "design-dev", "title": "Design and Development (design plans; verification)" },
        { "id": "process-control", "title": "Work Process Controls (validation; responsibilities; records)" },
        { "id": "itps", "title": "Inspection and Test Plans (lot definition; sampling; testing)" },
        { "id": "procurement", "title": "Procurement and Supplier Control" },
        { "id": "meas-equip", "title": "Monitoring and Measuring Equipment (calibration; NATA)" }
      ]
    }
  ]
}
```

### Generic Template (Consolidated)
```json
{
  "title": "Generic Project Quality Plan — Consolidated Layout",
  "metadata": {
    "jurisdiction": "Generic",
    "source_basis": "QLD MRTS50; SA PC-QA2; VIC Section 160; NSW TfNSW Q6",
    "standards": "AS/NZS ISO 9001; AS ISO 10005; AS/NZS ISO 10013"
  },
  "sections": [
    { "id": "intro", "title": "Introduction and Referenced Documents" },
    { "id": "qms", "title": "Quality Management System (ISO 9001)" },
    {
      "id": "pqp",
      "title": "Project Quality Plan",
      "children": [
        { "id": "objectives", "title": "Objectives and Policy" },
        { "id": "roles", "title": "Roles and Responsibilities (PQR; org chart)" },
        { "id": "design-procurement", "title": "Design, Procurement and Subcontractor Control" },
        { "id": "itps", "title": "ITPs; Sampling and Testing; Lot Control" },
        { "id": "hold-witness", "title": "Hold/Witness Points and Milestones" },
        { "id": "nonconformance", "title": "Nonconformance and Corrective Actions" },
        { "id": "records", "title": "Records Management and Retention" }
      ]
    }
  ]
}
```

8. **Integrate corporate IMS/QSE content** by:
   - Query the IMS database (port 7689) for relevant procedures.
   - Reference existing corporate procedures inline (e.g., include the reference inside the section `body` text).
   - Only write project-specific content where no corporate equivalent exists.
   - Clearly separate corporate references from project-specific requirements inside the narrative.
   - See `ims-integration-guide.md` for detailed patterns and examples.

9. **Write output** to the **Generated Database** (port 7690)

10. **Persist required ITP metadata**
   - Build the `requiredItps` array on the ManagementPlan node. Each entry must include:
     - `docNo` - Exact ITP document number referenced in the PQP or source documents
     - `workType` - Work type or discipline the ITP covers
     - `mandatory` - `true` if the ITP is contractually required/has hold points; otherwise `false` (explicitly set `false` instead of omitting the property)
     - `specRef` - Specification or clause reference if available
    - Capture source citations or any "assumed" rationale within the PQP narrative, plan notes, or supporting documents instead of adding extra array properties.
   - Keep a 1:1 mapping with the ITP register presented in the PQP. The database array and the register in the document must match exactly (same order, same content).
   - If you cannot verify any ITPs after exhaustive searching, escalate by creating a best-practice inferred list with clear assumptions—never leave the array empty.

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the Management Plan schema defined in `AGENT_SCHEMA.md`. Follow the instructions in `Writing to Generated DB.md` exactly.

### PQP-Specific Requirements

**ManagementPlan Node:**
- Use `MERGE` with `{projectId: 'xxx', type: 'PQP'}` as the unique key.
- Required properties: `type: 'PQP'`, `title`, `version`, `approvalStatus`, `projectId`, `createdAt`, `updatedAt`.
- Optional properties: `summary`, `notes`.
- **Important:** Neo4j cannot store arrays of objects, so serialize `requiredItps` to a JSON string that matches the schema shape.
  - Example: `requiredItps: '[{"docNo":"ITP-01","workType":"Earthworks","mandatory":true,"specRef":"Section X"}]'`

**DocumentSection Nodes:**
- Use `CREATE` for sections after you have `MERGE`d the parent plan.
- Required properties (as per schema):
  - `projectId`
  - `containerType`, `containerId`/`containerKey` when applicable
  - `sectionId` (e.g., `PQP-SEC-1`)
  - `headingNumber`
  - `heading`
  - `level` (use `0` for top-level sections if no nesting)
  - `orderIndex`
  - `body` (full narrative content; HTML is acceptable)
  - `summary` (optional short synopsis)
  - `createdAt`, `updatedAt`
- Keep IMS/QSE cross-references inside the `body` text rather than new properties so the schema stays canonical.

**Relationships:**
- `(:ManagementPlan)-[:HAS_SECTION]->(:DocumentSection)` for all top-level sections.
- `(:DocumentSection)-[:HAS_SUBSECTION]->(:DocumentSection)` for nested sections (if applicable).
- `(:ManagementPlan)-[:BELONGS_TO_PROJECT]->(:Project)` must exist.

**ITP Nodes (if creating separate ITP nodes):**
- `MERGE` with `{projectId: 'xxx', docNo: 'ITP-01'}` as the key.
- Connect them via the relationships defined in the schema (for example `(:ManagementPlan)-[:HAS_ITP]->(:ITPTemplate)`).

Always follow the upload process described in `shared/Writing to Generated DB.md` when executing Cypher.

## Complete Cypher Example with Detailed Content

**CRITICAL:** This example demonstrates the level of detail required for EVERY section. Each section must have multiple paragraphs, tables, procedures, and specific project details - NOT just one-sentence stubs.

```cypher
// Example PQP with COMPREHENSIVE, DETAILED sections using APOC
CALL apoc.cypher.runMany('
// Step 1: Create/update project
MERGE (p:Project {projectId: "example-project-123"})
SET p.projectName = "Example Road Project", 
    p.updatedAt = datetime();

// Step 2: Create/update management plan
MATCH (p:Project {projectId: "example-project-123"})
MERGE (mp:ManagementPlan {projectId: p.projectId, type: "PQP"})
ON CREATE SET mp.createdAt = datetime()
SET mp.title = "Project Quality Plan - Example Road Project",
    mp.version = "1.0",
    mp.approvalStatus = "draft",
    mp.summary = "Comprehensive PQP demonstrating ISO 9001 compliance for road reconstruction works including pavement, drainage, and landscaping.",
    mp.notes = "Integrates corporate QSE procedures. ITPs derived from contract specifications.",
    mp.requiredItps = "[{\"docNo\":\"ITP-EW-01\",\"workType\":\"Earthworks\",\"mandatory\":true,\"specRef\":\"Section D 2.4\"}]",
    mp.updatedAt = datetime()
MERGE (mp)-[:BELONGS_TO_PROJECT]->(p);

// Step 3: Section 9 - Non-Conformance Management - DETAILED EXAMPLE
MATCH (mp:ManagementPlan {projectId: "example-project-123", type: "PQP"})
CREATE (sec9:DocumentSection {
  projectId: mp.projectId,
  sectionId: "PQP-SEC-9",
  headingNumber: "9",
  heading: "Non-Conformance and System Non-Conformance Management",
  level: 0,
  orderIndex: 9,
  body: "<h2>9. Non-Conformance and System Non-Conformance Management</h2>

<h3>9.1 Purpose and Scope</h3>
<p>This section establishes comprehensive procedures for identifying, documenting, investigating, and resolving non-conformances (NCRs) and system non-conformances that occur during the Example Road Project. The process ensures that all deviations from specified requirements are properly managed in accordance with ISO 9001:2016 Clause 10.2, corrective actions are implemented effectively, and preventive measures are established to avoid recurrence.</p>

<p>The NCR process applies to all project activities including design, procurement, construction, testing, and commissioning. It covers both product non-conformances (defects in physical works) and system non-conformances (failures in quality management processes).</p>

<p><strong>Scope of Application:</strong></p>
<ul>
  <li><strong>Materials:</strong> All materials supplied to site including aggregates, asphalt, concrete, steel, pipes, and proprietary products</li>
  <li><strong>Workmanship:</strong> All construction activities including earthworks, pavement construction, drainage installation, kerbing, and landscaping</li>
  <li><strong>Testing:</strong> All quality testing including compaction tests, asphalt density, concrete strength, and material certifications</li>
  <li><strong>Documentation:</strong> All quality records including ITPs, test results, material certificates, and as-built drawings</li>
  <li><strong>Processes:</strong> All QMS processes including document control, training, audits, and management review</li>
</ul>

<p><strong>Exclusions:</strong> Safety incidents are managed under the OHSMP incident management process (cross-reference Section 168A). Environmental incidents are managed under the EMP (cross-reference PC-ENV1). However, quality aspects of safety/environmental incidents (e.g., non-compliant safety barriers, ineffective erosion controls) are managed through this NCR process.</p>

<p><strong>Regulatory Context:</strong> This NCR process ensures compliance with:</p>
<ul>
  <li>ISO 9001:2016 Clause 10.2 (Nonconformity and Corrective Action)</li>
  <li>Contract Specification Section D 2.4.5 (Quality Non-Conformance Requirements)</li>
  <li>SA PC-QA2 Master Specification (Non-Conformance and System Non-Conformance)</li>
  <li>Corporate QSE-10.2-PROC-01 (Non-Conformance and Corrective Action Procedure)</li>
</ul>

<h3>9.2 Definitions</h3>
<ul>
  <li><strong>Non-Conformance (NCR):</strong> A deficiency in characteristic, documentation, or procedure that renders the quality of an item or activity unacceptable or indeterminate. Examples include failed tests, incorrect materials, work not per specification.</li>
  <li><strong>System Non-Conformance:</strong> A failure of the quality management system itself to meet specified requirements, such as missing ITPs, inadequate training records, or procedural non-compliance.</li>
  <li><strong>Root Cause:</strong> The fundamental reason for the occurrence of a non-conformance, identified through systematic investigation (5 Whys, Fishbone analysis).</li>
  <li><strong>Corrective Action:</strong> Action taken to eliminate the cause of a detected non-conformance to prevent recurrence.</li>
  <li><strong>Preventive Action:</strong> Action taken to eliminate the cause of a potential non-conformance.</li>
</ul>

<h3>9.3 Roles and Responsibilities</h3>
<table border='1' cellpadding='5'>
  <tr><th>Role</th><th>Responsibility</th><th>Authority</th></tr>
  <tr>
    <td>Construction Quality Representative (CQR)</td>
    <td>Review and approve all NCRs, verify effectiveness of corrective actions, report to Principal, maintain NCR register</td>
    <td>Authority to stop work for quality issues, reject non-conforming work</td>
  </tr>
  <tr>
    <td>Site Supervisor</td>
    <td>Identify non-conformances during inspections, initiate NCR process, implement corrective actions, coordinate with subcontractors</td>
    <td>Authority to quarantine non-conforming materials/work</td>
  </tr>
  <tr>
    <td>Project Manager</td>
    <td>Ensure resources available for corrective actions, approve major NCRs (>$10k impact), review NCR trends monthly</td>
    <td>Final authority on NCR disposition (rework, repair, accept with concession)</td>
  </tr>
  <tr>
    <td>Quality Manager (Corporate)</td>
    <td>Audit NCR process quarterly, review system non-conformances, provide technical guidance</td>
    <td>Authority to escalate systemic issues to senior management</td>
  </tr>
</table>

<h3>9.4 NCR Identification and Initiation</h3>
<p>Non-conformances may be identified through:</p>
<ul>
  <li>Failed ITP inspections or tests</li>
  <li>Internal quality audits</li>
  <li>Principal surveillance or audits</li>
  <li>Material testing failures (non-NATA or NATA)</li>
  <li>Subcontractor work deficiencies</li>
  <li>Customer complaints</li>
  <li>Self-identification by site personnel</li>
</ul>

<p><strong>Initiation Process:</strong></p>
<ol>
  <li>Person identifying the non-conformance immediately notifies Site Supervisor and CQR</li>
  <li>Affected work/materials are quarantined with physical barriers and signage</li>
  <li>NCR form (QSE-10.2-FORM-01) is raised within 24 hours in ProjectPro system</li>
  <li>Photographic evidence is attached to NCR record</li>
  <li>Principal is notified within 48 hours for major NCRs (safety impact, program impact >5 days, cost impact >$10k)</li>
</ol>

<h3>9.5 NCR Investigation and Root Cause Analysis</h3>
<p>The CQR leads a systematic investigation within 5 working days of NCR initiation. The investigation follows a structured approach to ensure thorough analysis and identification of true root causes, not just symptoms.</p>

<h4>9.5.1 Investigation Process</h4>
<ol>
  <li><strong>Initial Assessment (Day 1):</strong>
    <ul>
      <li>Site inspection of non-conforming work/materials with photographic documentation</li>
      <li>Review of relevant ITP records, test results, and material certificates</li>
      <li>Interview personnel involved (operators, supervisors, inspectors)</li>
      <li>Secure all physical evidence (samples, failed materials, equipment records)</li>
      <li>Determine immediate containment actions to prevent further non-conformances</li>
    </ul>
  </li>
  <li><strong>Evidence Gathering (Days 1-3):</strong>
    <ul>
      <li>Collect all relevant documentation: drawings, specifications, work method statements, previous ITPs</li>
      <li>Review material delivery dockets and certificates of compliance</li>
      <li>Check calibration records for testing equipment used</li>
      <li>Obtain witness statements from site personnel</li>
      <li>Review weather records if environmental factors suspected</li>
      <li>Check training records and competency assessments for involved personnel</li>
      <li>Review subcontractor quality plans and approvals if applicable</li>
    </ul>
  </li>
  <li><strong>Immediate Cause Determination (Day 3):</strong>
    <ul>
      <li>Analyze evidence to determine what directly caused the non-conformance</li>
      <li>Consider multiple contributing factors (materials, methods, equipment, personnel, environment)</li>
      <li>Document the sequence of events leading to the non-conformance</li>
      <li>Identify any procedural deviations or specification non-compliance</li>
    </ul>
  </li>
  <li><strong>Root Cause Analysis (Days 3-5):</strong>
    <ul>
      <li>Use 5 Whys technique for simple non-conformances</li>
      <li>Use Fishbone (Ishikawa) diagram for complex non-conformances with multiple factors</li>
      <li>Consider all potential root cause categories: Man, Machine, Material, Method, Measurement, Environment</li>
      <li>Distinguish between root causes (fundamental issues) and symptoms (surface-level problems)</li>
      <li>Validate root cause by testing if eliminating it would prevent recurrence</li>
    </ul>
  </li>
  <li><strong>Categorization:</strong> Classify the non-conformance by:
    <ul>
      <li><strong>Type:</strong> Material defect, workmanship, design issue, procedural failure, equipment failure, environmental factor, system failure</li>
      <li><strong>Severity:</strong> 
        <ul>
          <li>Critical: Safety risk, structural integrity compromised, major cost/schedule impact (>$50k or >10 days)</li>
          <li>Major: Specification non-compliance, requires rework, moderate impact ($10k-$50k or 5-10 days)</li>
          <li>Minor: Cosmetic defect, minor deviation, minimal impact (<$10k or <5 days)</li>
        </ul>
      </li>
      <li><strong>Responsibility:</strong> Contractor, subcontractor, supplier, designer, Principal, third party</li>
    </ul>
  </li>
  <li><strong>Documentation (Day 5):</strong>
    <ul>
      <li>Complete NCR investigation report with all findings</li>
      <li>Attach all supporting evidence (photos, test results, statements)</li>
      <li>Document root cause analysis with diagrams/charts</li>
      <li>Provide recommendations for corrective and preventive actions</li>
      <li>Submit to Project Manager for disposition decision</li>
    </ul>
  </li>
</ol>

<h4>9.5.2 Root Cause Analysis Techniques</h4>

<p><strong>5 Whys Method (for simple non-conformances):</strong></p>
<p>Ask "Why?" five times to drill down from symptom to root cause. Each answer becomes the basis for the next question.</p>

<p><strong>Example 1 - Asphalt Compaction Failure:</strong></p>
<pre>
NCR-045: Asphalt compaction test failed - achieved 96% density, specification requires 98%

Why did compaction fail?
→ Insufficient roller passes completed (only 4 passes, ITP requires 6)

Why were insufficient roller passes completed?
→ Roller operator believed 4 passes was sufficient based on previous experience

Why did operator not follow ITP requirement of 6 passes?
→ Operator was not aware of the specific ITP requirement for this asphalt mix

Why was operator not aware of ITP requirements?
→ Operator did not attend pre-start briefing where ITP was reviewed

Why did operator not attend pre-start briefing?
→ No system to verify attendance at pre-start briefings or sign-off on ITP understanding

ROOT CAUSE: Inadequate verification system for personnel understanding of ITP requirements before commencing work
</pre>

<p><strong>Example 2 - Material Non-Conformance:</strong></p>
<pre>
NCR-067: Concrete strength test failed - achieved 28 MPa at 28 days, specification requires 32 MPa

Why did concrete fail strength test?
→ Incorrect water-cement ratio used in mix

Why was incorrect w/c ratio used?
→ Batch plant operator added extra water to improve workability

Why did operator add extra water?
→ Concrete was too stiff to pump, site requested more workable mix

Why was concrete too stiff?
→ Mix design not optimized for pumping distance (120m) and ambient temperature (35°C)

Why was mix design not suitable?
→ Pre-pour trial mix not conducted to verify pumpability under site conditions

ROOT CAUSE: Inadequate pre-construction testing and mix design verification process
</pre>

<p><strong>Fishbone Diagram Method (for complex non-conformances):</strong></p>
<p>For non-conformances with multiple contributing factors, use a Fishbone (Ishikawa) diagram to systematically examine all potential causes across six categories:</p>

<table border='1' cellpadding='5'>
  <tr><th>Category</th><th>Questions to Ask</th><th>Example Causes</th></tr>
  <tr>
    <td><strong>Man (Personnel)</strong></td>
    <td>Was personnel competent? Trained? Experienced? Supervised?</td>
    <td>Insufficient training, lack of experience, fatigue, inadequate supervision, language barriers</td>
  </tr>
  <tr>
    <td><strong>Machine (Equipment)</strong></td>
    <td>Was equipment suitable? Calibrated? Maintained? Operated correctly?</td>
    <td>Equipment malfunction, incorrect equipment selection, poor maintenance, calibration expired</td>
  </tr>
  <tr>
    <td><strong>Material</strong></td>
    <td>Was material correct? Certified? Stored properly? Within specification?</td>
    <td>Wrong material supplied, material degradation, contamination, inadequate certification</td>
  </tr>
  <tr>
    <td><strong>Method (Process)</strong></td>
    <td>Was procedure followed? Was procedure adequate? Were controls effective?</td>
    <td>Procedure not followed, inadequate procedure, missing steps, unclear instructions</td>
  </tr>
  <tr>
    <td><strong>Measurement</strong></td>
    <td>Was testing correct? Was equipment calibrated? Was method appropriate?</td>
    <td>Incorrect test method, equipment not calibrated, sampling errors, measurement errors</td>
  </tr>
  <tr>
    <td><strong>Environment</strong></td>
    <td>Were conditions suitable? Were weather impacts considered? Was site prepared?</td>
    <td>Adverse weather, temperature extremes, site constraints, access limitations</td>
  </tr>
</table>

<h4>9.5.3 Investigation Documentation Requirements</h4>
<p>All NCR investigations must include the following documentation in the ProjectPro NCR module:</p>
<ul>
  <li><strong>Investigation Report:</strong> Narrative summary of investigation process and findings (minimum 500 words for major NCRs)</li>
  <li><strong>Evidence Package:</strong>
    <ul>
      <li>Minimum 5 photos showing extent and nature of non-conformance</li>
      <li>All relevant test results (original and re-test if applicable)</li>
      <li>Material certificates and delivery dockets</li>
      <li>ITP records showing inspection history</li>
      <li>Witness statements (minimum 2 for major NCRs)</li>
    </ul>
  </li>
  <li><strong>Root Cause Analysis:</strong> 5 Whys diagram or Fishbone diagram attached as PDF</li>
  <li><strong>Timeline:</strong> Sequence of events from work commencement to non-conformance identification</li>
  <li><strong>Impact Assessment:</strong> Cost impact, schedule impact, safety implications, quality implications</li>
  <li><strong>Recommendations:</strong> Proposed corrective actions and preventive measures</li>
</ul>

<h3>9.6 Corrective Action and Disposition</h3>
<p>Based on investigation findings, the Project Manager determines disposition:</p>
<table border='1' cellpadding='5'>
  <tr><th>Disposition</th><th>Description</th><th>Approval Required</th></tr>
  <tr>
    <td>Rework</td>
    <td>Remove and replace non-conforming work to achieve full specification compliance</td>
    <td>CQR approval, Principal notification</td>
  </tr>
  <tr>
    <td>Repair</td>
    <td>Rectify non-conformance through additional work (e.g., additional compaction passes, surface treatment)</td>
    <td>CQR approval, Principal notification if specification not fully met</td>
  </tr>
  <tr>
    <td>Accept with Concession</td>
    <td>Accept non-conforming work where it does not affect fitness for purpose or safety</td>
    <td>Principal written approval required via Request for Concession (RFC)</td>
  </tr>
  <tr>
    <td>Reject</td>
    <td>Reject materials/work from site, return to supplier</td>
    <td>CQR approval, supplier notification</td>
  </tr>
</table>

<p><strong>Corrective Action Implementation:</strong></p>
<ol>
  <li>Corrective action plan developed within 3 working days, including method, resources, schedule</li>
  <li>Plan approved by CQR and Project Manager</li>
  <li>Works executed under ITP supervision</li>
  <li>Re-inspection/re-testing conducted and documented</li>
  <li>Verification that corrective action achieved specification compliance</li>
</ol>

<h3>9.7 Preventive Actions</h3>
<p>To prevent recurrence, the following preventive actions are implemented:</p>
<ul>
  <li><strong>Process Changes:</strong> Update procedures, ITPs, or work instructions to prevent similar issues</li>
  <li><strong>Training:</strong> Provide additional training to affected personnel, toolbox talks to all site staff</li>
  <li><strong>Enhanced Inspection:</strong> Increase inspection frequency for similar activities for next 10 occurrences</li>
  <li><strong>Supplier Management:</strong> Issue corrective action request to suppliers, review supplier performance</li>
  <li><strong>Equipment:</strong> Calibrate, repair, or replace equipment contributing to non-conformance</li>
</ul>

<h3>9.8 NCR Register and Tracking</h3>
<p>The CQR maintains the NCR Register in ProjectPro system with the following information:</p>
<ul>
  <li>NCR number (sequential: NCR-001, NCR-002, etc.)</li>
  <li>Date raised and date closed</li>
  <li>Location and description of non-conformance</li>
  <li>Category (material, workmanship, design, procedural, system)</li>
  <li>Severity (minor, major, critical)</li>
  <li>Root cause</li>
  <li>Disposition and corrective action</li>
  <li>Responsible person and target close date</li>
  <li>Status (open, under investigation, corrective action in progress, closed)</li>
  <li>Verification of effectiveness</li>
  <li>Cost impact</li>
</ul>

<p><strong>NCR Closure Criteria:</strong></p>
<ul>
  <li>Corrective action fully implemented and verified</li>
  <li>Re-inspection/re-testing passed and documented</li>
  <li>Preventive actions implemented</li>
  <li>Principal acceptance obtained (if required)</li>
  <li>All documentation complete in NCR file</li>
  <li>CQR sign-off in ProjectPro system</li>
</ul>

<p><strong>Target KPI:</strong> 95% of NCRs closed within 10 working days of identification.</p>

<h3>9.9 Reporting and Review</h3>
<p>NCR reporting occurs at multiple levels:</p>
<ul>
  <li><strong>Daily:</strong> Site Supervisor reviews open NCRs at daily toolbox meeting</li>
  <li><strong>Weekly:</strong> CQR provides NCR summary to Project Manager (number raised, closed, overdue)</li>
  <li><strong>Monthly:</strong> NCR trend analysis presented at project review meeting, including:
    <ul>
      <li>Total NCRs raised vs. closed</li>
      <li>NCRs by category and root cause</li>
      <li>Repeat non-conformances indicating systemic issues</li>
      <li>Average closure time</li>
      <li>Cost impact of non-conformances</li>
      <li>Effectiveness of preventive actions</li>
    </ul>
  </li>
  <li><strong>Quarterly:</strong> Corporate Quality Manager audits NCR process for compliance with QSE-10.2-PROC-01</li>
</ul>

<h3>9.10 System Non-Conformances</h3>
<p>System non-conformances (failures of the QMS itself) are managed through the same NCR process but with additional requirements:</p>
<ul>
  <li>Escalation to Corporate Quality Manager within 24 hours</li>
  <li>Root cause analysis must examine QMS documentation, training, and implementation</li>
  <li>Corrective actions may require QMS procedure updates at corporate level</li>
  <li>Management review required before closure</li>
  <li>Audit of corrective action effectiveness after 3 months</li>
</ul>

<h3>9.11 Integration with Corporate QSE System</h3>
<p>This NCR process aligns with corporate procedure <a href='https://projectpro.pro/ims/qse-10-2-proc-01'>QSE-10.2-PROC-01 Non-Conformance and Corrective Action</a>. The ProjectPro NCR module provides integration with:</p>
<ul>
  <li>Corporate NCR database for trend analysis across all projects</li>
  <li>Automated notifications to CQR and Project Manager</li>
  <li>Mobile app for field NCR raising with photo capture</li>
  <li>Dashboard reporting for management visibility</li>
  <li>Integration with ITP module to link NCRs to failed inspections</li>
</ul>

<h3>9.12 References</h3>
<ul>
  <li>ISO 9001:2016 Clause 10.2 - Nonconformity and Corrective Action</li>
  <li>Contract Specification Section D 2.4.5 - Quality Non-Conformance</li>
  <li>QSE-10.2-PROC-01 - Corporate Non-Conformance Procedure</li>
  <li>QSE-10.2-FORM-01 - NCR Form Template</li>
  <li>QSE-10.3-PROC-01 - Corrective and Preventive Action (CAPA) Procedure</li>
</ul>",
  summary: "Comprehensive NCR management process including identification, investigation, root cause analysis, corrective actions, and closure procedures with defined roles, responsibilities, and KPIs.",
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (mp)-[:HAS_SECTION]->(sec9);
', {});
```

**KEY POINTS FROM THIS EXAMPLE:**
1. Each section reads like a full professional chapter with multiple subsections
2. Includes tables, lists, procedures, examples, and specific details
3. References corporate procedures and standards
4. Defines roles with specific responsibilities and authorities
5. Provides step-by-step processes
6. Includes KPIs and measurement criteria
7. Contains real-world examples and scenarios
8. Links to related documents and forms

**YOUR SECTIONS MUST BE THIS DETAILED.** One-sentence stubs are NOT acceptable.

