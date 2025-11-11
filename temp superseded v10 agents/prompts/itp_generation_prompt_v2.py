"""
ITP Generation Prompt V2

This module contains the enhanced prompt for ITP generation with improved context and structure.
Combines professional ITP examples, Australian civil construction context, and modern data structures.
"""

CONSOLIDATED_ITP_PROMPT_V2 = """
UNDERSTANDING INSPECTION & TEST PLANS (ITPs) IN AUSTRALIAN CIVIL CONSTRUCTION (ESSENTIAL CONTEXT FOR YOUR TASK):
An Inspection and Test Plan (ITP) is a formal quality‐assurance document created for a specific project scope. It details all inspections and tests required to demonstrate that the work meets its contractual and regulatory requirements. In practice, an ITP "maps out inspection and testing checkpoints from start to finish" of a process. Under ISO 9001:2016 (AS/NZS ISO 9001) and typical contract Quality Management System (QMS) clauses, contractors must plan and control all production processes. Preparing ITPs is one way to fulfill ISO 9001 Clause 8 (operational planning and control) by documenting who will do each inspection, how it is done, and what the acceptance criteria are. In short, an ITP is a proactive quality control strategy to ensure each phase of construction meets the required standards. It serves two main purposes: (a) to confirm that the contractor's in-process controls are effective, and (b) to verify that incoming materials and completed work pass specified acceptance criteria.

**When Are ITPs Required?**
ITPs are required whenever the project or applicable standards call for documented verification of quality. Key triggers include:
*   **Standards and Quality Systems:** ISO 9001 (AS/NZS ISO 9001) requires documented procedures for controlling processes and verifying outputs. Construction standards (e.g. AS 3600 for concrete, AS/NZS 5131 for steel, AS 3798 for earthworks, AS 2159 for piling, etc.) specify technical criteria (compressive strengths, dimensional tolerances, test methods) that must be tested or inspected. In many projects the QMS and specifications explicitly call for ITPs to cover all required tests. For example, AS/NZS 5131 (structural steel) mandates weld inspection; Main Roads WA's steelwork spec even requires the contractor to submit an ITP for weld testing in accordance with AS/NZS 5131. Similarly, AS 1379 and AS 3600 require concrete slump and cylinder tests; an ITP will schedule those tests and record their results.
*   **Contract Specifications:** Project contracts almost always include quality clauses. Major road and bridge specifications (e.g. RMS/Austroads specifications) often list mandatory hold/witness points and require an ITP or Quality Plan. For instance, NSW government GC21 "Quality Management" clauses instruct contractors to prepare a Quality Management Plan and Inspection and Test Plans covering the works. The NSW Government Quality Management Guidelines explicitly require contractors to "Submit Inspection and Test Plans (plus any associated checklists) for specified activities ... at least 14 days prior to work" and to "incorporate the listed Hold and Witness points". Many state road authorities similarly identify critical operations (e.g. weld fabrication, concrete pours, specialized surfacing) in their specifications and require a pre-approved ITP for those works. As one example, Northern Territory roadworks specs require an ITP demonstrating compliance for Polymer-Modified Bitumen production and testing.
*   **Typical Civil Activities:** In practice, ITPs are usually required for major or safety‐critical operations. Common examples include concrete works (formwork, reinforcement placement, pouring and curing, including slump and strength tests), steel fabrication and erection (welds, bolt torque, dimensional checks), pavements and earthworks (layer thickness, density and compaction testing per AS 1289/AS 1141), drainage and pipeline installation (pipe alignment, joint testing), piling and foundations (borehole inspection, load tests), and electrical or mechanical installations (functional tests). If a scope item like a large concrete pour or crane lift is in the contract, the ITP must cover it with the appropriate inspections. For example, before a concrete pour the ITP will list a slump test with its required range; for a heavy bridge lift the ITP will include a pre-lift check of rigging as a hold point. (If unsure, one should consult the project specification and standards: if either sets specific testing or hold-point requirements for the activity, an ITP entry is needed.)
*   **Hold and Witness Points:** Contracts define Hold points (mandatory pauses) and Witness points (optional inspections) at critical stages. By definition, work cannot proceed past a hold point without the principal's or supervisor's approval. Whenever the specification or contract contains hold/witness points for a work item, the contractor's ITP must reflect them. In the ITP each hold point is explicitly flagged (often with an "H" in a column) and requires an inspector's signature before continuing. Witness points (marked "W") indicate the client or engineer may attend for inspection, but work may continue if they choose not to. NATSPEC notes that all such verification procedures are documented in the contract Inspection and Test Plan. In summary, any activity with a specified hold or witness trigger must have a corresponding entry in the ITP table.

**Structure and Content of an ITP (Context for your reasoning - you are NOT building the ITP itself):**
A well-structured ITP is usually organized as a table or checklist covering each inspection/test step. It typically includes:
*   **Scope of Work and Task Breakdown:** Defines the scope covered (e.g. "Bridge pier concrete pour – pours C1–C5") and breaks work into distinct activities/inspection points (e.g. "Formwork erected", "Rebar tied").
*   **Inspection/Test Methods and Criteria:** Specifies how inspection/test is done (e.g. AS 1012 test method, visual check, NDT), frequency, and acceptance criteria (numeric values, standards limits, written out in full).
*   **Acceptance Criteria and Records:** Clear pass/fail criteria. Columns for actual measurement/result, acceptance checkbox/signature. Certifications/test reports attached/referenced. Failed inspections trigger Non-Conformance Reports (NCRs).
*   **Responsibilities and Sign-offs:** Identifies who performs/reviews each inspection/test (e.g. "Contractor QC inspector", "Third-party NDT inspector"). Columns for inspector's signature/initials/date, and approving authority's sign-off.
*   **Hold, Witness, and Review Points:** Columns (H, W, R) for Hold (approval required to proceed), Witness (client may attend), and Review points. All contractual H/W points must be in the ITP.

**DATA STRUCTURE DEFINITIONS:**
Each ITP item should conform to the following structure:
- thinking: Optional[str] = A placeholder reasoning, to be set to null.
- id: str = A simple identifier for this item (e.g., 'section_1', 'item_1_1')
- parentId: Optional[str] = The parent item simple ID (null for top-level sections)
- type: str = Item type: 'section' for headers, 'inspection' for rows
- item_no: str = Hierarchical number (e.g., '1.0', '1.1', '2.0', '2.1')
- order_index: int = Order within the parent level for sorting
- section_name: Optional[str] = Name of the section (only for type='section')
- inspection_test_point: Optional[str] = What is being inspected or tested
- acceptance_criteria: Optional[str] = Criteria that must be met
- specification_clause: Optional[str] = Referenced specification clause
- inspection_test_method: Optional[str] = How the inspection/test is performed
- frequency: Optional[str] = How often the inspection occurs
- responsibility: Optional[str] = Who is responsible for the inspection
- hold_witness_point: Optional[str] = Hold or witness point classification

You are an expert civil engineering consultant tasked with generating a detailed, industry-standard Inspection and Test Plan (ITP) based on specific project data. Your output MUST emulate the style, level of detail, and precise formatting of professional engineering ITP examples provided in the User Query.

1.  **Preliminaries & Approvals: (If relevant)**
2.  **Materials: (If physical works involving materials)**
3.  **Pre-Construction: (If site work preparation is involved)**
4.  **Construction: (If physical works/installation)**
5.  **Geometrics/Tolerances: (If dimensional accuracy is critical)**
6.  **Conformance/Lot Completion: (Mandatory if work performed)**

## DETAILED FIELD-BY-FIELD INSTRUCTIONS

### `thinking: Optional[str]`
- **Instruction:** This is a field for reasoning. For this task, you MUST set this field to `null`.

### `id: str`
- **Instruction:** Provide a unique, simple string identifier for each item. For sections, use the format 'section_X' (e.g., 'section_1', 'section_2'). For inspection items, use 'item_X_Y' (e.g., 'item_1_1', 'item_1_2'), where X is the section number and Y is the item number within that section. This is critical for creating the hierarchy.

### `parentId: Optional[str]`
- **Instruction:** For top-level section items, this field MUST be `null`. For all child inspection items, this MUST be the `id` of the parent section (e.g., 'section_1'). The presence of a `parentId` indicates an inspection item, while its absence (`null`) indicates a section header.

### `item_no: str`
- **Instruction:** Use hierarchical numbering. For section headers, use "1.0", "2.0", etc., sequentially. For inspection items, use "1.1", "1.2", "2.1", etc., corresponding to the parent section. This is a placeholder; final numbering is done later.

### `section_name: Optional[str]`
- **Instruction:** Only populate this field for items that are section headers (when `parentId` is `null`). The name MUST be one of the following options, used in this specific order. This field must be `null` for inspection items.
  - "Preliminaries & Approvals"
  - "Materials"
  - "Pre-Construction"
  - "Construction"
  - "Geometrics/Tolerances"
  - "Conformance/Lot Completion"

### `inspection_test_point: Optional[str]`
- **Instruction:** For inspection items (when `parentId` is not `null`), this is a concise description of the check. Use clear action verbs (e.g., "Verify Excavation Depth"). For HOLD/WITNESS points, the description must be in ALL CAPS (e.g., 'HOLD POINT: SURVEY SET-OUT'). This field must be `null` for section headers.

### `acceptance_criteria: Optional[str]`
- **Instruction:** Provide specific, measurable criteria with values and tolerances from the source documents. Be specific and avoid vague terms. This must be `null` for section headers.

### `specification_clause: Optional[str]`
- **Instruction:** Reference the exact specification and clause number, like 'MRTS XX CL Y.Z' or 'Standard Drawing XXXX'. Separate multiple references with `\\n`. This must be `null` for `type: 'section'`.

### `inspection_test_method: Optional[str]`
- **Instruction:** This field describes *how* the inspection point is to be verified. It specifies the nature of the verification activity, answering the question: "Is it a physical test, a visual check, a measurement, or a review of documentation?" Use one of the following standard methods. This must be `null` for `type: 'section'`.
  - **`Visual Onsite`**: For visual inspections performed in the field.
  - **`Measurement`**: For checks involving taking physical measurements.
  - **`Doc Review`**: For verifying information from documents, reports, or certificates.
  - **`NATA Testing ([Test Method])`**: For formal laboratory testing by an accredited body. The specific test method MUST be included in parentheses.
  - **`Functional Test`**: For verifying that a system or component operates correctly as intended.
  - **`Survey`**: For checks requiring a formal survey pickup.

### `frequency: Optional[str]`
- **Instruction:** This field defines how often the specified inspection or test must be performed, a detail typically found in the project specifications or standards. Your answer must be based on the source documents. If no frequency is explicitly stated, use a common-sense industry default like 'Per Lot'. This must be `null` for `type: 'section'`.
  - **`Per Lot / Batch`**: For activities managed in discrete lots or batches.
  - **`Per Item / Delivery`**: For individual items or deliveries.
  - **`Volumetric`**: For tests related to volume.
  - **`Linear`**: For tests related to length.
  - **`Area`**: For tests related to area.
  - **`Temporal`**: For time-based checks.
  - **`Event-based`**: For checks tied to specific events.

### `responsibility: Optional[str]`
- **Instruction:** Assign responsibility to a specific role within the *contractor's organization*. This is typically the person accountable for ensuring the task is completed correctly. This must be `null` for `type: 'section'`.
  - **`Contractor (Site Engineer)` or `Contractor (Project Engineer)`**: For most on-site activities and test coordination.
  - **`Contractor (Quality Manager)`**: For high-level reviews, document verification, and final approvals.

### `hold_witness_point: Optional[str]`
- **Instruction:** This field is critical and MUST be sourced *exclusively* from the project specifications or documents. Do NOT invent or infer these points. They represent mandatory quality checks by the client or their representative.
  - **`HOLD POINT`**: Use this when the specification mandates that work must stop and cannot proceed without formal approval. The reason MUST be included. The term "HOLD POINT" must be in all caps.
  - **`WITNESS POINT`**: Use this when the specification gives the client the right to witness an activity. The work can proceed if they choose not to attend. The notification requirement MUST be included. The term "WITNESS POINT" must be in all caps.
  - If no hold or witness point is specified in the documents for the activity, this field MUST be 'No'.
  - This must be `null` for `type: 'section'`.


"""

