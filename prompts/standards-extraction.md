# Standards Extraction

## Context and Purpose

Standards extraction involves analyzing construction project documents to identify all referenced standards, specifications, codes, and regulatory documents. This creates a comprehensive standards register that links project requirements to specific technical standards and enables compliance tracking.

The standards register serves multiple critical functions:

1. **Compliance Tracking** - Identifies all applicable standards for the project
2. **Specification Linkage** - Links project requirements to technical standards
3. **Version Control** - Tracks which versions of standards apply
4. **Procurement** - Ensures correct standard versions are obtained
5. **Quality Assurance** - Supports verification of compliance
6. **Knowledge Base** - Builds organizational knowledge of applicable standards

## Types of Standards and References

### Australian Standards (AS)

Standards published by Standards Australia:

- **AS ####** - Australian Standards (e.g., AS 3600 Concrete Structures)
- **AS/NZS ####** - Joint Australian/New Zealand Standards (e.g., AS/NZS ISO 9001)
- **AS ####.#** - Multi-part standards (e.g., AS 1289.5.1.1)

Common construction standards:
- AS 3600 - Concrete structures
- AS 3798 - Guidelines on earthworks for commercial and residential developments
- AS/NZS 5131 - Structural steelwork - Fabrication and erection
- AS 2159 - Piling - Design and installation
- AS 1289 - Methods of testing soils for engineering purposes
- AS 1141 - Methods for sampling and testing aggregates

### State Road Authority Specifications

Jurisdiction-specific technical specifications:

**Queensland:**
- **MRTS##** - Main Roads Technical Specifications (e.g., MRTS04 Earthworks, MRTS05 Roadworks)
- **MRS##** - Main Roads Specifications (e.g., MRS11 Pavements)
- **MRTS##.#** - Sub-specifications

**New South Wales:**
- **QA Specifications** - RMS Quality Assurance Specifications
- **B###** - RMS Technical Specifications (e.g., B80 Earthworks)
- **R###** - RMS Specifications (e.g., R44 Earthworks)

**Victoria:**
- **Section ###** - VicRoads Specifications (e.g., Section 204 Earthworks)
- **Standard Drawings**

**South Australia:**
- **T###** - DPTI Technical Specifications
- **Standard Drawings**

**Western Australia:**
- **###** - Main Roads WA Specifications (e.g., 501 Pavements)

### Test Method Standards

Standards defining test procedures:

- **AS 1012** - Methods of testing concrete
- **AS 1289** - Methods of testing soils for engineering purposes
- **AS 1141** - Methods for sampling and testing aggregates
- **AS 2891** - Methods of sampling and testing asphalt
- **ASTM** - American Society for Testing and Materials standards
- **AASHTO** - American Association of State Highway and Transportation Officials standards

### International Standards

- **ISO ####** - International Organization for Standardization (e.g., ISO 9001, ISO 14001, ISO 45001)
- **IEC ####** - International Electrotechnical Commission standards
- **BS ####** - British Standards
- **EN ####** - European Standards

### Codes and Regulations

- Building Code of Australia (BCA) / National Construction Code (NCC)
- Australian Design Rules (ADR)
- Work Health and Safety Regulations
- Environmental Protection Regulations
- State-specific codes and regulations

## Extraction Guidelines

### Standard Code Identification

Extract standard codes as mentioned in documents:

- **Full code** - "AS 1379", "MRTS04", "AS/NZS ISO 9001:2016"
- **Include year** - If year/version is specified (e.g., "AS 3600-2018")
- **Include part numbers** - For multi-part standards (e.g., "AS 1289.5.1.1")
- **Maintain formatting** - Keep hyphens, dots, colons as written

### Context Extraction

For each standard reference, capture:

**Section Reference:**
- Specific section, clause, or table referenced
- Examples: "Clause 5.2.3", "Section 4", "Table 3.1"

**Context:**
- How the standard is referenced
- What requirement it relates to
- Examples: "Testing shall be in accordance with...", "Material properties as per...", "Design to comply with..."

**Document Location:**
- Document IDs where the standard was found
- Multiple documents may reference the same standard

### Database Matching

For each extracted standard:

1. **Search the Standards Database** (port 7687) for matching standards
2. **Match by code** - Look for exact or similar standard codes
3. **Consider jurisdiction** - Prioritize standards matching project jurisdiction
4. **Extract database information** if found:
   - UUID
   - Full specification name
   - Organization identifier
   - Version/year
   - Jurisdiction

5. **Set found_in_database flag**:
   - `true` - If standard found in database
   - `false` - If standard not found in database

### Jurisdiction Filtering

Standards databases are organized by jurisdiction:

