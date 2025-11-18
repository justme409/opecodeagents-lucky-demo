# Environmental Management Plan (EMP) Generation

## Context and Purpose

An Environmental Management Plan (EMP), also known as a Construction Environmental Management Plan (CEMP), is a comprehensive document that describes how environmental impacts will be managed throughout the project lifecycle. It demonstrates the contractor's commitment to environmental protection and compliance with environmental legislation and project-specific requirements.

The EMP serves multiple critical functions:

1. **Environmental Compliance** - Demonstrates compliance with environmental legislation
2. **Impact Management** - Identifies and controls environmental impacts
3. **Mitigation Measures** - Establishes procedures for environmental protection
4. **Monitoring and Reporting** - Defines environmental monitoring requirements
5. **Incident Management** - Establishes procedures for environmental incidents
6. **Stakeholder Management** - Addresses community and stakeholder concerns

## Regulatory and Standards Context

### Environmental Legislation

The EMP must demonstrate compliance with relevant legislation:

- **Environment Protection and Biodiversity Conservation Act 1999** (Commonwealth)
- **State/Territory environmental protection legislation**
- **Local council environmental requirements**
- **Water quality regulations**
- **Heritage protection legislation**
- **Native vegetation regulations**

### ISO 14001:2015

The EMP should align with ISO 14001 Environmental Management System requirements:

- **Clause 4** - Context of the organization and environmental management system
- **Clause 5** - Leadership and environmental policy
- **Clause 6** - Planning for environmental aspects and objectives
- **Clause 7** - Support (resources, competence, awareness)
- **Clause 8** - Operational planning and control
- **Clause 9** - Performance evaluation and monitoring
- **Clause 10** - Improvement and corrective action

### Jurisdiction-Specific Requirements

Different Australian jurisdictions have specific environmental management requirements:

**Queensland (MRTS51):**
- Department of Transport and Main Roads specifications
- Environmental Management requirements
- EMP(C) development and content requirements
- Hold points and milestones for environmental approvals
- Non-conformances with environmental specifications

**Victoria:**
- Department of Transport (Vic) requirements
- Environmental management specifications
- Environmental risk management requirements

**Western Australia:**
- Main Roads WA environmental requirements
- Environmental management specifications
- Aboriginal heritage requirements

## EMP Structure

### Standard EMP Sections

1. **Introduction** - Project overview and environmental policy
2. **Definitions** - Environmental terms and abbreviations
3. **References** - Legislation, standards, guidelines
4. **Standard Test Methods and Compliance Testing** - Environmental monitoring methods

5. **Quality System Requirements** including:
   - Hold points and milestones
   - Non-conformances with specification
   - Documentation and records

6. **EMP(C) Governance** including:
   - General requirements
   - Contract-specific requirements
   - EMP(C) development and content
   - EMP(C) updates and version control

7. **Environmental Aspects and Impacts** including:
   - Aspect identification methodology
   - Impact assessment
   - Significance criteria
   - Risk register

8. **Environmental Management Measures** for:
   - Air quality and dust control
   - Noise and vibration management
   - Water quality and stormwater management
   - Erosion and sediment control
   - Waste management and resource recovery
   - Flora and fauna protection
   - Heritage protection (Aboriginal and non-Aboriginal)
   - Contaminated land management
   - Hazardous materials management
   - Vegetation clearing controls

9. **Environmental Monitoring and Reporting** including:
   - Monitoring requirements
   - Inspection schedules
   - Reporting procedures
   - Performance indicators

10. **Incident Management** including:
    - Incident classification
    - Response procedures
    - Investigation and corrective action
    - Notification requirements

11. **Training and Awareness** including:
    - Environmental induction
    - Toolbox talks
    - Competency requirements
    - Awareness programs

12. **Stakeholder and Community Management** including:
    - Consultation procedures
    - Complaint management
    - Communication protocols

## Environmental Aspects and Impacts

### Key Environmental Aspects

Identify and assess environmental aspects including:

**Air Quality:**
- Dust generation from earthworks and material handling
- Vehicle and equipment emissions
- Odour from materials or processes

**Noise and Vibration:**
- Construction equipment noise
- Traffic noise
- Vibration from compaction or piling

**Water Quality:**
- Stormwater runoff and sediment
- Dewatering impacts
- Spills and leaks
- Concrete washout

**Soil and Land:**
- Erosion and sediment loss
- Soil contamination
- Soil compaction
- Land disturbance

**Waste:**
- General waste generation
- Recyclable materials
- Hazardous waste
- Liquid waste

**Biodiversity:**
- Vegetation clearing
- Fauna habitat disturbance
- Threatened species impacts
- Weed introduction

**Heritage:**
- Aboriginal heritage sites
- Historical heritage sites
- Artefacts and remains

**Hazardous Materials:**
- Fuel and oil storage
- Chemical storage and use
- Asbestos management
- Contaminated materials

### Impact Assessment

For each environmental aspect, assess:

- Potential impacts
- Likelihood of occurrence
- Consequence/severity
- Risk rating
- Required controls
- Monitoring requirements

## Environmental Controls

### Erosion and Sediment Control

Details required:
- Sediment basin design and capacity
- Sediment fence installation
- Check dam placement
- Stabilization measures
- Maintenance requirements

### Water Quality Management

Details required:
- Stormwater management approach
- Water quality monitoring parameters
- Discharge criteria
- Spill response procedures
- Dewatering management

### Dust and Air Quality Control

Details required:
- Dust suppression methods
- Water cart frequency
- Material covering requirements
- Monitoring locations
- Complaint response

### Waste Management

Details required:
- Waste segregation approach
- Storage requirements
- Disposal methods
- Recycling targets
- Tracking procedures

## QSE System Integration

The EMP should leverage existing corporate QSE system procedures where available:

- Reference corporate environmental procedures
- Link to corporate environmental policies
- Cross-reference corporate training materials
- Indicate which procedures are project-specific vs corporate

## Content Requirements

### Exhaustive and Implementable
- Be highly detailed across ALL environmental sections
- Expand major sections into multiple detailed control measures
- Prefer specificity grounded in project documents and site conditions
- Provide best-practice controls where project documents are absent
- Mark assumptions clearly

### Detailed Section Content

