# Project Details Extraction

## Context and Purpose

Project details form the foundation of all project management activities. These details provide essential metadata about the project including parties involved, contracts, dates, scope, and regulatory framework. Accurate extraction of this information from project documentation is critical for:

- Establishing project identity and traceability
- Understanding contractual relationships and obligations
- Identifying key stakeholders and contacts
- Tracking milestones and deliverables
- Ensuring jurisdiction-specific compliance

## Technical Requirements

### Data Sources

Project details should be extracted from authoritative sources in order of preference:

1. **Cover pages and title blocks** - Primary source for project names and identifiers
2. **Contract summaries** - Contract numbers, values, parties
3. **Front matter** - Project descriptions, scope summaries
4. **Specification documents** - Technical requirements and standards
5. **Contract documents** - Legal and commercial terms

### Core Data Elements

#### Project Identification
- **projectName** - Primary project name from cover/title blocks (REQUIRED - use this exact field name in camelCase)
- **projectCode** - Internal project code (if explicitly stated)
- **contractNumber** - Contract identifier from contract documents (clearly marked)
- **projectDescription** - One-sentence overview of the project (use this exact field name, NOT "description")
- **scopeSummary** - Brief summary of work scope

#### Location Information
- **Project address** - Physical site address (street, suburb, state, postcode)
- **State/territory** - Australian state/territory (full name or code)
- **Local council** - Local authority/council name
- **Jurisdiction** - MUST be one of:
  - `QLD, Queensland`
  - `SA, South Australia`
  - `NSW, New South Wales`
  - `VIC, Victoria`
  - `WA, Western Australia`
  - `TAS, Tasmania`
  - `NT, Northern Territory`
  - `ACT, Australian Capital Territory`
  - `Other`
  If the project is in Australia, infer the jurisdiction from the project address. Use `Other` only when no mapping applies.
- **Agency** - Responsible state/territory road authority. Use the exact string below that matches the jurisdiction:
  - `QLD, Queensland` → `Department of Transport and Main Roads`
  - `SA, South Australia` → `Department for Infrastructure and Transport`
  - `NSW, New South Wales` → `Transport for NSW`
  - `VIC, Victoria` → `Department of Transport and Planning`
  - `WA, Western Australia` → `Main Roads Western Australia`
  - `TAS, Tasmania` → `Department of State Growth`
  - `NT, Northern Territory` → `Department of Infrastructure, Planning and Logistics`
  - `ACT, Australian Capital Territory` → `Transport Canberra and City Services Directorate`
  - `Other` → Use the authority explicitly named in documents, otherwise keep the literal string `Other`.

#### Parties and Organisations
- Capture all contracting parties, principals, consultants, authorities and key contacts.
- In addition to the structured `parties` JSON string on the Project node, create separate `Party` nodes for every organisation/contact combination you extract.
  - **Party node fields:**
    - `projectId` (REQUIRED)
    - `code` - Stable slug (lowercase, hyphenated). Use organisation or organisation+role (e.g., `client-main-roads-wa`).
    - `name` - Party display name (organisation or individual if the contract is personal).
    - `role` - Role such as Client, Principal, Superintendent, Consultant, Authority, Subcontractor.
    - `organization` - Organisation name (for individuals, the company they represent; repeat `name` if they are the organisation).
    - `contactPerson` - Primary representative (if different from the organisation name).
    - `email`, `phone`, `address`, `abn` - Populate when present in documents; leave undefined if unknown.
    - `additionalDetails` - JSON object for any extra, verifiable data (e.g., licence numbers, specific responsibilities).
  - Deduplicate by `code`. Merge information when multiple documents reference the same party.
- Ensure `Party` nodes are linked to the Project via `[:BELONGS_TO_PROJECT]` when writing Cypher.

- **Client** - Client organisation(s)
- **Principal** - Principal contractor organisation(s)
- **Parties mentioned** - All identifiable persons with name, title, organisation
- **Contact details** - Names, roles, emails, phones, addresses

#### Dates and Milestones
- **Commencement date** - Project start date
- **Practical completion date** - Expected completion
- **Defects liability period** - Duration of defects period
- **Other key dates** - As specified in contract

#### Commercial Information
- **Contract value** - Monetary value (keep original formatting)
- **Procurement method** - Contract type (D&C, EPC, lump sum, etc.)

#### Regulatory Framework
- **Regulatory framework** - Governing legislation (e.g. Work Health and Safety Act)
- **Applicable standards** - Referenced standards and codes
- **Source documents** - Document IDs used for extraction

## Extraction Guidelines

### Field Availability
- Some fields may be available while others are not
- Populate every field you can verify from the documents
- Never invent or guess values
- If a value cannot be confidently determined, use null

### Project Codes and Identifiers
Do NOT extract any project/job/contract codes into the main projectCode field. Instead:
- List all codes in a structured format showing which party owns each code
- Include code type (Client Project Code, Contractor Code, etc.)
- Do not invent values - leave blank if unknown
- The internal project code (our own) must not be invented

