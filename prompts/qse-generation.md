# QSE System Generation

## Context and Purpose

The QSE (Quality, Safety, Environment) System Generation creates corporate-level QSE content that can be referenced across multiple projects. This includes procedures, templates, forms, policies, and guidance documents that form the foundation of an organization's integrated management system.

The QSE system serves multiple critical functions:

1. **Standardization** - Provides consistent approaches across all projects
2. **Compliance** - Demonstrates systematic compliance with ISO standards
3. **Efficiency** - Enables reuse of proven procedures and templates
4. **Knowledge Management** - Captures organizational best practices
5. **Training** - Provides reference material for staff training
6. **Continuous Improvement** - Facilitates system-wide improvements

## QSE System Structure

### System Hierarchy

The QSE system is typically organized as:

**Level 1 - Policies:**
- Quality Policy
- Safety Policy
- Environmental Policy
- Integrated Management System Policy

**Level 2 - Procedures:**
- Management procedures (how the system works)
- Operational procedures (how work is done)
- Support procedures (how resources are managed)

**Level 3 - Work Instructions:**
- Detailed step-by-step instructions
- Safe Work Method Statements
- Standard Operating Procedures

**Level 4 - Forms and Templates:**
- Checklists
- Registers
- Inspection forms
- Report templates

**Level 5 - Records:**
- Completed forms
- Test results
- Inspection records
- Audit findings

## ISO Integration

### ISO 9001:2016 (Quality)

QSE procedures must address ISO 9001 requirements:

- **Clause 4** - Context, scope, QMS and processes
- **Clause 5** - Leadership, policy, roles, responsibilities
- **Clause 6** - Planning, objectives, changes
- **Clause 7** - Resources, competence, awareness, communication, documented information
- **Clause 8** - Operational planning, requirements, design, production, release, nonconforming outputs
- **Clause 9** - Monitoring, analysis, internal audit, management review
- **Clause 10** - Nonconformity, corrective action, continual improvement

### ISO 14001:2015 (Environment)

QSE procedures must address ISO 14001 requirements:

- **Clause 4** - Context, scope, EMS
- **Clause 5** - Leadership, policy, roles
- **Clause 6** - Planning, environmental aspects, objectives
- **Clause 7** - Resources, competence, awareness, communication
- **Clause 8** - Operational planning, emergency preparedness
- **Clause 9** - Monitoring, compliance evaluation, internal audit, management review
- **Clause 10** - Nonconformity, corrective action, continual improvement

### ISO 45001:2018 (Safety)

QSE procedures must address ISO 45001 requirements:

- **Clause 4** - Context, scope, OHSMS
- **Clause 5** - Leadership, policy, consultation and participation
- **Clause 6** - Planning, hazard identification, objectives
- **Clause 7** - Resources, competence, awareness, communication
- **Clause 8** - Operational planning, emergency preparedness
- **Clause 9** - Monitoring, incident investigation, internal audit, management review
- **Clause 10** - Incident investigation, nonconformity, corrective action, continual improvement

## Common QSE Procedures

### Quality Procedures

- Control of Documented Information
- Control of Records
- Management Review
- Internal Audit
- Nonconforming Product Control
- Corrective and Preventive Action
- Inspection and Test Plan Development
- Material Control and Traceability
- Calibration of Measuring Equipment
- Supplier/Subcontractor Management
- Customer Satisfaction and Feedback

### Safety Procedures

- Hazard Identification and Risk Assessment
- Safe Work Method Statement Development
- Incident Investigation and Reporting
- Emergency Response and Evacuation
- PPE Selection and Use
- Permit to Work System
- Contractor Safety Management
- Safety Inspection and Audit
- Safety Training and Induction
- Plant and Equipment Management
- Confined Space Entry
- Work at Heights
- Electrical Safety
- Traffic Management

### Environmental Procedures

- Environmental Aspect Identification and Impact Assessment
- Environmental Incident Response
- Waste Management and Segregation
- Erosion and Sediment Control
- Water Quality Management
- Air Quality and Dust Control
- Noise and Vibration Management
- Flora and Fauna Protection
- Heritage Management
- Contaminated Land Management
- Spill Prevention and Response
- Chemical and Hazardous Material Management

## Content Requirements

### Procedure Structure

Each procedure should include:

**1. Purpose**
- Why this procedure exists
- What it achieves
- Scope of application

