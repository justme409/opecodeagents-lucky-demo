PROMPT = r"""
You are generating an Environmental Management Plan (EMP/CEMP) as structured JSON using the shared plan schema (title, revision?, metadata?, sections[] with nested content blocks: text, bullets, numbered, table, note, link).

Structured output requirements:
- Return ONLY valid JSON (no prose outside the JSON object).
- Must conform exactly to the PlanJson schema.
- Use only allowed content block types.
- Organize sections cleanly and avoid duplication.

QSE system usage (critical):
- The prompt context includes a QSE SYSTEM REFERENCE adjacency list of corporate procedures/templates/pages.
- Heavily leverage existing corporate procedures/templates when relevant by inserting link blocks to those items using their title and path.
- Do not fabricate links; only reference items present in the QSE SYSTEM REFERENCE.
- If no relevant QSE item exists, derive content from PROJECT DOCUMENTS and best practice; include a brief note indicating project-specific development where needed.

Use the most relevant jurisdictional template below (QLD, SA, TAS, WA). If none applies, use the Generic template. Populate and expand sections based on PROJECT DOCUMENTS. Do not include any instructional text in the output; return only the final PlanJson object.

--- TEMPLATE: QLD (MRTS51) ---
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
        { "id": "surveillance-audits", "title": "Principal’s Surveillance and Audits" },
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

--- TEMPLATE: SA (PC-ENV1) ---
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
        { "id": "cemp", "title": "Contractor’s Environmental Management Plan (CEMP)" },
        { "id": "quality-records", "title": "Quality Management Records" }
      ]
    },
    { "id": "contractor-obligations", "title": "Contractor’s Environmental Obligations" },
    { "id": "authorisations", "title": "Environmental Authorisations (Approvals, Licences, Permits)" },
    { "id": "objectives", "title": "Environmental Objectives" },
    { "id": "ems", "title": "Environmental Management System (AS/NZS ISO 14001 Certification)" },
    {
      "id": "personnel",
      "title": "Contractor’s Personnel",
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
      "title": "Issue-Specific Sub-plans",
      "content": [
        {
          "type": "note",
          "text": "Prepare issue-specific sub-plans as required by PC-ENV2 Environmental Protection Requirements and referenced guidelines."
        }
      ]
    }
  ]
}

--- TEMPLATE: TAS (Section 176) ---
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

--- TEMPLATE: WA (Spec 204) ---
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
      "title": "Annexure 204B — Principal Environmental Management Requirements",
      "content": [
        {
          "type": "bullets",
          "items": [
            "Aboriginal Heritage",
            "Acid Sulfate Soils",
            "Camps and Site Offices",
            "Clearing",
            "Communication",
            "Contamination",
            "Dewatering",
            "Demolition",
            "Dieback Management",
            "Documentation Management",
            "Dust Management",
            "Energy Management",
            "Erosion and Sedimentation Control",
            "European Heritage",
            "Fauna Management",
            "Fencing Installation",
            "Fire Management",
            "Handover Requirements",
            "Hazardous Materials",
            "Induction and Pre-Starts",
            "Machinery and Vehicle Management",
            "Mulch and Topsoil Management",
            "Noise Management",
            "Pegging and Flagging",
            "Pit Management (see Spec 303)",
            "Pre-coating",
            "Pre-construction",
            "Property Condition Survey",
            "Revegetation",
            "Road Marking",
            "Sealing, Priming and Sweeping",
            "Sidetracks and Temporary Access",
            "Special Environmental Areas",
            "Spill Management",
            "Spoil Management",
            "Stockpiles",
            "Traffic Management",
            "Vibration Management",
            "Waste Management",
            "Water Abstraction and Storage",
            "Water Drainage Management",
            "Water Reuse / Efficiency",
            "Weed Management",
            "Other Project-Specific Requirements"
          ]
        },
        { "type": "note", "text": "Use Annexure 204A CEMP Template sections and populate with project-specific operational controls and Hold Points." }
      ]
    }
  ]
}

--- TEMPLATE: GENERIC (Consolidated) ---
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
"""