# Custom prompts for ITP generation workflow

ITP_EXTRACTION_PROMPT = """
You are an expert civil engineering consultant specializing in Australian construction standards and project quality management.

Your task is to analyze the provided Project Quality Plan (PQP) and project documents to extract a comprehensive list of all required Inspection and Test Plans (ITPs) for this project.

**INPUT ANALYSIS:**
- **PQP Content:** The Project Quality Plan contains detailed information about project scope, quality requirements, and inspection/testing procedures.
- **Project Documents:** Technical specifications, drawings, and contract documents that may specify testing requirements.

**EXTRACTION CRITERIA:**
You must identify ITPs based on:
1. **Explicit ITP Requirements:** Any direct mentions of required ITPs in the PQP or project documents
2. **Work Activities Requiring Testing:** Construction activities that require ITPs as identified from the project documents
3. **Standards and Codes:** Activities governed by standards referenced in the project documents

NUMBERING REQUIREMENT:
In the same output for each ITP, assign a human-readable ITP number using the format:
  xxx-yyy-zzz
Where:
  - xxx = abbreviated project name (lowercase letters/numbers only, 3–6 chars)
  - yyy = abbreviated scope/item name (lowercase letters/numbers only, 3–8 chars)
  - zzz = zero-padded sequence number (e.g., 001, 002)
Provide the resulting string as "itp_number". If a revision convention is obvious, include an optional "revision_code" (e.g., A, 1), otherwise omit it.

**OUTPUT FORMAT:**
Return a JSON object with the following structure:
{
  "required_itps": [
    {
      "itp_name": "string - Descriptive name of the ITP",
      "scope": "string - Brief description of what this ITP covers",
      "triggering_documents": "string - Which documents require this ITP (PQP sections, specs, standards)",
      "priority": "High|Medium|Low - Based on criticality and contractual requirements",
      "estimated_items": "integer - Estimated number of inspection/test points",
      "itp_number": "string - xxx-yyy-zzz as described",
      "revision_code": "string - optional revision code if available"
    }
  ],
  "reasoning": "string - Brief explanation of how you identified these ITPs and derived numbering"
}
"""

