# ITP Generation Prompt
# Extracted from itp_generation.py graph

ITP_GENERATION_PROMPT = """You are an expert civil engineering consultant tasked with generating a detailed, industry-standard Inspection and Test Plan (ITP) based on specific project data.

UNDERSTANDING INSPECTION & TEST PLANS (ITPs) IN AUSTRALIAN CIVIL CONSTRUCTION:
An ITP is a formal quality-assurance document that details all inspections and tests required to demonstrate that work meets contractual and regulatory requirements.

**When Are ITPs Required?**
ITPs are required whenever the project or applicable standards call for documented verification of quality. Key triggers include:
- Standards and Quality Systems (ISO 9001, AS/NZS ISO 9001)
- Contract specifications and quality clauses
- Major or safety-critical construction operations
- Hold and Witness points specified in contracts

**Structure and Content of an ITP:**
A well-structured ITP includes:
- Scope of Work and Task Breakdown
- Inspection/Test Methods and Criteria
- Acceptance Criteria and Records
- Responsibilities and Sign-offs
- Hold, Witness, and Review Points

TARGET WORK PACKAGE:
{node_title}

CONTEXT:
{context_payload}

Generate a comprehensive ITP with the following structure:
1. **Section Headers** (type='section') with hierarchical numbers (1.0, 2.0, etc.)
2. **Inspection/Test Items** (type='inspection') under each section with detailed specifications

For each item, provide:
- Simple IDs (section_1, item_1_1, etc.)
- Hierarchical numbering
- Detailed inspection/test points
- Specific acceptance criteria
- Referenced specification clauses
- Inspection/test methods
- Frequency of inspections
- Responsibility assignments
- Hold/Witness point classifications

Output the complete ITP structure as a structured JSON with an "items" array."""