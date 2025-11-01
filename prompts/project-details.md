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
- **Project name** - Primary project name from cover/title blocks
- **Project code** - Internal project code (if explicitly stated)
- **Contract number** - Contract identifier from contract documents (clearly marked)
- **Project description** - One-sentence overview of the project
- **Scope summary** - Brief summary of work scope

#### Location Information
- **Project address** - Physical site address (street, suburb, state, postcode)
- **State/territory** - Australian state/territory (full name or code)
- **Local council** - Local authority/council name
- **Jurisdiction** - Governing jurisdiction
- **Jurisdiction code** - UPPERCASE code [QLD, NSW, VIC, SA, WA, TAS, NT, ACT]

#### Parties and Organisations
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
Do NOT extract any project/job/contract codes into the main project_code field. Instead:
- List all codes in a structured format showing which party owns each code
- Include code type (Client Project Code, Contractor Code, etc.)
- Do not invent values - leave blank if unknown
- The internal project code (our own) must not be invented

### Jurisdiction Handling
- When jurisdiction can be inferred, the jurisdiction_code is REQUIRED
- Must be one of [QLD, NSW, VIC, SA, WA, TAS, NT, ACT] in UPPERCASE
- If only a full state name is present (e.g., "Queensland", "South Australia"), convert to the corresponding code (QLD, SA, etc.)
- DO NOT output lowercase or any other values

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

## HTML Output Requirements

In addition to structured data, generate a comprehensive HTML document containing:

### 1. Overview
One or two concise sentences describing what the project is (e.g., "Design and construction of X at Y for Z"). Include the primary site/location if known. Keep it brief and factual.

Do NOT elaborate on scope, methodology, standards, or requirements. No marketing language.

### 2. Key Parties & Hierarchy
- Parties table with columns: Role, Organisation, ABN/ACN, Primary Contact
- Org Chart (SVG) showing relationships between organisations
- Use stable slugs for node IDs (e.g., client_riverdale_city_council)
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

## Output Format

Your output must conform to the Project schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties
- Required vs optional fields
- HTML formatting requirements
- Relationship structure
- Cypher CREATE statement format

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