### Jurisdiction Handling
- When jurisdiction can be inferred, the Project node `jurisdiction` field is REQUIRED and MUST use one of the canonical strings listed above.
- Set the Project node `agency` field to the matching road authority string (or `Other` if there is no applicable authority).
- Never output legacy jurisdiction codes or lowercase variants.

### Contact Directory
Extract every contact you can find, grouped by organisation category:

**Categories** (in order):
1. Client
2. Principal Contractor
3. Consultants/Engineers
4. Subcontractors
5. Authorities/Others

**For each contact include**:
- Name, Role/Title, Organisation
- Email, Phone, Mobile
- Address
- Notes/Responsibility area
- Deduplicate contacts and prefer the most complete record

### Organisational Hierarchy
Identify the principal organisations and roles and show the hierarchy:
- Include ABN/ACN if present
- Show primary contacts for each organisation
- Identify reporting relationships
- Ensure every organisation represented in the hierarchy also has a `Party` node with the same core information

## HTML Output Requirements

**CRITICAL**: The HTML content MUST be stored directly in the `htmlContent` field in Neo4j. 
DO NOT save HTML to a file. DO NOT store file paths. Store the complete HTML string inline in the database.

In addition to structured data, generate a comprehensive HTML document containing:

### 1. Overview
One or two concise sentences describing what the project is (e.g., "Design and construction of X at Y for Z"). Include the primary site/location if known. Keep it brief and factual.

Do NOT elaborate on scope, methodology, standards, or requirements. No marketing language.

### 2. Key Parties & Hierarchy
- Parties table with columns: Role, Organisation, ABN/ACN, Primary Contact
- Org Chart (SVG) showing relationships between organisations
- Use stable slugs for node IDs (e.g., clientRiverdaleCityCouncil)
- Link SVG nodes to Contact Directory anchors

### 3. Contact Directory (All contacts)
Group by organisation category with separate tables for each:
- Client
- Principal Contractor  
- Consultants/Engineers
- Subcontractors
- Authorities/Others

**Table columns**: Name, Role/Title, Organisation, Email, Phone, Mobile, Address, Notes/Responsibility

- Use mailto: links for emails
- Use tel: links for phones
- Set stable anchor id="contact-[slug]" for each contact row
- Slugs should be lowercase with hyphens (e.g., contact-jane-smith-riverdale-city-council)

### 4. Project Codes & Identifiers

**Project Codes table** with columns:
- Party/Organisation
- Code Type (e.g., Client Project Code, Principal Contractor Code)
- Code/Identifier
- Notes

**Other Identifiers** key-value table:
- Contract Number
- Project/Job numbers
- Purchase Order
- Site code
- Lot/Plan
- ABN/ACN

### 5. Dates & Milestones (optional)
If present, include contractually relevant dates in a table:
- Notice to Proceed
- Start Date
- Practical Completion
- Other milestones

### 6. Exclusions
Do NOT include regulatory standards, codes, QA/QC requirements, acceptance criteria, methods, or scope narrative. This page is details-only.

## HTML Formatting Requirements

- Use decimal section numbering (1., 1.1, 2., 2.1, etc.)
- Add stable id attributes for anchor linking
- Use thead/tbody in tables
- Apply inline styles for borders and formatting
- No images, no scripts, no external stylesheets
- Each contact row must include id="contact-[slug]" anchor
- SVG diagram should link to contact anchors using href="#contact-[slug]"
- Include viewBox for responsive SVG

## Task Instructions

1. Query the **Project Docs Database** (port 7688) to access all project documentation
2. Extract information systematically from authoritative sources
3. Validate and cross-reference information across documents
4. Generate both structured data and HTML output
5. Write the output to the **Generated Database** (port 7690)

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the Project schema. See the output schema file copied to your workspace for the exact structure.

**CRITICAL FIELD NAMES** (use these EXACT names in camelCase - the schema is the source of truth):
- `projectId` - Use the UUID provided in the prompt (PRIMARY KEY)
- `projectName` - NOT "name" (REQUIRED)
- `projectDescription` - NOT "description"
- `projectAddress` - Location field
- `projectCode` - Internal code
- `contractNumber` - Contract identifier
- `contractValue` - Contract value with currency
- `procurementMethod` - Contract type
- `scopeSummary` - Brief scope
- `stateTerritory` - Full state name
- `jurisdiction` - Canonical jurisdiction string (see list above)
- `agency` - Responsible road authority string (see mapping above)
- `localCouncil` - Council name
- `regulatoryFramework` - Governing legislation
- `applicableStandards` - Array of standards
- `parties` - JSON string with client, principal, partiesMentionedInDocs (keep for backward compatibility)
- `keyDates` - Object with commencementDate, practicalCompletionDate, defectsLiabilityPeriod
- `sourceDocuments` - Array of document IDs
- `htmlContent` - Complete HTML string (NOT a file path)
- `status` - One of: planning, active, on_hold, completed, archived
- `createdAt` - Use datetime()
- `updatedAt` - Use datetime()

In addition, create or update `Party` nodes per the schema: write each party via Cypher, set `createdAt`/`updatedAt` to datetime(), and connect them to the Project with `[:BELONGS_TO_PROJECT]`.