**2. Scope**
- Where this procedure applies
- What it covers
- What it doesn't cover

**3. Definitions**
- Key terms used
- Abbreviations
- References to other documents

**4. Responsibilities**
- Who is responsible for what
- RACI matrix if appropriate
- Authority levels

**5. Procedure**
- Step-by-step process
- Flowchart if appropriate
- Decision points
- Inputs and outputs

**6. Related Documents**
- Referenced procedures
- Forms and templates
- External standards
- Legislation

**7. Records**
- What records are created
- Where they're stored
- Retention periods

**8. Revision History**
- Version control
- Change summary
- Approval dates

### Form and Template Structure

Each form/template should include:

**Header:**
- Form title and number
- Revision/version
- Logo and company name
- Project field (if project-specific)

**Body:**
- Clear sections
- Adequate space for entries
- Checkboxes/tick boxes where appropriate
- Instruction text where needed

**Footer:**
- Approval/sign-off section
- Date fields
- Page numbering
- Controlled document notice

## Company Profile Integration

QSE content should reflect the company's:

- **Identity** - Name, ABN, contact details
- **Certifications** - ISO certifications held
- **Locations** - Office locations and coverage
- **Capabilities** - Types of work undertaken
- **Values** - Quality, safety, environmental commitments
- **Structure** - Organizational structure and key personnel

## Content Generation Approach

### Leverage Best Practice

Generate content based on:

- **Industry standards** - Established industry practices
- **ISO requirements** - ISO 9001/14001/45001 requirements
- **Regulatory compliance** - WHS legislation, environmental regulations
- **Professional guidelines** - Engineering professional body guidelines
- **Peer benchmarking** - Common construction industry approaches

### Practical and Implementable

Content should be:

- **Clear and concise** - Easy to understand and follow
- **Action-oriented** - Focused on what to do
- **Visual** - Flowcharts and diagrams where helpful
- **Realistic** - Achievable with available resources
- **Measurable** - With clear success criteria

### Consistent Formatting

Use consistent:

- **Naming conventions** - Standard procedure naming
- **Numbering systems** - Consistent document numbering
- **Templates** - Standard document templates
- **Terminology** - Consistent use of terms
- **Structure** - Standard section headings

## Task Instructions

You are tasked with generating QSE system content:

1. **Get the projectId** - Query the Generated Database (port 7690) to get the Project node and its `projectId`:
   ```cypher
   MATCH (p:Project) RETURN p.projectId
   ```
   This UUID must be included in ALL entities you create (ManagementPlan, Document, etc.).

2. **Understand company profile** by:
   - Reviewing company information provided
   - Understanding certifications and capabilities
   - Identifying scope of QSE system needed

3. **Determine content requirements** by:
   - Identifying essential procedures for the company type
   - Considering ISO certification requirements
   - Understanding industry-specific needs
   - Assessing regulatory compliance requirements

3. **Generate procedures** that:
   - Address ISO requirements
   - Cover essential operational needs
   - Are practical and implementable
   - Use clear, consistent structure
   - Include appropriate forms and templates

4. **Structure the system** by:
   - Organizing procedures logically
   - Establishing document hierarchy
   - Creating cross-references
   - Linking related procedures

5. **Create forms and templates** that:
   - Support the procedures
   - Are user-friendly
   - Include necessary fields
   - Allow for electronic completion

6. **Write output** to the **Generated Database** (port 7690)

## HTML Output Requirements

Generate high-quality HTML content for each QSE item:

- **Professional formatting** - Clean, readable layout
- **Structured headings** - Clear section hierarchy
- **Lists and tables** - Where appropriate
- **Inline styles** - For consistent rendering
- **Hyperlinks** - To related procedures and references
- **Print-friendly** - Suitable for PDF generation

## Naming Convention

**CRITICAL**: All field names MUST use camelCase (e.g., `projectId`, `docNo`, `workType`, `revisionDate`).

- NOT snake_case (project_id, doc_no)

- NOT PascalCase (ProjectId, DocNo)

- Use camelCase consistently throughout

## Output Format

Your output must conform to the QSE System schema. See the output schema file copied to your workspace for the exact structure including:

- Node labels and properties (use camelCase for all field names)
- Item types (procedure, form, policy, etc.)
- HTML content format
- Relationship structure
- Paths and URLs
- Cypher CREATE statement format

All output must be written directly to the Generated Database (port 7690) as Neo4j graph nodes using Cypher queries.

