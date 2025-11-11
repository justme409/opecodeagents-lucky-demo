# ITP Generation

## Context and Purpose

An Inspection and Test Plan (ITP) is a formal quality assurance document created for a specific project scope. It details all inspections and tests required to demonstrate that the work meets its contractual and regulatory requirements. In practice, an ITP "maps out inspection and testing checkpoints from start to finish" of a process. Within this platform, every generated ITP must exist as structured Neo4j data — primarily `ITPTemplate` nodes with linked `InspectionPoint` nodes — so the project team has an auditable quality record.

Under ISO 9001:2016 (AS/NZS ISO 9001) and typical contract Quality Management System (QMS) clauses, contractors must plan and control all production processes. Preparing ITPs is one way to fulfill ISO 9001 Clause 8 (operational planning and control) by documenting who will do each inspection, how it is done, and what the acceptance criteria are. The template data you create forms part of the compliance evidence reviewed during internal audits and government agency surveillance.

An ITP serves two main purposes:
1. To confirm that the contractor's in-process controls are effective
2. To verify that incoming materials and completed work pass specified acceptance criteria
3. To keep the `ITPTemplate` and `InspectionPoint` graph aligned with contractual obligations, enabling downstream ITP instances and compliance dashboards

## When Are ITPs Required?

ITPs are required whenever the project or applicable standards call for documented verification of quality. Key triggers include:

### Standards and Quality Systems

ISO 9001 (AS/NZS ISO 9001) requires documented procedures for controlling processes and verifying outputs. Construction standards (e.g. AS 3600 for concrete, AS/NZS 5131 for steel, AS 3798 for earthworks, AS 2159 for piling) specify technical criteria (compressive strengths, dimensional tolerances, test methods) that must be tested or inspected.

For example:
- AS/NZS 5131 (structural steel) mandates weld inspection
- AS 1379 and AS 3600 require concrete slump and cylinder tests
- Main Roads WA's steelwork spec requires ITPs for weld testing in accordance with AS/NZS 5131

### Contract Specifications

Project contracts almost always include quality clauses. Major road and bridge specifications (e.g. RMS/Austroads specifications) often list mandatory hold/witness points and require an ITP or Quality Plan.

NSW government GC21 "Quality Management" clauses instruct contractors to prepare a Quality Management Plan and Inspection and Test Plans covering the works. The NSW Government Quality Management Guidelines explicitly require contractors to "Submit Inspection and Test Plans (plus any associated checklists) for specified activities at least 14 days prior to work" and to "incorporate the listed Hold and Witness points".

### Typical Civil Activities

In practice, ITPs are usually required for major or safety-critical operations:

- **Concrete works** - Formwork, reinforcement placement, pouring and curing, including slump and strength tests
- **Steel fabrication and erection** - Welds, bolt torque, dimensional checks
- **Pavements and earthworks** - Layer thickness, density and compaction testing per AS 1289/AS 1141
- **Drainage and pipeline installation** - Pipe alignment, joint testing
- **Piling and foundations** - Borehole inspection, load tests
- **Electrical or mechanical installations** - Functional tests

### Hold and Witness Points

Contracts define Hold points (mandatory pauses) and Witness points (optional inspections) at critical stages. By definition, work cannot proceed past a hold point without the principal's or supervisor's approval.

Whenever the specification or contract contains hold/witness points for a work item, the contractor's ITP must reflect them. In the ITP each hold point is explicitly flagged (often with an "H" in a column) and requires an inspector's signature before continuing. Witness points (marked "W") indicate the client or engineer may attend for inspection, but work may continue if they choose not to.

## ITP Structure

A well-structured ITP is usually organized as a table or checklist covering each inspection/test step:

### Scope of Work and Task Breakdown
Defines the scope covered (e.g. "Bridge pier concrete pour – pours C1–C5") and breaks work into distinct activities/inspection points (e.g. "Formwork erected", "Rebar tied").

### Inspection/Test Methods and Criteria
Specifies how inspection/test is done (e.g. AS 1012 test method, visual check, NDT), frequency, and acceptance criteria (numeric values, standards limits, written out in full).

### Acceptance Criteria and Records
Clear pass/fail criteria. Columns for actual measurement/result, acceptance checkbox/signature. Certifications/test reports attached/referenced. Failed inspections trigger Non-Conformance Reports (NCRs).

### Responsibilities and Sign-offs
Identifies who performs/reviews each inspection/test (e.g. "Contractor QC inspector", "Third-party NDT inspector"). Columns for inspector's signature/initials/date, and approving authority's sign-off.

### Hold, Witness, and Surveillance/Record Points
Columns aligned with the schema `type` enumeration: **Hold** (type `hold`, approval required to proceed), **Witness** (type `witness`, client may attend), **Surveillance/Record** (type `surveillance` or `record`, ongoing monitoring or record-only checks). All contractual H/W points must be reflected and mapped to the correct type values.