For each environmental aspect include:
- Description of the aspect
- Potential impacts
- Legislative requirements
- Performance criteria
- Control measures (hierarchy of controls)
- Monitoring requirements
- Roles and responsibilities
- Training requirements
- Records to be maintained
- Corrective action procedures

### Matrices and Tables

Provide matrices/tables including:
- Environmental aspects and impacts register
- Risk assessment matrix
- Control measures summary
- Monitoring schedule
- Inspection checklist
- Roles and responsibilities (RACI)
- Environmental objectives and targets
- KPIs with targets

## Task Instructions

You are tasked with generating a comprehensive EMP based on project documentation:

1. **Get the projectId** - Query the Generated Database (port 7690) to get the Project node and its `projectId`:
   ```cypher
   MATCH (p:Project) RETURN p.projectId
   ```
   This UUID must be included in the ManagementPlan entity you create.

2. **Query the Project Docs Database** (port 7688) to access:
   - Environmental assessment reports
   - Contract environmental requirements
   - Site environmental constraints
   - Environmental approvals and conditions
   - Specifications

3. **Query the IMS/QSE Database** (port 7689) to find corporate content:
   - Search for environmental procedures and templates
   - Find approved environmental management procedures
   - Identify applicable environmental registers
   - Reference existing corporate procedures instead of duplicating
   - See `ims-integration-guide.md` for detailed integration instructions

4. **Query the Standards Database** (port 7687) to understand:
   - Jurisdiction-specific environmental requirements
   - Applicable environmental guidelines
   - Environmental monitoring standards

5. **Analyze documentation** to determine:
   - Project-specific environmental risks
   - Environmental approval conditions
   - Sensitive receptors
   - Monitoring requirements
   - Community sensitivities

6. **Structure the EMP** according to jurisdictional template:
   - Use QLD template (MRTS51) for Queensland projects
   - Use SA template (PC-ENV1) for South Australia projects
   - Use TAS template (Section 176) for Tasmania projects
   - Use WA template (Spec 204) for Western Australia projects
   - Use Generic template if no specific jurisdiction applies

   **Available Templates:**

### QLD Template (MRTS51)
```json
{
  "title": "Queensland Environmental Management Plan (EMP) — Layout (MRTS51)",
  "revision": "March 2025",
  "metadata": {
    "jurisdiction": "QLD",
    "agency": "Department of Transport and Main Roads",
    "source_document": "MRTS51 Environmental Management"
  },
  "sections": [
    { "id": "intro", "title": "Introduction" },
    { "id": "definitions", "title": "Definitions" },
    { "id": "references", "title": "References" },
    { "id": "standard-test-methods", "title": "Standard Test Methods and Compliance Testing" },
    {
      "id": "quality-system-requirements",
      "title": "Quality System Requirements",
      "children": [
        { "id": "hold-points-and-milestones", "title": "Hold Points and Milestones" },
        { "id": "nonconformances", "title": "Non-conformances with Specification" }
      ]
    },
    {
      "id": "empc-governance",
      "title": "EMP(C) Governance",
      "children": [
        { "id": "empc-general", "title": "General Requirements" },
        { "id": "contract-specific-reqs", "title": "Contract-Specific Requirements (Annexure MRTS51.1)" },
        { "id": "empc-development", "title": "EMP(C) Development and Content" },
        { "id": "empc-updates", "title": "EMP(C) Updates and Version Control" }
      ]
    },
    {
      "id": "empc-admin",
      "title": "EMP(C) Administrative Requirements",
      "children": [
        { "id": "legal-compliance", "title": "Legal and Other Compliance" },
        { "id": "document-control", "title": "Document Control and Records" },
        { "id": "admin-nonconformance", "title": "Non-conformance Management" },
        { "id": "surveillance-audits", "title": "Principal's Surveillance and Audits" },
        { "id": "monthly-reporting", "title": "Monthly Environmental Reporting" },
        { "id": "complaints", "title": "Complaints Management" },
        { "id": "incident-notification", "title": "Notification and Management of Environmental & Cultural Heritage Incidents" },
        { "id": "stormwater-deposition", "title": "Construction Stormwater and Deposition of Surplus Material" },
        { "id": "fauna-spotter", "title": "Fauna Spotter-Catcher (as applicable)" },
        { "id": "biosecurity-admin", "title": "Biosecurity Management (Admin Duties)" },
        { "id": "sensitive-receptors", "title": "Sensitive Receptors Identification / Mapping" },
        { "id": "site-induction", "title": "Site Induction and Training" }
      ]
    },
    {
      "id": "environmental-elements",
      "title": "EMP(C) Specific Environmental Element Requirements",
      "children": [
        { "id": "water-quality", "title": "Water Quality (Criteria, Monitoring, EMP Requirements)" },
        { "id": "erosion-sediment", "title": "Erosion and Sedimentation (link to MRTS52 where applicable)" },
        { "id": "cultural-heritage", "title": "Cultural Heritage" },
        { "id": "noise", "title": "Noise (incl. TNM CoP V2 where specified)" },
        { "id": "vibration", "title": "Vibration (Human Comfort & Structural)" },
        { "id": "air-quality", "title": "Air Quality and Dust" },
        { "id": "acid-sulfate", "title": "Acid Sulfate Soils" },
        { "id": "contaminated-sites", "title": "Contaminated Sites (incl. asbestos where applicable)" },
        { "id": "native-fauna", "title": "Native Fauna" },
        { "id": "vegetation", "title": "Vegetation Management and Clearing Limits" },
        { "id": "biosecurity", "title": "Biosecurity (Weeds, Pests, Pathogens)" },
        { "id": "waste-resource", "title": "Waste and Resource Management" },
        { "id": "chemicals-fuels", "title": "Chemicals and Fuels" },
        { "id": "materials-sourcing", "title": "Sourcing of Construction Materials (Non-commercial Sources)" }
      ]
    }
  ]
}
```