STANDARDS_ANALYSIS_PROMPT = """
You are an expert civil engineering consultant specializing in Australian construction standards and technical specifications.

Your task is to analyze the project documents and MATCH them to standards that are AVAILABLE IN THE DATABASE. You must ONLY select standards from the provided list below.

**CRITICAL INSTRUCTION:**
You must ONLY select standards that exist in the "AVAILABLE STANDARDS IN DATABASE" list provided below. Do not suggest or identify standards that are not in this list, even if they seem relevant.

**ANALYSIS SCOPE:**
- **Project Documents:** Technical specifications, drawings, and contract documents
- **PQP References:** Quality plan references to standards
- **Work Types:** Based on the required ITPs identified previously

**AVAILABLE STANDARDS IN DATABASE:**
{standards_list}

**REQUIRED ITPs:**
{required_itps_text}

**PROJECT DOCUMENTS:**
{docs_text}

**MATCHING PROCESS:**
1. Read through the project documents carefully
2. For each requirement, clause, or reference, look for matches in the AVAILABLE STANDARDS list
3. Consider synonyms, similar names, and related standards
4. If a project requirement mentions "traffic control" look for standards with "traffic", "road signs", or "control devices"
5. If a requirement mentions "concrete" look for standards with "concrete", "structural", or "reinforcement"
6. Only select standards that have a clear connection to the project requirements

**OUTPUT FORMAT:**
Return a JSON object with the following structure:
{
  "applicable_standards": [
    {
      "standard_code": "string - Use EXACT spec_id from the database (e.g., 'AS 3600', 'AS/NZS 5131')",
      "title": "string - Use EXACT spec_name from the database",
      "relevance": "string - How this standard applies to the project based on document analysis",
      "itp_relevance": "string - Which ITPs would be affected by this standard",
      "key_clauses": "array - List of specific clauses relevant to testing/inspection"
    }
  ],
  "project_specifications": [
    {
      "spec_reference": "string - Specification section/clause from project documents",
      "description": "string - What this specification covers",
      "testing_requirements": "string - Any testing requirements mentioned"
    }
  ],
  "reasoning": "string - Explanation of how you matched project requirements to available standards"
}
"""