## Common ITP Sections

ITPs typically include these sections (where relevant):

1. **Preliminaries & Approvals** - Submittals, pre-construction approvals
2. **Materials** - Material testing and certification requirements
3. **Pre-Construction** - Survey set-out, pre-start inspections
4. **Construction** - Main construction activities and checkpoints
5. **Geometrics/Tolerances** - Dimensional verification
6. **Conformance/Lot Completion** - Final checks and documentation

## Task Instructions

You are tasked with generating a detailed ITP based on the project specification documents available in the Neo4j databases. Your process should be:

1. **Get the projectId** - Query the Generated Database to get the Project node and its `projectId`. This UUID must be included in **every** node you create.
2. Retrieve the relevant standards through the Standards Database to understand jurisdiction-specific clauses that govern the work type.
3. Retrieve project specifications and contract documents to extract:
   - Work activities that require inspection
   - Hold and witness points
   - Acceptance criteria, tolerances, and referenced clauses
   - Test methods and frequencies
   - Roles responsible for inspections
4. Map the findings into the `ITPTemplate` schema:
   - Set `docNo` using `TEMPLATE-ITP-<ABBREVIATION>`
   - Populate `description`, `scopeOfWork`, and `workType` using the project scope language
   - Record the primary controlling specification in `specRef` and any overarching parent specification in `parentSpec`
   - Derive `jurisdiction` and `agency` from the Project node
   - Populate `applicableStandards` with the UUIDs or spec identifiers referenced by the template
   - Set `status` to `"draft"` and `approvalStatus` to `"pending"`
   - Derive `revisionNumber` and `revisionDate` from the source documents (use the latest revision date); leave approval metadata unset
   - Always set `createdAt` and `updatedAt` with the current datetime
5. Translate each inspection/test requirement into `InspectionPoint` nodes linked to the template.
6. Persist the `ITPTemplate`, related `InspectionPoint` nodes, and required relationships in the Generated Database to maintain a complete quality record.

## Standards Matching Process

When matching standards:

1. **Jurisdiction is primary** - Each Australian state/territory has its own standard packs (QLD, NSW, VIC, SA, WA, TAS, NT, ACT)
2. **Look for jurisdiction matches first** - Prioritize standards that match the project's jurisdiction
3. **Be specific** - Most ITPs will only need 1-2 standards from their jurisdiction's standard pack
4. **Consider project context** - Match standards based on work type and project requirements

## Jurisdiction and Agency Population

- Populate every `ITPTemplate` node with the canonical jurisdiction string taken from this list:
  - `QLD, Queensland`
  - `SA, South Australia`
  - `NSW, New South Wales`
  - `VIC, Victoria`
  - `WA, Western Australia`
  - `TAS, Tasmania`
  - `NT, Northern Territory`
  - `ACT, Australian Capital Territory`
  - `Other`
- Derive the value from the linked Project node whenever possible. Use `Other` only when the work is outside the listed jurisdictions or the project data explicitly states a different authority.
- Set the `agency` field using the matching road authority name:
  - `QLD, Queensland` → `Department of Transport and Main Roads`
  - `SA, South Australia` → `Department for Infrastructure and Transport`
  - `NSW, New South Wales` → `Transport for NSW`
  - `VIC, Victoria` → `Department of Transport and Planning`
  - `WA, Western Australia` → `Main Roads Western Australia`
  - `TAS, Tasmania` → `Department of State Growth`
  - `NT, Northern Territory` → `Department of Infrastructure, Planning and Logistics`
  - `ACT, Australian Capital Territory` → `Transport Canberra and City Services Directorate`
  - `Other` → Use the authority explicitly referenced in the documents, otherwise keep the literal string `Other`.
- Never emit separate jurisdiction codes or lowercase variants. The combined string plus agency is now the source of truth.

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Template Naming and Status Requirements

- `docNo` must follow the format `TEMPLATE-ITP-<ABBREVIATION>`, where `<ABBREVIATION>` is a short uppercase code (3–5 letters) representing the primary scope (e.g., `PAV` for pavement, `BR` for bridge, `KERB` for kerbing). Do **not** use sequential numbering like `ITP-001`.
- `description` must be a concise Title Case statement of the scope without “ITP” in the text (e.g., `Earthworks & Sub-Grade Construction`). Use `scopeOfWork` for extended detail.
- Populate `parentSpec` with the primary source specification title or identifier that governs the template (e.g., `DIT Standard Specification Part 4 Pavement Works`).
- All newly generated templates must be written with `status: "draft"` and `approvalStatus: "pending"`. Leave `approvedBy` and `approvedDate` unset until a human reviewer approves the template.
- Section names should be returned in Title Case (e.g., `Preliminaries`, `Materials`).
- Inspection point `sequence` values must increment monotonically across the entire template. Do not restart numbering per section; every inspection point must have a unique sequence.