### SA Template (PC-ENV1)
```json
{
  "title": "South Australia Environmental Management Plan (EMP) — Layout (PC-ENV1)",
  "revision": "September 2024",
  "metadata": {
    "jurisdiction": "SA",
    "agency": "Department for Infrastructure and Transport",
    "source_document": "Master Specification Part PC-ENV1 Environmental Management"
  },
  "sections": [
    { "id": "general", "title": "General" },
    {
      "id": "documentation",
      "title": "Documentation",
      "children": [
        { "id": "cemp", "title": "Contractor's Environmental Management Plan (CEMP)" },
        { "id": "quality-records", "title": "Quality Management Records" }
      ]
    },
    { "id": "contractor-obligations", "title": "Contractor's Environmental Obligations" },
    { "id": "authorisations", "title": "Environmental Authorisations (Approvals, Licences, Permits)" },
    { "id": "objectives", "title": "Environmental Objectives" },
    { "id": "ems", "title": "Environmental Management System (AS/NZS ISO 14001 Certification)" },
    {
      "id": "personnel",
      "title": "Contractor's Personnel",
      "children": [
        { "id": "emr", "title": "Environmental Management Representative (EMR)" }
      ]
    },
    {
      "id": "training-induction",
      "title": "Training and Induction",
      "children": [
        { "id": "awareness-training", "title": "Environmental Awareness Training" },
        { "id": "induction", "title": "Environmental Induction" }
      ]
    },
    {
      "id": "inspection-audit-reporting",
      "title": "Inspections, Auditing and Reporting",
      "children": [
        { "id": "inspections", "title": "Environmental Inspections (incl. erosion/sediment devices)" },
        { "id": "audits", "title": "Environmental Audits (AS/NZS ISO 19011)" },
        { "id": "veg-removal-register", "title": "Vegetation Removal Register" },
        { "id": "monthly-status", "title": "Monthly Environmental Performance Status Report" }
      ]
    },
    { "id": "emergency-response", "title": "Environmental Emergency Response (incl. marine spills)" },
    { "id": "hold-witness-points", "title": "Hold Points and Witness Points" },
    {
      "id": "issue-specific-subplans",
      "title": "Issue-Specific Sub-plans"
    }
  ]
}
```

### TAS Template (Section 176)
```json
{
  "title": "Tasmania Environmental Management Plan (EMP) — Layout (Section 176)",
  "revision": "June 2024",
  "metadata": {
    "jurisdiction": "TAS",
    "agency": "Department of State Growth",
    "source_document": "Section 176 Environmental Management"
  },
  "sections": [
    {
      "id": "part-a",
      "title": "Part A — Environmental Management",
      "children": [
        { "id": "a1-intro", "title": "176.A1 Introduction" },
        { "id": "a2-definitions", "title": "176.A2 Definitions" },
        { "id": "a3-emp", "title": "176.A3 Environmental Management Plan (EMP) Requirements" },
        { "id": "a4-training", "title": "176.A4 Training (competence; erosion/sediment control card)" }
      ]
    },
    {
      "id": "part-b",
      "title": "Part B — Water Quality",
      "children": [
        { "id": "b1-water-quality", "title": "176.B1 Water Quality (criteria, monitoring, dewatering)" }
      ]
    },
    {
      "id": "part-c",
      "title": "Part C — Air Quality",
      "children": [
        { "id": "c1-dust", "title": "176.C1 Dust and Air Emissions" }
      ]
    },
    {
      "id": "part-d",
      "title": "Part D — Erosion and Sediment Control",
      "children": [
        { "id": "d1-esc", "title": "176.D1 Erosion and Sediment Control (references, inspections)" },
        { "id": "d2-stockpiles", "title": "176.D2 Stockpiles" },
        { "id": "d3-mud-on-roads", "title": "176.D3 Mud on Public Roads" }
      ]
    },
    {
      "id": "part-e",
      "title": "Part E — Contaminated Soils and Materials",
      "children": [
        { "id": "e1-contaminated", "title": "176.E1 Contaminated Soils and Materials" }
      ]
    },
    {
      "id": "part-f",
      "title": "Part F — Waste and Resource Use",
      "children": [
        { "id": "f1-waste", "title": "176.F1 Waste and Resource Reuse (monitoring)" }
      ]
    },
    {
      "id": "part-g",
      "title": "Part G — Fuels and Chemicals",
      "children": [
        { "id": "g1-fuels-chemicals", "title": "176.G1 Fuels and Chemicals (storage, refuelling, spill kits, monitoring)" }
      ]
    },
    {
      "id": "part-h",
      "title": "Part H — Noise and Vibration",
      "children": [
        { "id": "h1-noise", "title": "176.H1 Noise (controls, scheduling, notifications)" },
        { "id": "h2-vibration", "title": "176.H2 Vibration (criteria, monitoring)" },
        { "id": "h3-blasting", "title": "176.H3 Blasting (limits and monitoring)" }
      ]
    },
    {
      "id": "part-i",
      "title": "Part I — Flora and Fauna",
      "children": [
        { "id": "i1-flora-fauna", "title": "176.I1 Flora and Fauna (no-go zones, inspections)" },
        { "id": "i2-weed-pest-disease", "title": "176.I2 Weed, Pest and Disease Management (hygiene, washdown)" }
      ]
    },
    {
      "id": "part-j",
      "title": "Part J — Cultural Heritage",
      "children": [
        { "id": "j1-general", "title": "176.J1 Cultural Heritage (protection, permits)" },
        { "id": "j2-protection", "title": "Protection of Values and No-Go Zones" },
        { "id": "j3-unanticipated-discovery", "title": "Unanticipated Discovery Plan (items and skeletal remains)" },
        { "id": "j4-monitoring", "title": "Monitoring of No-Go Zones" }
      ]
    },
    {
      "id": "part-k",
      "title": "Part K — Reporting",
      "children": [
        { "id": "k1-reporting", "title": "176.K1 Reporting (tables; frequencies; regulator notices)" }
      ]
    }
  ]
}
```

