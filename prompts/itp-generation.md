# ITP Generation

## Context and Purpose

An Inspection and Test Plan (ITP) is a formal quality assurance document created for a specific project scope. It details all inspections and tests required to demonstrate that the work meets its contractual and regulatory requirements. In practice, an ITP "maps out inspection and testing checkpoints from start to finish" of a process.

Under ISO 9001:2016 (AS/NZS ISO 9001) and typical contract Quality Management System (QMS) clauses, contractors must plan and control all production processes. Preparing ITPs is one way to fulfill ISO 9001 Clause 8 (operational planning and control) by documenting who will do each inspection, how it is done, and what the acceptance criteria are.

An ITP serves two main purposes:
1. To confirm that the contractor's in-process controls are effective
2. To verify that incoming materials and completed work pass specified acceptance criteria

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

### Hold, Witness, and Review Points
Columns (H, W, R) for Hold (approval required to proceed), Witness (client may attend), and Review points. All contractual H/W points must be in the ITP.

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

1. Query the **Standards Database** (port 7687) to understand applicable standards for the jurisdiction and work type
2. Query the **Project Docs Database** (port 7688) to extract:
   - Specification requirements for the work type
   - Hold and witness points
   - Acceptance criteria
   - Test methods and frequencies
   - Quality requirements
3. Structure the ITP according to the output schema requirements
4. Generate all inspection points with complete details
5. Write the output to the **Generated Database** (port 7690)

## Standards Matching Process

When matching standards:

1. **Jurisdiction is primary** - Each Australian state/territory has its own standard packs (QLD, NSW, VIC, SA, WA, TAS, NT, ACT)
2. **Look for jurisdiction matches first** - Prioritize standards that match the project's jurisdiction
3. **Be specific** - Most ITPs will only need 1-2 standards from their jurisdiction's standard pack
4. **Consider project context** - Match standards based on work type and project requirements

## Output Format

Your output must conform to the ITP Template schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties
- Required vs optional fields
- Relationship structure
- Cypher CREATE statement format
- Validation rules

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

