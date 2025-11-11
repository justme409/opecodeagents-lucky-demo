PROMPT = r"""
You are generating a Traffic Management Plan (TMP) as structured JSON using the shared plan schema (title, revision?, metadata?, sections[] with nested content blocks: text, bullets, numbered, table, note, link).

Structured output requirements:
- Return ONLY valid JSON (no prose outside the JSON object).
- Strictly adhere to the PlanJson schema and permitted content blocks.
- Arrange sections clearly; avoid duplication of the same content across sections.

QSE system usage (critical):
- The prompt context includes a QSE SYSTEM REFERENCE adjacency list of corporate procedures/templates/pages.
- Heavily leverage existing corporate procedures/templates where relevant by inserting link blocks to those items using their title and path.
- Do not fabricate links; only reference items present in the QSE SYSTEM REFERENCE.
- If no relevant QSE item exists, derive content from PROJECT DOCUMENTS and established best practice; include a brief note indicating project-specific content will be created.

Use the most relevant jurisdictional template below (NT, VIC). If none applies, use the Generic template. Populate and expand sections based on PROJECT DOCUMENTS. Do not include any instructional text in the output; return only the final PlanJson object.

--- TEMPLATE: NT (Provision for Traffic / WZTM) ---
{
  "title": "Northern Territory Traffic Management Plan (TMP) — Layout (Provision for Traffic)",
  "revision": "Current",
  "metadata": {
    "jurisdiction": "NT",
    "agency": "Department of Infrastructure, Planning and Logistics (DIPL)",
    "source_document": "Provision for Traffic (WZTM) extracts",
    "standards": "AS 1742.3; AS/NZS 3845.1 & 3845.2; Portable Signals; Night Illumination"
  },
  "sections": [
    { "id": "intro", "title": "Introduction and Scope" },
    { "id": "competency", "title": "Competency and Roles (TMD; approvals)" },
    {
      "id": "submission-approvals",
      "title": "Submission and Approvals",
      "children": [
        { "id": "tmp-tgs", "title": "TMP and Traffic Guidance Schemes (TGS) Submission" },
        { "id": "audit-suitability", "title": "Independent Third-Party TMP/TGS Suitability Audit (if required)" },
        { "id": "appraisal", "title": "Superintendent/DIPL Appraisal and Consent to Use" },
        { "id": "amendments", "title": "Amendments to TMP/TGS (audit/appraisal before implementation)" },
        { "id": "records-approvals", "title": "Records of Approvals included with TMP" }
      ]
    },
    {
      "id": "design-criteria",
      "title": "Design Criteria and Devices",
      "children": [
        { "id": "night-illumination", "title": "Night Illumination Requirements (AS 1742.3)" },
        { "id": "barriers", "title": "Road Safety Barriers Compliance Statements (AS/NZS 3845.1/.2; manufacturer requirements)" },
        { "id": "portable-signals", "title": "Portable Traffic Signals (approvals; constraints)" },
        { "id": "speed-limits", "title": "Temporary Speed Limits (Superintendent approval)" }
      ]
    },
    {
      "id": "implementation",
      "title": "Implementation and Operations",
      "children": [
        { "id": "staging", "title": "Staging and Sequencing" },
        { "id": "site-changes", "title": "Managing Site Changes (modified TMP/TGS)" },
        { "id": "monitoring", "title": "Monitoring, Inspections and Audits (pre-use and ongoing)" },
        { "id": "contingencies", "title": "Contingencies and Emergency Response" }
      ]
    }
  ]
}

--- TEMPLATE: VIC (Section 166 cross-ref in Section 160) ---
{
  "title": "Victoria Traffic Management Plan (TMP) — Layout (Section 166 Reference)",
  "revision": "November 2018",
  "metadata": {
    "jurisdiction": "VIC",
    "agency": "Department of Transport (Vic)",
    "source_document": "Section 160 (references to Section 166 Traffic Management)",
    "standards": "Worksite Safety – Traffic Management Code of Practice"
  },
  "sections": [
    { "id": "intro", "title": "Introduction and Contract Interfaces (Section 160/166/168/176)" },
    { "id": "responsibilities", "title": "Responsibilities and Contact Details (MoA; major control items)" },
    { "id": "traffic-guidance", "title": "Traffic Guidance Schemes and Control Devices" },
    { "id": "qualifications", "title": "Worker Qualifications and High Visibility Clothing" },
    { "id": "audits-inspections", "title": "Audits, Inspections and Pre-opening Requirements" },
    { "id": "emergency", "title": "Emergency Response Arrangements and Initial Response Unit" }
  ]
}

--- TEMPLATE: GENERIC (Consolidated TMP) ---
{
  "title": "Generic Traffic Management Plan — Consolidated Layout",
  "metadata": {
    "jurisdiction": "Generic",
    "source_basis": "NT Provision for Traffic; VIC Section 166/160",
    "standards": "AS 1742.3; MUTCD/AGTTM as applicable; AS/NZS 3845"
  },
  "sections": [
    { "id": "intro", "title": "Introduction and Scope" },
    { "id": "roles", "title": "Roles, Competency and Responsibilities (TMD; approvals)" },
    {
      "id": "submissions",
      "title": "Submissions and Approvals",
      "children": [
        { "id": "tmp-tgs", "title": "TMP and TGS Submission" },
        { "id": "audits", "title": "Independent Suitability Audits / Appraisals" },
        { "id": "amendments", "title": "Amendments and Change Control" }
      ]
    },
    {
      "id": "design",
      "title": "Design Criteria and Devices",
      "children": [
        { "id": "illumination", "title": "Night Illumination" },
        { "id": "barriers", "title": "Road Safety Barriers Compliance" },
        { "id": "signals", "title": "Portable Signals and Temporary Speed Limits" }
      ]
    },
    { "id": "operations", "title": "Implementation, Monitoring and Emergency Response" }
  ]
}
"""