### WA Template (Spec 204)
```json
{
  "title": "Western Australia Environmental Management Plan (EMP) — Layout (Spec 204)",
  "revision": "August 2020",
  "metadata": {
    "jurisdiction": "WA",
    "agency": "Main Roads Western Australia",
    "source_document": "Specification 204 Environmental Management (Major Works)"
  },
  "sections": [
    { "id": "scope", "title": "Scope and Applicability (ISO 14001 aligned)" },
    { "id": "policy", "title": "Main Roads Environmental Policy" },
    { "id": "commitment", "title": "Environmental Management Commitment Statement" },
    {
      "id": "planning",
      "title": "Planning",
      "children": [
        { "id": "legal-other", "title": "Legal and Other Compliance Requirements" },
        { "id": "risks-opportunities", "title": "Risks and Opportunities Assessment" },
        { "id": "cemp", "title": "Construction Environmental Management Plan (CEMP) Development and Approval" }
      ]
    },
    {
      "id": "implementation",
      "title": "Implementation",
      "children": [
        { "id": "roles-resp", "title": "Roles and Responsibilities (EMR, Top Management, subcontractors)" },
        { "id": "training", "title": "Training and Competency (Site Induction, evaluation)" },
        { "id": "communication", "title": "Communication (internal/external; regulators via Principal)" },
        { "id": "documentation", "title": "Documentation and Control of Records" },
        { "id": "operational-controls", "title": "Construction Environmental Operational Controls" },
        { "id": "emergency", "title": "Emergency Preparedness and Response" },
        { "id": "incidents", "title": "Environmental Incidents (EQSafe reporting; timeframes)" }
      ]
    },
    {
      "id": "measurement-evaluation",
      "title": "Measurement and Evaluation",
      "children": [
        { "id": "monitoring-measurement", "title": "Monitoring and Measurement (Monthly reporting)" },
        { "id": "audit", "title": "Environmental Audit (schedule; frequency; reports)" },
        { "id": "nonconformance-capa", "title": "Non-conformance and Corrective/Preventative Action" }
      ]
    },
    {
      "id": "management-review",
      "title": "Management Review and Continual Improvement",
      "children": [
        { "id": "review", "title": "Periodic Review (timing; inputs; outputs)" },
        { "id": "continual-improvement", "title": "Continual Improvement Actions" }
      ]
    },
    { "id": "handover", "title": "As-Built and Handover Requirements" },
    {
      "id": "principal-reqs",
      "title": "Annexure 204B — Principal Environmental Management Requirements"
    }
  ]
}
```

### Generic Template (Consolidated)
```json
{
  "title": "Generic Environmental Management Plan (EMP) — Consolidated Layout",
  "metadata": {
    "jurisdiction": "Generic",
    "source_basis": "QLD MRTS51; SA PC-ENV1; TAS Section 176; WA Spec 204",
    "standards": "AS/NZS ISO 14001; AS/NZS ISO 19011; AS/NZS ISO 31000 (risk)"
  },
  "sections": [
    {
      "id": "governance-context",
      "title": "Governance and Context",
      "children": [
        { "id": "introduction", "title": "Introduction, Scope and Objectives" },
        { "id": "definitions-acronyms", "title": "Definitions and Acronyms" },
        { "id": "legal-other-reqs", "title": "Legal and Other Requirements (Approvals, permits, licences)" },
        { "id": "roles-responsibilities", "title": "Roles and Responsibilities (Top Management, EMR, subcontractors)" },
        { "id": "training-induction", "title": "Training and Induction (competency; awareness)" },
        { "id": "document-records", "title": "Document and Records Management (version control)" }
      ]
    },
    {
      "id": "emp-administration",
      "title": "EMP Administration and Quality",
      "children": [
        { "id": "quality-system", "title": "Quality System Requirements (Hold/Witness Points; milestones)" },
        { "id": "nonconformance", "title": "Non-conformances and Corrective Actions" },
        { "id": "audits-surveillance", "title": "Audits and Surveillance (internal/external)" },
        { "id": "reporting", "title": "Reporting (monthly; status; KPIs)" },
        { "id": "complaints-community", "title": "Complaints and Community Engagement" },
        { "id": "incident-management", "title": "Incident Notification and Management (environmental and cultural heritage)" },
        { "id": "emergency-preparedness", "title": "Emergency Preparedness and Response" }
      ]
    },
    {
      "id": "environmental-elements",
      "title": "Environmental Elements and Controls",
      "children": [
        { "id": "water-quality", "title": "Water Quality (criteria; monitoring; dewatering)" },
        { "id": "erosion-sediment", "title": "Erosion and Sediment Control" },
        { "id": "air-quality", "title": "Air Quality and Dust" },
        { "id": "noise", "title": "Noise" },
        { "id": "vibration", "title": "Vibration (human comfort; structural)" },
        { "id": "acid-sulfate", "title": "Acid Sulfate Soils" },
        { "id": "contaminated-land", "title": "Contaminated Land (incl. asbestos)" },
        { "id": "waste-resource", "title": "Waste and Resource Use (hierarchy; transport)" },
        { "id": "chemicals-fuels", "title": "Chemicals and Fuels (storage; refuelling; spill response)" },
        { "id": "vegetation", "title": "Vegetation Management (clearing limits; offsets/registers)" },
        { "id": "biodiversity-fauna", "title": "Biodiversity and Fauna (no-go zones; spotter-catchers)" },
        { "id": "biosecurity", "title": "Biosecurity (weeds, pests, diseases; hygiene)" },
        { "id": "cultural-heritage", "title": "Cultural Heritage (protection; unanticipated discovery)" },
        { "id": "dewatering", "title": "Dewatering and Water Drainage Management" },
        { "id": "materials-sourcing", "title": "Materials Sourcing (non-commercial; pits; approvals)" },
        { "id": "stockpiles-traffic", "title": "Stockpiles, Mud on Roads, Traffic and Access" },
        { "id": "special-areas", "title": "Special Environmental Areas / Sensitive Receptors" }
      ]
    },
    {
      "id": "monitoring-measurement",
      "title": "Monitoring and Measurement",
      "children": [
        { "id": "criteria", "title": "Performance Criteria and Compliance Testing" },
        { "id": "frequencies-locations", "title": "Frequencies, Locations, Methods and Equipment" },
        { "id": "data-management", "title": "Data Management, Evaluation and Trend Analysis" }
      ]
    },
    {
      "id": "review-improvement",
      "title": "Management Review and Continual Improvement",
      "children": [
        { "id": "periodic-review", "title": "Periodic Review (inputs; outputs; decisions)" },
        { "id": "continual-improvement", "title": "Continual Improvement Opportunities and Actions" }
      ]
    },
    { "id": "handover-closeout", "title": "Handover, As-Builts and Close-Out" }
  ]
}
```

7. **Integrate corporate IMS/QSE content** by:
   - For each section, query IMS database (port 7689) for relevant environmental procedures
   - Reference existing corporate procedures with links (e.g., `[Environmental Incident Procedure](https://projectpro.pro/ims/environmental/incident-procedure)`)
   - Only write project-specific content where no corporate equivalent exists
   - Clearly separate corporate references from project-specific requirements
   - Store IMS references in DocumentSection `imsReferences` property
   - See `ims-integration-guide.md` for detailed patterns and examples

