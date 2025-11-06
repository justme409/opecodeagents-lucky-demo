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
- **Required ITP summary for database** - For every ITP referenced in the PQP, capture sufficient metadata (docNo, workType, specRef, mandatory flag) so it can be written to the ManagementPlan `requiredItps` array.
- **Non-negotiable:** The `requiredItps` array must never be empty. Exhaust every project source (drawings, specifications, schedules, WBS/lot requirements). If the contract genuinely omits ITP references, synthesize an evidence-based list using best practice and flag each item with `source: "assumed"` inside `additionalNotes`.

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

3. **Query the Standards Database** (port 7687) to understand:
   - Jurisdiction-specific quality requirements
   - Applicable Australian Standards
   - Test method standards

4. **Analyze documentation** to determine:
   - Project-specific quality requirements
   - ITP requirements
   - Materials approval requirements
   - Testing frequencies
   - Hold and witness points

5. **Catalogue every required ITP before drafting content**
   - Build a master list from all sources (contract quality sections, schedules, WBS requirements, testing matrices, appendices).
   - For each ITP capture: `docNo`, `title/description`, `workType`, `specRef`, `mandatory` (true if contractually required or contains hold points).
   - Record provenance in `additionalNotes` (e.g., clause references, document IDs, or note "assumed" with reasoning).
   - Do not proceed to the narrative sections until the list is complete.

6. **Structure the PQP** according to jurisdictional template:
   - Use QLD template for Queensland projects
   - Use SA template for South Australia projects
   - Use VIC template for Victoria projects
   - Use NSW template for New South Wales projects
   - Use Generic template if no specific jurisdiction applies

7. **Integrate corporate QSE content** by:
   - Referencing existing corporate procedures
   - Creating project-specific content where gaps exist
   - Maintaining links to QSE system items

8. **Write output** to the **Generated Database** (port 7690)

9. **Persist required ITP metadata**
   - Build the `requiredItps` array on the ManagementPlan node. Each entry must include:
     - `docNo` - Exact ITP document number referenced in the PQP or source documents
     - `workType` - Work type or discipline the ITP covers
     - `mandatory` - `true` if the ITP is contractually required/has hold points; otherwise `false` (explicitly set `false` instead of omitting the property)
     - `specRef` - Specification or clause reference if available
     - `additionalNotes` - Source citations or "assumed" rationale when you had to infer the requirement
   - Keep a 1:1 mapping with the ITP register presented in the PQP. The database array and the register in the document must match exactly (same order, same content).
   - If you cannot verify any ITPs after exhaustive searching, escalate by creating a best-practice inferred list with clear assumptions—never leave the array empty.

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the Management Plan schema. See the output schema file copied to your workspace for the exact structure including:

- Plan metadata (title, revision, jurisdiction, standards)
- Section structure (hierarchical using parentId)
- Content blocks (text, bullets, numbered, table, note, link)
- QSE system references (as links)
- Cypher CREATE statement format

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