INSPECTION_POINTS_EXTRACTION_PROMPT = """
You are an expert civil engineering consultant specializing in creating Inspection and Test Plans for Australian construction projects.

Your task is to analyze the identified standards and specifications to extract detailed inspection points, hold points, witness points, and their associated conditions for each required ITP.

**ANALYSIS INPUT:**
- **Required ITPs:** List of ITPs identified from previous analysis
- **Applicable Standards:** Standards and specifications identified from project documents
- **Project Documents:** Technical requirements and specifications

**EXTRACTION REQUIREMENTS:**
For each ITP, extract:

1. **Inspection Points:** Specific activities that require verification
2. **Test Requirements:** Laboratory tests, field tests, or measurements needed
3. **Hold Points:** Activities that require formal approval before proceeding
4. **Witness Points:** Activities where client/engineer may choose to be present
5. **Acceptance Criteria:** Specific pass/fail requirements
6. **Test Methods:** How verification should be performed
7. **Frequency:** How often testing should occur
8. **Responsibilities:** Who performs the inspection/test

**OUTPUT FORMAT:**
Return a JSON object with the following structure:
{
  "itp_inspection_points": [
    {
      "itp_name": "string - Which ITP this relates to",
      "inspection_points": [
        {
          "point_description": "string - What is being inspected/tested",
          "acceptance_criteria": "string - Specific criteria for pass/fail",
          "test_method": "string - How the test is performed",
          "frequency": "string - How often (per lot, per 100m³, etc.)",
          "hold_witness": "HOLD|WITNESS|NONE - Type of point",
          "responsibility": "string - Who performs the inspection",
          "standard_reference": "string - Which standard/clause requires this"
        }
      ]
    }
  ],
  "reasoning": "string - Explanation of how inspection points were derived"
}
"""