8. **Develop the plan body before writing**:
   - Build comprehensive, numbered sections that mirror the selected jurisdictional template.
   - Capture matrices/tables as structured plain text (e.g., tab-separated rows) ready for persistence.
   - Flag assumptions explicitly where project evidence is absent.

9. **Persist results to Neo4j (port 7690)** – create graph entities described below.

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the Management Plan schema defined in `AGENT_SCHEMA.md`. Follow the instructions in `Writing to Generated DB.md` exactly.

### EMP-Specific Requirements

**ManagementPlan Node:**
- Use `MERGE` with `{projectId: 'xxx', type: 'EMP'}` as the unique key
- Required properties: `type: 'EMP'`, `title`, `version`, `approvalStatus`, `projectId`, `createdAt`, `updatedAt`
- Optional properties: `summary`, `notes`, `approvedBy`, `approvedDate`
- If environmental ITPs are required, store as JSON string: `requiredItps: '[{"docNo": "ITP-ENV-01", "workType": "Erosion Control", "mandatory": true}]'`

**DocumentSection Nodes:**
- Use `CREATE` for sections (they are unique children of the plan)
- Required properties per schema:
  - `projectId` (string)
  - `sectionId` (unique identifier, e.g., 'EMP-SEC-1')
  - `title` (NOT `heading`) - the section heading text
  - `sectionNumber` (NOT `headingNumber`) - e.g., '1.0', '1.1'
  - `order` (NOT `orderIndex`) - integer for sorting
  - `content` (NOT `body`) - the section content/text
  - `createdAt`, `updatedAt` (datetime)
- Optional properties: `level`, `imsReferences` (array of strings - simple array is OK)
  - Example: `imsReferences: ['QSE-8.1-PROC-04', 'QSE-6.1-REG-03']`

**Relationships:**
- `(:ManagementPlan)-[:HAS_SECTION]->(:DocumentSection)` for all top-level sections
- `(:DocumentSection)-[:HAS_SUBSECTION]->(:DocumentSection)` for nested sections (if applicable)
- `(:ManagementPlan)-[:BELONGS_TO_PROJECT]->(:Project)`

**IMS Integration:**
- Store IMS/QSE references in `imsReferences` array property on DocumentSection nodes
- Example: `imsReferences: ['QSE-8.1-PROC-04', 'QSE-6.1-REG-03']`
- Reference these in the section content with links to the corporate procedures

All output must be written to the Generated Database (port 7690) via a single `.cypher` file as per `Writing to Generated DB.md`.

## Complete Cypher Example with Detailed Environmental Content

**CRITICAL:** This example demonstrates the level of detail required for EVERY section. Each section must have multiple paragraphs, tables, procedures, and specific project details - NOT just one-sentence stubs.