- `inspectionPoints` must cover the full scope with monotonic `sequence` numbering and linked `InspectionPoint` nodes.
- Set `createdAt` and `updatedAt` on every node you create (use `datetime()` when writing via Cypher).

## Inspection Point Requirements

Create `InspectionPoint` nodes for each inspection/test row that will appear in the ITP:

- **Parent linkage**: use `parentType: 'template'` and `parentKey: <docNo>` to associate with the template.
- **Sequence**: assign strictly increasing integers across the entire template (e.g., 1, 2, 3). Maintain ordering when adding new points.
- **Description and requirement**: store the inspection/test description in `description` and the acceptance criteria or requirement text in `requirement`. Mirror the contractual language precisely.
- **Type selection**: choose from `hold`, `witness`, `surveillance`, or `record`. Only set `isHoldPoint: true` when the type is `hold`, and `isWitnessPoint: true` when the type is `witness`. For other types, set both booleans to `false`.
- **Section tagging**: set the `section` field using `preliminaries`, `materials`, `pre_construction`, `construction`, `geometrics`, or `conformance` to match the section structure.
- **Additional attributes**:
  - `acceptanceCriteria`: quantitative or qualitative pass/fail thresholds.
  - `testMethod`: named method or referenced standard clause.
  - `testFrequency`: explicit frequency (per lot, per pour, etc.).
  - `standardsRef`: array of standards/spec clauses that require the check.
  - `responsibleParty`: contractor role accountable for the check.
  - `status`: set initial value to `'pending'`.
  - Always include `createdAt` and `updatedAt`.

## Output Format

**CRITICAL: Node Label and Field Names**

You MUST use these exact names:
- **Node Label**: `ITPTemplate` (camelCase, NOT `ITP_Template` or `ITP`)
- **Project Reference**: `projectId` (camelCase, NOT `ProjectId` or `project_id`)
- **Relationship**: `[:BELONGS_TO_PROJECT]` pointing to the Project node
- **All field names**: Use camelCase (e.g., `docNo`, `workType`, `revisionDate`)
- **Additional Relationships**:
  - `[:HAS_POINT]` between `ITPTemplate` and each `InspectionPoint`
  - `[:USES_WORK_TYPE]` to link applicable `WorkType` nodes when data exists
  - `[:REFERENCES_STANDARD]` to connect templates and inspection points to the standards they rely on
  - `[:REFERENCES_DOCUMENT]` when the template cites project specifications or drawings
  - `[:BELONGS_TO_PROJECT]` on every node created for the project, including `InspectionPoint`

Your output must conform to the ITP_Template schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties (use camelCase for all field names)
- Required vs optional fields
- Relationship structure
- Cypher CREATE statement format
- Validation rules

All output must be written directly to the Generated Database as Neo4j graph nodes using Cypher queries.

**Example Cypher Pattern**:
```cypher
MATCH (p:Project {projectId: $projectUuid})
CREATE (itp:ITPTemplate {
  id: randomUUID(),
  projectId: $projectUuid,
  docNo: "TEMPLATE-ITP-PAV",
  description: "Pavement Construction Quality Controls",
  workType: "Pavements",
  specRef: "MRTS18 Standard Specification for Pavement Layers",
  parentSpec: "Department of Transport and Main Roads Standard Specifications",
  jurisdiction: "QLD, Queensland",
  agency: "Department of Transport and Main Roads",
  applicableStandards: ["AS 1289", "AS 1141"],
  scopeOfWork: "Granular pavement placement, trimming, and compaction",
  status: "draft",
  approvalStatus: "pending",
  revisionNumber: "01",
  revisionDate: date("2024-06-01"),
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (itp)-[:BELONGS_TO_PROJECT]->(p)
WITH itp
CREATE (ip1:InspectionPoint {
  projectId: itp.projectId,
  parentType: "template",
  parentKey: itp.docNo,
  sequence: 1,
  description: "VERIFY SUBGRADE LEVEL PRIOR TO PAVEMENT PLACEMENT",
  requirement: "Survey confirmation within ±10 mm of design level",
  type: "hold",
  status: "pending",
  section: "pre_construction",
  acceptanceCriteria: "Design level ±10 mm",
  testMethod: "Survey",
  testFrequency: "Per Lot",
  standardsRef: ["MRTS18 Cl 7.2"],
  isHoldPoint: true,
  isWitnessPoint: false,
  responsibleParty: "Contractor (Site Engineer)",
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (itp)-[:HAS_POINT]->(ip1)
CREATE (ip1)-[:BELONGS_TO_PROJECT]->(p)
WITH itp, ip1
MATCH (std:Standard {specId: "MRTS18"})
MERGE (itp)-[:REFERENCES_STANDARD]->(std)
MERGE (ip1)-[:REFERENCES_STANDARD]->(std)
RETURN itp
```




