PROMPT = r"""
You are generating an OHS Management Plan (OHSMP/WHSMP) as structured JSON using the shared plan schema (title, revision?, metadata?, sections[] with nested content blocks: text, bullets, numbered, table, note, link).

Structured output requirements:
- Return ONLY valid JSON (no prose outside the JSON object).
- Conform exactly to the PlanJson schema.
- Use only allowed content block types and keep sections non-duplicative.

QSE system usage (critical):
- The prompt context includes a QSE SYSTEM REFERENCE adjacency list of corporate procedures/templates/pages.
- Heavily leverage existing corporate procedures/templates where applicable by adding link blocks to those items via their titles and paths.
- Do not invent links; only reference items included in the provided QSE SYSTEM REFERENCE.
- Where no relevant corporate item exists, synthesize content from PROJECT DOCUMENTS and recognized best practice; you may include a short note indicating a project-specific control will be developed.

Use the most relevant jurisdictional template below (VIC, WA). If none applies, use the Generic template. Populate and expand sections based on PROJECT DOCUMENTS. Do not include any instructional text in the output; return only the final PlanJson object.

--- TEMPLATE: VIC (Section 168A – Occupational Health and Safety Management) ---
{
  "title": "Victoria OHS Management Plan (HSMP) — Layout (Section 168A)",
  "revision": "Current",
  "metadata": {
    "jurisdiction": "VIC",
    "agency": "Department of Transport (Vic)",
    "source_document": "Section 168A Occupational Health and Safety Management",
    "standards": "ISO 45001:2018"
  },
  "sections": [
    {
      "id": "part-a-ohs-general",
      "title": "Part A — OHS General",
      "children": [
        { "id": "definitions", "title": "Definitions and Interpretation" },
        { "id": "principal-contractor", "title": "Contractor Responsibilities and Principal Contractor Appointment" },
        { "id": "ohs-risk-management", "title": "OHS Risk Management (workshops; ISO 31000)" },
        { "id": "hsmp-requirements", "title": "Health and Safety Management Plan (HSMP) Requirements" },
        {
          "id": "sub-plans",
          "title": "Required Sub Plans",
          "children": [
            { "id": "depot-site-mgmt", "title": "Depot Site Management Sub Plan" },
            { "id": "fatigue-mgmt", "title": "Fatigue Management Sub Plan" },
            { "id": "cor-hvnl", "title": "Heavy Vehicle National Law Compliance (CoR) Sub Plan" },
            { "id": "occ-health-hygiene", "title": "Occupational Health and Hygiene Sub Plan" },
            { "id": "emergency-incident", "title": "Emergency Response and Incident Management Sub Plan" },
            { "id": "mental-health", "title": "Mental Health and Wellbeing Management Sub Plan" }
          ]
        }
      ]
    },
    {
      "id": "part-b-incident",
      "title": "Part B — Incident Management",
      "children": [
        { "id": "prelim-incident-report", "title": "Preliminary Incident Reporting" },
        { "id": "investigation-report", "title": "Incident Investigation and Reporting" },
        { "id": "notifications", "title": "Statutory Notifications and Regulator Liaison" }
      ]
    },
    {
      "id": "part-c-reporting",
      "title": "Part C — Periodic Safety Reporting",
      "children": [
        { "id": "monthly-hs-performance", "title": "Monthly Health and Safety Performance Reporting" }
      ]
    },
    {
      "id": "part-d-audit-inspection",
      "title": "Part D — Auditing and Inspection",
      "children": [
        { "id": "audit", "title": "Health and Safety Audits (competency; scope; frequency)" },
        { "id": "inspection", "title": "Health and Safety Inspections" },
        { "id": "nonconformance", "title": "Non-conformances and Corrective Actions" }
      ]
    }
  ]
}

--- TEMPLATE: WA (Specification 203 – Health and Safety Management) ---
{
  "title": "Western Australia WHS Management Plan (HSMP) — Layout (Spec 203)",
  "revision": "03/12/2024",
  "metadata": {
    "jurisdiction": "WA",
    "agency": "Main Roads Western Australia",
    "source_document": "Specification 203 Health and Safety Management",
    "standards": "ISO 45001; WHS Act (WA); WHS Regulations (WA)"
  },
  "sections": [
    { "id": "scope", "title": "Scope and Structure" },
    { "id": "hold-points", "title": "Schedule of Hold Points and Identifiable Records" },
    { "id": "management-system", "title": "Management System Requirements (ISO 45001; FSC Accreditation)" },
    { "id": "references", "title": "References (Acts, Regulations, Standards, Codes)" },
    {
      "id": "hsmp",
      "title": "Part A — Health and Safety Management Plan",
      "children": [
        { "id": "leadership", "title": "Leadership, Commitment and Management Responsibility" },
        { "id": "consultation", "title": "Consultation, Cooperation, Coordination and Issue Resolution" },
        { "id": "subcontractors", "title": "Subcontractor Health and Safety Assessment" },
        { "id": "ppe", "title": "Personal Protective Equipment" },
        { "id": "aod", "title": "Alcohol and Other Drugs Testing" },
        { "id": "fatigue", "title": "Management of Fatigue" },
        { "id": "induction", "title": "Health and Safety Induction Training" },
        { "id": "swms", "title": "Safe Work Method Statements (SWMS)" },
        { "id": "auditing-reporting", "title": "Compliance Auditing and Performance Reporting" },
        { "id": "inspections", "title": "Workplace Health and Safety Inspections" },
        { "id": "nonconformance", "title": "Non-conformance and Corrective Action" },
        { "id": "regulatory-orders", "title": "Regulatory Orders, Notices and Convictions" },
        { "id": "incident-mgmt", "title": "Incident Management and EQSafe Reporting" },
        { "id": "monthly-reporting", "title": "Health and Safety Monthly Reporting" },
        { "id": "doc-records", "title": "Documentation and Record Management" },
        { "id": "hsmp-submission", "title": "Submission of the HSMP" },
        { "id": "hsmp-revision", "title": "Revision of the HSMP" }
      ]
    },
    {
      "id": "hirac",
      "title": "Part B — Hazard Identification, Risk Assessment and Control",
      "children": [
        { "id": "works-risk-assessment", "title": "Works WHS Risk Assessment" },
        { "id": "high-risk-work", "title": "High Risk Work and Principal Identified Hazards" },
        { "id": "asbestos", "title": "Asbestos Risk Management" },
        { "id": "fire", "title": "Fire Mitigation and Control" },
        { "id": "first-aid", "title": "First Aid Treatment" },
        { "id": "emp-submission", "title": "Submission of the Emergency Management Plan" },
        { "id": "emp-revision", "title": "Revision of the Emergency Management Plan" }
      ]
    },
    { "id": "handover", "title": "As-Built and Handover Requirements" },
    {
      "id": "annexures",
      "title": "Annexures and Appendices",
      "content": [
        { "type": "bullets", "items": [
          "Annexure 203A: Hold Points and Identifiable Records",
          "Annexure 203B: Minimum WHS Control Standards (High Risk Work & Identified Hazards)",
          "Annexure 203C: Asbestos Locations",
          "Annexure 203D: HSMP Cross Reference Key"
        ]}
      ]
    }
  ]
}

--- TEMPLATE: GENERIC (Consolidated OHS/WHS) ---
{
  "title": "Generic OHS/WHS Management Plan — Consolidated Layout",
  "metadata": {
    "jurisdiction": "Generic",
    "source_basis": "VIC Section 168A; WA Spec 203",
    "standards": "ISO 45001; WHS/OHS legislation as applicable"
  },
  "sections": [
    {
      "id": "governance",
      "title": "Governance and Responsibilities",
      "children": [
        { "id": "intro-scope", "title": "Introduction and Scope" },
        { "id": "roles-resp", "title": "Roles and Responsibilities (PCBU/Principal Contractor; HS Rep)" },
        { "id": "consultation", "title": "Consultation and Issue Resolution" },
        { "id": "legal-refs", "title": "Legislation, Standards and Codes of Practice" },
        { "id": "system-reqs", "title": "Management System Requirements (ISO 45001 certification)" }
      ]
    },
    {
      "id": "hsmp-core",
      "title": "HSMP Core Processes",
      "children": [
        { "id": "risk-management", "title": "Risk Management (HIRAC; workshops; ISO 31000)" },
        { "id": "swms", "title": "SWMS for High Risk Work" },
        { "id": "training-induction", "title": "Training and Induction (competency; assessment)" },
        { "id": "ppe", "title": "Personal Protective Equipment" },
        { "id": "fatigue", "title": "Fatigue Management" },
        { "id": "aod", "title": "Alcohol and Other Drugs" },
        { "id": "subcontractors", "title": "Subcontractor Assessment and Management" },
        { "id": "documentation", "title": "Documentation and Records Control" }
      ]
    },
    {
      "id": "incident-audit-reporting",
      "title": "Incident, Audit and Reporting",
      "children": [
        { "id": "incident-mgmt", "title": "Incident Management (preliminary and investigation reporting)" },
        { "id": "notifications", "title": "Regulatory Notifications and Orders/Notices" },
        { "id": "inspections", "title": "Workplace Inspections" },
        { "id": "auditing", "title": "Compliance Auditing and Performance Reporting" },
        { "id": "nonconformance", "title": "Non-conformance and Corrective Actions" },
        { "id": "monthly-reporting", "title": "Monthly HS Reporting" }
      ]
    },
    {
      "id": "emergency-firstaid",
      "title": "Emergency Management and First Aid",
      "children": [
        { "id": "emp", "title": "Emergency Management Plan (submission; revision)" },
        { "id": "fire", "title": "Fire Mitigation and Control" },
        { "id": "first-aid", "title": "First Aid Treatment and Resources" }
      ]
    },
    { "id": "handover", "title": "As-Built and Handover Requirements" }
  ]
}
"""