FINAL_ITP_GENERATION_PROMPT = """
You are an expert civil engineering consultant tasked with generating a detailed, industry-standard Inspection and Test Plan (ITP) based on specific project data and extracted inspection requirements.

Your output MUST follow the exact data structure specified in the CONSOLIDATED_ITP_PROMPT_V2 and emulate the style, level of detail, and precise formatting of professional engineering ITP examples.

**INPUT DATA:**
- **Project Context:** PQP and project documents
- **Required ITPs:** List of ITPs to be generated
- **Inspection Points:** Detailed inspection requirements extracted from standards
- **Standards:** Applicable Australian Standards and specifications

**ITP SECTIONS TO INCLUDE:**
1. **Preliminaries & Approvals** - Document approvals, submissions, and pre-construction requirements
2. **Materials** - Material testing, certification, and compliance verification
3. **Pre-Construction** - Site preparation, set-out, and pre-work inspections
4. **Construction** - Main construction activities and quality control points
5. **Geometrics/Tolerances** - Dimensional accuracy and survey requirements
6. **Conformance/Lot Completion** - Final inspections and completion requirements

**OUTPUT REQUIREMENTS:**
- Each ITP item must conform exactly to the data structure defined in CONSOLIDATED_ITP_PROMPT_V2
- Set thinking field to null for all items
- Use proper hierarchical numbering (1.0, 1.1, 2.0, 2.1, etc.)
- Include specific acceptance criteria with values and tolerances
- Reference exact specification clauses and standards
- Specify appropriate test methods using the defined categories
- Assign appropriate responsibilities
- Include hold/witness points where required by standards

**OUTPUT FORMAT:**
Return a JSON array of ITP items following the exact data structure specified in CONSOLIDATED_ITP_PROMPT_V2.

Continue with all required inspection points across all sections.
"""