```cypher
// Example EMP with COMPREHENSIVE, DETAILED environmental sections using APOC
CALL apoc.cypher.runMany('
// Step 1: Create/update project
MERGE (p:Project {projectId: "example-project-456"})
SET p.projectName = "Example Road Reconstruction", 
    p.updatedAt = datetime();

// Step 2: Create/update management plan
MATCH (p:Project {projectId: "example-project-456"})
MERGE (mp:ManagementPlan {projectId: p.projectId, type: "EMP"})
ON CREATE SET mp.createdAt = datetime()
SET mp.title = "Environmental Management Plan - Example Road Reconstruction",
    mp.version = "1.0",
    mp.approvalStatus = "draft",
    mp.summary = "Comprehensive EMP addressing erosion/sediment control, dust management, water quality, waste management, and biodiversity protection for urban road reconstruction works.",
    mp.notes = "Integrates corporate environmental procedures. Key risks: stormwater sediment, asphalt dust, noise from compaction, tree protection, waste recycling.",
    mp.requiredItps = "[{\"docNo\":\"ITP-ENV-01\",\"workType\":\"Erosion and Sediment Control\",\"mandatory\":true},{\"docNo\":\"ITP-ENV-02\",\"workType\":\"Water Quality Monitoring\",\"mandatory\":true}]",
    mp.updatedAt = datetime()
MERGE (mp)-[:BELONGS_TO_PROJECT]->(p);

// Step 3: Section on Erosion and Sediment Control - DETAILED EXAMPLE
MATCH (mp:ManagementPlan {projectId: "example-project-456", type: "EMP"})
CREATE (sec_erosion:DocumentSection {
  projectId: mp.projectId,
  sectionId: "EMP-SEC-EROSION",
  title: "Erosion and Sediment Control",
  sectionNumber: "4.1",
  order: 41,
  level: 1,
  content: "<h2>4.1 Erosion and Sediment Control</h2>

<h3>4.1.1 Purpose and Regulatory Context</h3>
<p>This section establishes comprehensive erosion and sediment control (ESC) measures for the Example Road Reconstruction project to prevent soil erosion, minimize sediment discharge to stormwater systems, and protect downstream waterways. The project site drains to [River Name] catchment, which is classified as sensitive receiving waters under the Environment Protection Act.</p>

<p><strong>Regulatory Requirements:</strong></p>
<ul>
  <li>Environment Protection Act 1993 (SA) - General Environmental Duty</li>
  <li>Environment Protection (Water Quality) Policy 2015 - Stormwater discharge standards</li>
  <li>Master Specification PC-ENV1 Section D - Erosion and Sediment Control</li>
  <li>Best Practice Erosion and Sediment Control Guidelines (IECA Australasia, 2008)</li>
  <li>SA Water Trade Waste Agreement (if dewatering to sewer)</li>
</ul>

<p><strong>Environmental Values to Protect:</strong></p>
<ul>
  <li>Water quality in downstream waterways (aquatic ecosystem health)</li>
  <li>Stormwater infrastructure (prevent siltation of drains and GPTs)</li>
  <li>Adjacent properties (prevent sediment tracking onto roads)</li>
  <li>Receiving environment aesthetics (prevent turbidity and discoloration)</li>
</ul>

<h3>4.1.2 Site-Specific Erosion and Sediment Risks</h3>
<p>Risk assessment conducted for this project identifies the following erosion and sediment risks:</p>

<table border='1' cellpadding='5'>
  <tr><th>Activity</th><th>Erosion/Sediment Source</th><th>Risk Level</th><th>Receiving Environment</th></tr>
  <tr>
    <td>Excavation for stormwater pits and pipes</td>
    <td>Exposed subgrade soil (sandy clay), stockpiled excavated material, trench water</td>
    <td>HIGH</td>
    <td>Street stormwater drains → [River Name]</td>
  </tr>
  <tr>
    <td>Pavement milling and profiling</td>
    <td>Asphalt fines and dust, water used for dust suppression</td>
    <td>MEDIUM</td>
    <td>Street stormwater drains</td>
  </tr>
  <tr>
    <td>Subgrade preparation and compaction</td>
    <td>Exposed subgrade during wet weather, runoff from work areas</td>
    <td>HIGH</td>
    <td>Street stormwater drains</td>
  </tr>
  <tr>
    <td>Stockpile storage (aggregates, topsoil)</td>
    <td>Wind erosion, rainfall runoff from uncovered stockpiles</td>
    <td>MEDIUM</td>
    <td>Street stormwater drains, adjacent properties</td>
  </tr>
  <tr>
    <td>Vehicle movements on unsealed surfaces</td>
    <td>Sediment tracking onto sealed roads, mud on public roads</td>
    <td>HIGH</td>
    <td>Street stormwater drains, public amenity</td>
  </tr>
  <tr>
    <td>Rain gardens and landscaping works</td>
    <td>Topsoil erosion during establishment, mulch washoff</td>
    <td>MEDIUM</td>
    <td>Street stormwater drains</td>
  </tr>
</table>

<p><strong>Site Characteristics Influencing ESC Design:</strong></p>
<ul>
  <li><strong>Topography:</strong> Relatively flat (0.5-2% grade), low erosion potential but poor natural drainage</li>
  <li><strong>Soil Type:</strong> Sandy clay (moderately erodible), high silt content when disturbed</li>
  <li><strong>Rainfall:</strong> Average annual rainfall 550mm, intense storms possible October-March</li>
  <li><strong>Drainage:</strong> Kerb and gutter to side entry pits, limited capacity during high-intensity rainfall</li>
  <li><strong>Sensitive Receptors:</strong> Residential properties adjacent, [River Name] 2km downstream</li>
  <li><strong>Work Duration:</strong> 6 months including wet season (November-February)</li>
</ul>

<h3>4.1.3 Erosion and Sediment Control Measures</h3>
<p>ESC measures are designed in accordance with IECA Best Practice Guidelines and implemented progressively as earthworks advance. The following hierarchy of controls applies:</p>

<h4>4.1.3.1 Primary Controls (Erosion Prevention)</h4>
<p>Prevent erosion at the source by minimizing soil disturbance and protecting exposed areas:</p>

<ol>
  <li><strong>Staged Construction:</strong>
    <ul>
      <li>Limit area of exposed soil to maximum 2,000m² at any time</li>
      <li>Complete earthworks in 50m sections before exposing new areas</li>
      <li>Stabilize completed sections within 5 days (pavement, seeding, or mulch)</li>
      <li>Schedule major earthworks outside peak rainfall periods where possible</li>
    </ul>
  </li>
  <li><strong>Temporary Stabilization:</strong>
    <ul>
      <li>Apply hydromulch to exposed subgrade if works delayed >5 days</li>
      <li>Cover stockpiles >2m³ with heavy-duty tarpaulins secured with sandbags</li>
      <li>Establish temporary groundcover (sterile cereal rye) on areas idle >14 days</li>
      <li>Apply polymer-based soil stabilizer to haul roads and laydown areas</li>
    </ul>
  </li>
  <li><strong>Diversion of Clean Water:</strong>
    <ul>
      <li>Install temporary bunds to divert upslope stormwater around work areas</li>
      <li>Maintain existing kerb and gutter flow paths where possible</li>
      <li>Pump clean water from excavations directly to stormwater system (no contact with disturbed soil)</li>
    </ul>
  </li>
</ol>

<h4>4.1.3.2 Secondary Controls (Sediment Capture)</h4>
<p>Capture sediment before it leaves the site or enters stormwater system:</p>

<ol>
  <li><strong>Sediment Fences:</strong>
    <ul>
      <li>Install geotextile sediment fences (minimum 600mm height) on downslope perimeter of all earthworks areas</li>
      <li>Fences to be trenched 150mm into ground and backfilled for stability</li>
      <li>Maximum catchment area per fence: 500m²</li>
      <li>Inspect daily during rainfall and after every rain event >10mm</li>
      <li>Replace or clean when sediment accumulation reaches 1/3 fence height</li>
      <li>Maintain until upslope area is stabilized (pavement or vegetation established)</li>
    </ul>
  </li>
  <li><strong>Sediment Basins/Sumps:</strong>
    <ul>
      <li>Construct temporary sediment basin at low point of site (minimum 10m³ capacity)</li>
      <li>Basin to include 3-stage treatment: settlement zone, rock filter, outlet with geotextile</li>
      <li>Size basin for 5-day retention time for 80th percentile storm event</li>
      <li>Dewater basin via pump to vegetated area or tanker removal (no direct discharge to stormwater)</li>
      <li>Clean out sediment when basin 50% full (typically monthly during wet season)</li>
    </ul>
  </li>
  <li><strong>Inlet Protection:</strong>
    <ul>
      <li>Install sediment filter socks around all stormwater pit inlets within 50m of works</li>
      <li>Use proprietary inlet filters (e.g., Silt Saver, Drain Guard) for pits receiving direct runoff from work areas</li>
      <li>Inspect inlet protection after every rainfall event</li>
      <li>Clean or replace when sediment accumulation reduces flow capacity by 25%</li>
    </ul>
  </li>
  <li><strong>Vehicle Wash Down:</strong>
    <ul>
      <li>Establish vehicle wash-down area at site egress point with rumble grid and sediment trap</li>
      <li>All vehicles and equipment to be cleaned before leaving site (wheels, undercarriage, body)</li>
      <li>Wash water to drain to sediment basin, not to street stormwater system</li>
      <li>Maintain street sweeper on standby for immediate response to sediment tracking</li>
    </ul>
  </li>
</ol>

<h4>4.1.3.3 Tertiary Controls (Treatment)</h4>
<p>Final treatment before discharge to receiving environment:</p>

<ul>
  <li><strong>Chemical Treatment:</strong> Flocculation of sediment basin water using aluminum sulfate (alum) or polyaluminum chloride (PAC) if turbidity >50 NTU after settlement. Dosage: 10-50 mg/L depending on turbidity. Treat water until turbidity <20 NTU before discharge.</li>
  <li><strong>Filtration:</strong> Pump discharge through geotextile dewatering bags for final polishing before release to vegetated swale or stormwater system.</li>
  <li><strong>pH Adjustment:</strong> Monitor pH of any concrete washout water. Neutralize with CO₂ or acid to pH 6.5-8.5 before discharge.</li>
</ul>

<h3>4.1.4 Erosion and Sediment Control Plan (ESCP)</h3>
<p>A site-specific ESCP has been prepared showing:</p>
<ul>
  <li>Location of all ESC measures (sediment fences, basins, inlet protection)</li>
  <li>Staging of works and progressive ESC installation</li>
  <li>Stormwater flow paths and catchment areas</li>
  <li>Sensitive receptors and exclusion zones</li>
  <li>Stockpile locations and stabilization measures</li>
  <li>Vehicle access points and wash-down facilities</li>
</ul>

<p>The ESCP is included as <strong>Appendix C</strong> to this EMP and displayed on site noticeboards. The ESCP will be updated as works progress and site conditions change.</p>

<h3>4.1.5 Inspection and Monitoring</h3>

<h4>4.1.5.1 Daily Inspections</h4>
<p>The Site Supervisor or Environmental Management Representative (EMR) conducts daily visual inspections of all ESC measures, recording:</p>
<ul>
  <li>Condition and effectiveness of sediment fences, basins, and inlet protection</li>
  <li>Evidence of sediment discharge to stormwater system or adjacent properties</li>
  <li>Adequacy of stockpile covering and stabilization</li>
  <li>Vehicle tracking of sediment onto public roads</li>
  <li>Maintenance requirements (cleaning, repair, replacement)</li>
</ul>

<p>Inspection checklist (QSE-ENV-FORM-02) is completed daily and filed in site office. Photos taken of any deficiencies.</p>

<h4>4.1.5.2 Post-Rainfall Inspections</h4>
<p>Within 2 hours of any rainfall event >10mm, the EMR inspects:</p>
<ul>
  <li>All ESC measures for damage or sediment overtopping</li>
  <li>Stormwater pits and drains for sediment accumulation</li>
  <li>Downstream discharge points for evidence of turbid water</li>
  <li>Erosion of exposed soil areas</li>
</ul>

<p>Any deficiencies are rectified immediately (within 4 hours). Major rainfall events (>25mm) trigger enhanced monitoring for 24 hours post-event.</p>

<h4>4.1.5.3 Water Quality Monitoring</h4>
<p>Water quality monitoring is conducted in accordance with ITP-ENV-02:</p>

<table border='1' cellpadding='5'>
  <tr><th>Parameter</th><th>Monitoring Location</th><th>Frequency</th><th>Trigger Level</th><th>Action if Exceeded</th></tr>
  <tr>
    <td>Turbidity (NTU)</td>
    <td>Sediment basin outlet, nearest downstream stormwater pit</td>
    <td>Daily during wet weather, weekly during dry weather</td>
    <td>>50 NTU (basin), >20 NTU (stormwater)</td>
    <td>Stop discharge, implement additional treatment (flocculation), investigate source</td>
  </tr>
  <tr>
    <td>pH</td>
    <td>Concrete washout area, dewatering discharge points</td>
    <td>Before each discharge event</td>
    <td><6.5 or >8.5</td>
    <td>Neutralize before discharge, investigate source of pH variation</td>
  </tr>
  <tr>
    <td>Total Suspended Solids (mg/L)</td>
    <td>Sediment basin outlet</td>
    <td>Monthly (lab analysis)</td>
    <td>>50 mg/L</td>
    <td>Review basin design and maintenance, increase retention time</td>
  </tr>
  <tr>
    <td>Visual (color, sheen, debris)</td>
    <td>All discharge points, downstream stormwater pits</td>
    <td>Daily</td>
    <td>Visible sediment plume, oil sheen, floating debris</td>
    <td>Immediate containment, source investigation, incident report</td>
  </tr>
</table>

<p>All monitoring results are recorded in the Environmental Monitoring Register (ProjectPro database) and reported in monthly environmental reports to the Superintendent.</p>

<h3>4.1.6 Maintenance and Contingency</h3>

<h4>4.1.6.1 Scheduled Maintenance</h4>
<ul>
  <li><strong>Weekly:</strong> Clean sediment from inlet protection devices, repair damaged sediment fences, top up rock in vehicle wash-down area</li>
  <li><strong>Monthly:</strong> Pump out and clean sediment basins (more frequently during wet weather), replace worn geotextile, re-secure stockpile covers</li>
  <li><strong>As Required:</strong> Replace sediment fences when 1/3 full, repair erosion rills in exposed areas, reapply mulch to stabilized areas</li>
</ul>

<h4>4.1.6.2 Wet Weather Contingency</h4>
<p>In the event of forecast heavy rainfall (>25mm in 24 hours) or actual intense rainfall:</p>
<ol>
  <li><strong>Pre-Storm Preparation (24 hours before forecast event):</strong>
    <ul>
      <li>Inspect and repair all ESC measures</li>
      <li>Secure all stockpile covers with additional tie-downs</li>
      <li>Apply temporary stabilization (hydromulch) to any exposed areas >100m²</li>
      <li>Clear sediment from all inlet protection to maximize capacity</li>
      <li>Ensure spill kits and additional ESC materials (sediment fences, sandbags) are on site</li>
      <li>Brief all site personnel on wet weather procedures</li>
    </ul>
  </li>
  <li><strong>During Storm:</strong>
    <ul>
      <li>Cease earthworks if rainfall intensity >10mm/hour</li>
      <li>Monitor stormwater discharge points for sediment breakout</li>
      <li>Deploy emergency sediment fences if sediment observed leaving site</li>
      <li>Document weather conditions and any environmental impacts (photos, notes)</li>
    </ul>
  </li>
  <li><strong>Post-Storm Response (within 2 hours):</strong>
    <ul>
      <li>Conduct post-rainfall inspection as per Section 4.1.5.2</li>
      <li>Implement immediate repairs to damaged ESC measures</li>
      <li>Clean any sediment tracked onto public roads</li>
      <li>Clean sediment from stormwater pits if accumulation >25% pit depth</li>
      <li>Notify Superintendent if any sediment discharge to waterways occurred</li>
    </ul>
  </li>
</ol>

<h4>4.1.6.3 Sediment Discharge Incident Response</h4>
<p>If sediment discharge to stormwater system or waterways occurs despite controls:</p>
<ol>
  <li><strong>Immediate Actions (within 1 hour):</strong>
    <ul>
      <li>Stop the source of sediment (cease works, deploy additional barriers)</li>
      <li>Contain sediment using emergency sediment fences, sandbags, or booms</li>
      <li>Notify Site Supervisor and EMR immediately</li>
      <li>Document incident with photos and notes (time, location, estimated volume, receiving environment)</li>
    </ul>
  </li>
  <li><strong>Notification (within 4 hours):</strong>
    <ul>
      <li>Notify Superintendent of incident</li>
      <li>If discharge to waterway: notify EPA Pollution Hotline 1800 801 076</li>
      <li>If discharge to SA Water assets: notify SA Water 1300 SA WATER</li>
      <li>Complete Environmental Incident Report (QSE-INC-ENV-01)</li>
    </ul>
  </li>
  <li><strong>Clean-Up (within 24 hours):</strong>
    <ul>
      <li>Remove sediment from stormwater pits and drains using vacuum truck</li>
      <li>Clean affected areas and restore ESC measures</li>
      <li>Dispose of collected sediment at approved facility (waste tracking docket required)</li>
      <li>Monitor downstream for ongoing impacts</li>
    </ul>
  </li>
  <li><strong>Investigation and Corrective Action (within 5 days):</strong>
    <ul>
      <li>Conduct root cause analysis (5 Whys or Fishbone)</li>
      <li>Identify corrective actions to prevent recurrence</li>
      <li>Update ESCP if design inadequacies identified</li>
      <li>Provide toolbox talk to all site personnel on lessons learned</li>
      <li>Close out incident in Environmental Incident Register</li>
    </ul>
  </li>
</ol>

<h3>4.1.7 Training and Awareness</h3>
<p>All site personnel receive erosion and sediment control training:</p>
<ul>
  <li><strong>Site Induction:</strong> Overview of site ESC measures, importance of protecting water quality, individual responsibilities</li>
  <li><strong>Toolbox Talks:</strong> Monthly toolbox on ESC topics (e.g., sediment fence maintenance, vehicle wash-down procedures, wet weather protocols)</li>
  <li><strong>Specialized Training:</strong> EMR and Site Supervisor complete IECA Erosion and Sediment Control Practitioner course (or equivalent)</li>
</ul>

<h3>4.1.8 Performance Indicators and Reporting</h3>
<p>ESC performance is measured against the following KPIs:</p>
<table border='1' cellpadding='5'>
  <tr><th>KPI</th><th>Target</th><th>Measurement Method</th></tr>
  <tr><td>Sediment discharge incidents</td><td>Zero incidents</td><td>Environmental Incident Register</td></tr>
  <tr><td>ESC inspection compliance</td><td>100% daily inspections completed</td><td>Inspection checklist records</td></tr>
  <tr><td>Turbidity at discharge points</td><td><20 NTU (95th percentile)</td><td>Water quality monitoring data</td></tr>
  <tr><td>ESC maintenance response time</td><td>Deficiencies rectified within 4 hours</td><td>Inspection records and corrective action log</td></tr>
  <tr><td>Area of exposed soil</td><td><2,000m² at any time</td><td>Weekly site survey</td></tr>
</table>

<p>ESC performance is reported monthly to the Superintendent as part of the Environmental Performance Status Report, including:</p>
<ul>
  <li>Summary of inspection and monitoring results</li>
  <li>Any sediment discharge incidents and corrective actions</li>
  <li>Photos of ESC measures in place</li>
  <li>KPI performance against targets</li>
  <li>Forecast weather and planned ESC activities for next month</li>
</ul>

<h3>4.1.9 Integration with Corporate Environmental Management System</h3>
<p>This ESC process aligns with corporate procedure <a href='https://projectpro.pro/ims/qse-env-esc'>QSE-ENV-ESC-01 Erosion and Sediment Control Procedure</a>. Reference corporate resources:</p>
<ul>
  <li>QSE-ENV-ESC-01: Corporate ESC Procedure</li>
  <li>QSE-ENV-FORM-02: Daily ESC Inspection Checklist</li>
  <li>QSE-INC-ENV-01: Environmental Incident Report Form</li>
  <li>ITP-ENV-01: Erosion and Sediment Control ITP Template</li>
  <li>ITP-ENV-02: Water Quality Monitoring ITP Template</li>
</ul>

<h3>4.1.10 References and Standards</h3>
<ul>
  <li>Best Practice Erosion and Sediment Control Guidelines (IECA Australasia, 2008)</li>
  <li>Managing Urban Stormwater: Soils and Construction (Landcom, 2004) - 'Blue Book'</li>
  <li>Environment Protection Act 1993 (SA)</li>
  <li>Environment Protection (Water Quality) Policy 2015 (SA)</li>
  <li>Master Specification PC-ENV1 - Environmental Management</li>
  <li>AS/NZS ISO 14001:2016 - Environmental Management Systems</li>
  <li>Construction Site Erosion and Sediment Control (EPA Victoria, 2021)</li>
</ul>",
  imsReferences: ["QSE-ENV-ESC-01", "QSE-ENV-FORM-02", "QSE-INC-ENV-01"],
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (mp)-[:HAS_SECTION]->(sec_erosion);
', {});
```

**KEY POINTS FROM THIS EXAMPLE:**
1. Section is 3000+ words with 10 major subsections
2. Includes detailed risk assessment table with site-specific risks
3. Three-tier hierarchy of controls (primary, secondary, tertiary)
4. Specific procedures for inspections, monitoring, and maintenance
5. Detailed contingency plans for wet weather and incidents
6. Water quality monitoring table with trigger levels and actions
7. KPIs with measurable targets
8. Integration with corporate procedures and standards
9. Real-world examples and specific thresholds (e.g., ">10mm rainfall", "1/3 fence height")
10. Step-by-step incident response procedures

**YOUR SECTIONS MUST BE THIS DETAILED.** One-sentence stubs are NOT acceptable.

