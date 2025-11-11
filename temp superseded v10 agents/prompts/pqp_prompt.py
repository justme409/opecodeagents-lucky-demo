PROMPT = r"""
You are generating a Project Quality Plan (PQP) as structured JSON.

Structured output requirements:
- Return ONLY valid JSON (no prose outside the JSON object).
- Conform exactly to the schema specified by the Output Schema instructions provided by the system. If there is any conflict with guidance below, follow the Output Schema.
- Use only these content blocks (if applicable to the chosen schema): text, bullets, numbered, table, note, link.
- Be exhaustive, implementable, and field-usable. Avoid redundancy but prefer complete, practitioner-level detail over brevity.
- Do NOT prefix any titles with numbers (e.g., no "1.", "1.0", "5.1"). Strip numbering embedded in source headings.
- Exclude table-of-contents or PDF artifacts (e.g., "Contents", "Print", page numbers) from titles and content.
- Omit contract identifiers entirely unless the exact value is expressly quoted in the PROJECT DOCUMENTS; never fabricate or restate "Contract No" fields. When a contract identifier is absent or uncertain, output "Not provided" rather than inventing or copying placeholders.

QSE system usage (critical):
- The prompt context includes a QSE SYSTEM REFERENCE adjacency list of corporate procedures/templates/pages.
- Heavily leverage existing corporate procedures/templates when relevant by inserting link blocks to those items using their title and full absolute URL (e.g., {"type":"link","label":"Procedure for Control of Documented Information","url":"https://projectpro.pro/qse/corp-documentation"}). Construct URLs by prefixing each node `path` from QSE SYSTEM REFERENCE with "https://projectpro.pro".
- Do not fabricate links. Only link to items present in the QSE SYSTEM REFERENCE.
- When no relevant QSE item exists, derive content from PROJECT DOCUMENTS and best practice; you may add a short note block indicating that a project-specific procedure/template will be created.
- Prefer cross-referencing over duplicating corporate content.
- Render QSE references as clickable anchors (e.g., <a class="qse-link" href="https://projectpro.pro/qse/corp-documentation">Procedure for Control of Documented Information</a>) and never emit raw JSON objects such as {"type":"link"}. Reuse the shared `.qse-link` styling defined in the inline stylesheet described below.

Use the most relevant jurisdictional template below (QLD, SA, VIC, NSW). If none applies, use the Generic template. Populate and expand sections based on PROJECT DOCUMENTS. Do not include any instructional text in the output; return only the final plan object.

ITP Handling: When extracting lists of ITPs (Inspection and Test Plans), copy them exactly from the supplied PROJECT DOCUMENTS list. Maintain a 1:1 correspondence - do not combine items, do not leave any out, and preserve the original structure and content as provided.

--- TEMPLATE: QLD (MRTS50 – Specific Quality System Requirements) ---
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

--- TEMPLATE: SA (PC-QA2 – Quality Management Requirements for Major Projects) ---
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

--- TEMPLATE: VIC (Section 160 – Construction General, Part A Management Systems) ---
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

--- TEMPLATE: NSW (TfNSW Q6 – Quality Management Major Works) ---
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

--- TEMPLATE: GENERIC (Consolidated Quality) ---
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
"""