**Jurisdiction Codes:**
- QLD - Queensland
- NSW - New South Wales
- VIC - Victoria
- SA - South Australia
- WA - Western Australia
- TAS - Tasmania
- NT - Northern Territory
- ACT - Australian Capital Territory
- National - Australia-wide standards

**Matching Strategy:**
1. Determine project jurisdiction from project details
2. Query standards database filtering by jurisdiction
3. Match extracted standards to jurisdiction-specific standards first
4. Fall back to national standards if no jurisdiction match

## Common Standard References

### Concrete Works

- AS 3600 - Concrete structures (design)
- AS 1379 - Specification and supply of concrete
- AS 2758.1 - Aggregates and rock for engineering purposes
- AS 1012 - Methods of testing concrete
- AS/NZS 4671 - Steel reinforcing materials

### Earthworks

- AS 3798 - Guidelines on earthworks
- MRTS04 (QLD) / B80 (NSW) / Section 204 (VIC) - Earthworks specifications
- AS 1289 - Methods of testing soils

### Pavements

- AGPT/T### - Austroads Guide to Pavement Technology
- MRTS05 (QLD) / Section 405 (VIC) / 501 (WA) - Pavement specifications
- AS 2891 - Methods of sampling and testing asphalt
- AS 1141 - Methods for sampling and testing aggregates

### Structural Steel

- AS/NZS 5131 - Structural steelwork - Fabrication and erection
- AS 4100 - Steel structures
- AS/NZS 1554 - Structural steel welding
- AS/NZS 1252 - High strength steel bolts

### Quality Management

- AS/NZS ISO 9001 - Quality management systems
- AS/NZS ISO 14001 - Environmental management systems
- AS/NZS ISO 45001 - Occupational health and safety management systems

## Output Data Structure

For each standard extracted, provide:

- **standard_code** - Code as mentioned in document (e.g., "AS 1379", "MRTS04")
- **uuid** - UUID from reference database (if found)
- **spec_name** - Full name from reference database (if found)
- **org_identifier** - Organization identifier from database (if found)
- **section_reference** - Specific section/clause referenced (if applicable)
- **context** - Context of how standard is referenced
- **found_in_database** - Boolean flag
- **document_ids** - List of document IDs where standard was found

## Task Instructions

You are tasked with extracting all standards references from project documentation:

1. **Get the project_uuid** - Query the Generated Database (port 7690) to get the Project node and its `project_uuid`:
   ```cypher
   MATCH (p:Project) RETURN p.project_uuid
   ```
   This UUID must be included in ALL Standard entities you create.

2. **Query the Project Docs Database** (port 7688) to access:
   - All project documents
   - Full document text
   - Document metadata

3. **Query the Standards Database** (port 7687) to access:
   - Available standards by jurisdiction
   - Standard metadata
   - Standard versions

4. **Extract standard references** by:
   - Scanning document text for standard codes
   - Identifying context and section references
   - Recording document locations
   - Capturing exact quotations

4. **Match to database** by:
   - Searching Standards Database for each extracted code
   - Filtering by project jurisdiction
   - Extracting database metadata if found
   - Setting found_in_database flag appropriately

5. **Compile output** with:
   - Deduplicated list of unique standards
   - All document references for each standard
   - Complete metadata from database matches
   - Context and section references

6. **Write output** to the **Generated Database** (port 7690)

## Database Query Strategy

### Start Broad, Narrow Down

1. **Initial query** - Get all standards for project jurisdiction
2. **Filter by code pattern** - Search for specific code formats
3. **Exact match** - Look for exact standard code match
4. **Fuzzy match** - Consider similar codes if no exact match
5. **Verify match** - Confirm matched standard is appropriate

### Example Queries

**Get all standards for jurisdiction:**
```cypher
MATCH (s:Standard)
WHERE s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National'
RETURN s
```

**Search for specific standard:**
```cypher
MATCH (s:Standard)
WHERE s.code = $standard_code 
  AND (s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National')
RETURN s
```

**Fuzzy search:**
```cypher
MATCH (s:Standard)
WHERE s.code CONTAINS $code_fragment
  AND (s.jurisdiction = $jurisdiction OR s.jurisdiction = 'National')
RETURN s
```

## Validation

Before finalizing the standards register:

- Verify all extracted codes are plausible standard codes
- Check that database matches are appropriate
- Confirm jurisdiction filtering is correct
- Validate document references exist
- Ensure no duplicate entries
- Check that context information is meaningful

## Output Format

Your output must conform to the Standards reference schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties
- Required vs optional fields
- Relationship structure
- Database linkage format
- Cypher CREATE statement format

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

