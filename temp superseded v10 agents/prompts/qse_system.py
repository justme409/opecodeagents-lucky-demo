"""
QSE System hierarchy and document catalogue.

This module provides a comprehensive, flat JSON-like node list describing the
QSE (Quality, Safety, Environment) management system hierarchy and all controlled
documents defined under the Next.js app routes at /qse.

Each node is a dictionary with the following common keys:
  - id: unique node id (page path-like for sections/pages; stable keys for docs)
  - parent_id: id of the parent node (None for the root)
  - type: one of {section, page, manual, statement, policy, procedure, register,
           form, plan, template}
  - title: human-readable title
  - path: in-app route for the page presenting this node (for pages); for docs,
          the path to the page where the document is surfaced
  - description: short description suitable for LLM grounding

Document nodes also include:
  - document_number: the controlled document identifier (e.g., "QSE-9.1-FORM-01")

Notes:
  - This is intentionally a flat adjacency list (parent_id links define the tree).
  - Descriptions are distilled from the TSX page content where available, or
    provided as succinct, standards-aligned summaries when the TSX did not include
    an explicit blurb for that document.

Source of truth pages referenced:
  /app/projectpro_qa_v2/src/app/(app)/qse/**

Last generated: automated by assistant
"""

# Root node
QSE_SYSTEM_NODES = [
    {
        "id": "qse",
        "parent_id": None,
        "type": "section",
        "title": "QSE Management System",
        "path": "/qse",
        "description": (
            "Integrated Quality, Safety, and Environment (QSE) management system aligned "
            "with ISO 9001:2015, ISO 14001:2015, and ISO 45001:2018."
        ),
    },

    # Tier 1 (Corporate, foundational)
    {
        "id": "qse/corporate-tier-1",
        "parent_id": "qse",
        "type": "page",
        "title": "Corporate QSE Management System (Tier 1)",
        "path": "/qse/corporate-tier-1",
        "description": (
            "Foundational IMS documents defining scope, context, policy framework and "
            "process interactions of the integrated management system."
        ),
    },
    {
        "id": "doc:QSE-1-MAN-01",
        "parent_id": "qse/corporate-tier-1",
        "type": "manual",
        "document_number": "QSE-1-MAN-01",
        "title": "Integrated Management System (IMS) Manual",
        "path": "/qse/corporate-tier-1",
        "description": (
            "Keystone manual defining the scope, context, policies, and process interactions "
            "of the integrated QSE management system."
        ),
    },
    {
        "id": "doc:QSE-4.3-STMT-01",
        "parent_id": "qse/corporate-tier-1",
        "type": "statement",
        "document_number": "QSE-4.3-STMT-01",
        "title": "IMS Scope Statement",
        "path": "/qse/corporate-tier-1",
        "description": (
            "Formal statement defining the boundaries and applicability of the IMS across "
            "corporate and project operations."
        ),
    },

    # 5.0 Leadership
    {
        "id": "qse/corp-leadership",
        "parent_id": "qse",
        "type": "page",
        "title": "5.0 Leadership",
        "path": "/qse/corp-leadership",
        "description": (
            "Leadership commitment, policy framework, roles and consultation mechanisms "
            "that drive the IMS."
        ),
    },
    {
        "id": "qse/corp-policy-roles",
        "parent_id": "qse",
        "type": "page",
        "title": "5.2-5.3 Policy, Roles & Responsibilities",
        "path": "/qse/corp-policy-roles",
        "description": (
            "Foundational documents defining management commitment and organizational "
            "structure for QSE."
        ),
    },
    {
        "id": "doc:QSE-5.2-POL-01",
        "parent_id": "qse/corp-policy-roles",
        "type": "policy",
        "document_number": "QSE-5.2-POL-01",
        "title": "QSE Policy Statement",
        "path": "/qse/corp-policy-roles",
        "description": (
            "Official declaration of top management's commitment to quality, safety, and the environment."
        ),
    },
    {
        "id": "doc:QSE-5.3-REG-01",
        "parent_id": "qse/corp-policy-roles",
        "type": "register",
        "document_number": "QSE-5.3-REG-01",
        "title": "Roles, Responsibilities & Authorities Matrix",
        "path": "/qse/corp-policy-roles",
        "description": (
            "Matrix defining QSE responsibilities and authorities for key roles across the organization."
        ),
    },
    {
        "id": "qse/corp-consultation",
        "parent_id": "qse",
        "type": "page",
        "title": "5.4 Worker Consultation & Participation",
        "path": "/qse/corp-consultation",
        "description": (
            "Framework and evidence of worker involvement in QSE matters at all levels."
        ),
    },
    {
        "id": "doc:QSE-5.4-PROC-01",
        "parent_id": "qse/corp-consultation",
        "type": "procedure",
        "document_number": "QSE-5.4-PROC-01",
        "title": "Procedure for Consultation & Participation",
        "path": "/qse/corp-consultation",
        "description": (
            "Mechanisms for effective worker engagement on health, safety, and environmental issues."
        ),
    },
    {
        "id": "doc:QSE-5.4-FORM-01",
        "parent_id": "qse/corp-consultation",
        "type": "form",
        "document_number": "QSE-5.4-FORM-01",
        "title": "Health & Safety Committee Meeting Minutes Template",
        "path": "/qse/corp-consultation",
        "description": "Blank template for recording formal worker consultation meeting minutes.",
    },

    # 6.0 Planning
    {
        "id": "qse/corp-planning",
        "parent_id": "qse",
        "type": "page",
        "title": "6.0 Planning",
        "path": "/qse/corp-planning",
        "description": (
            "Systematic approach to planning: risk & opportunity management, compliance, and setting objectives."
        ),
    },
    {
        "id": "qse/corp-risk-management",
        "parent_id": "qse",
        "type": "page",
        "title": "6.1 Risk & Opportunity Management",
        "path": "/qse/corp-risk-management",
        "description": (
            "Framework and registers for identifying, analysing and treating QSE risks and opportunities."
        ),
    },
    {
        "id": "doc:QSE-6.1-PROC-01",
        "parent_id": "qse/corp-risk-management",
        "type": "procedure",
        "document_number": "QSE-6.1-PROC-01",
        "title": "Procedure for Risk & Opportunity Management",
        "path": "/qse/corp-risk-management",
        "description": (
            "Process for identifying, analysing, evaluating, treating, monitoring and communicating risks and opportunities."
        ),
    },
    {
        "id": "doc:QSE-6.1-REG-01",
        "parent_id": "qse/corp-risk-management",
        "type": "register",
        "document_number": "QSE-6.1-REG-01",
        "title": "Corporate Risk Register",
        "path": "/qse/corp-risk-management",
        "description": "Live register of significant strategic and operational QSE risks.",
    },
    {
        "id": "doc:QSE-6.1-REG-02",
        "parent_id": "qse/corp-risk-management",
        "type": "register",
        "document_number": "QSE-6.1-REG-02",
        "title": "Corporate Opportunity Register",
        "path": "/qse/corp-risk-management",
        "description": "Register for tracking potential improvements and strategic QSE opportunities.",
    },
    {
        "id": "qse/corp-legal",
        "parent_id": "qse",
        "type": "page",
        "title": "6.1.3 Compliance Obligations",
        "path": "/qse/corp-legal",
        "description": "Identification, access and management of legal and other requirements.",
    },
    {
        "id": "doc:QSE-6.1-PROC-02",
        "parent_id": "qse/corp-legal",
        "type": "procedure",
        "document_number": "QSE-6.1-PROC-02",
        "title": "Procedure for Identifying Compliance Obligations",
        "path": "/qse/corp-legal",
        "description": (
            "Process for ensuring awareness of, and access to, legal and other compliance obligations."
        ),
    },
    {
        "id": "doc:QSE-6.1-REG-03",
        "parent_id": "qse/corp-legal",
        "type": "register",
        "document_number": "QSE-6.1-REG-03",
        "title": "Compliance Obligations Register",
        "path": "/qse/corp-legal",
        "description": "Live register of legal and other compliance obligations applicable to operations.",
    },
    {
        "id": "qse/corp-objectives",
        "parent_id": "qse",
        "type": "page",
        "title": "6.2 QSE Objectives",
        "path": "/qse/corp-objectives",
        "description": "Framework and plan for setting and achieving QSE objectives.",
    },
    {
        "id": "doc:QSE-6.2-PROC-01",
        "parent_id": "qse/corp-objectives",
        "type": "procedure",
        "document_number": "QSE-6.2-PROC-01",
        "title": "Procedure for Setting QSE Objectives",
        "path": "/qse/corp-objectives",
        "description": "Process for establishing, communicating and monitoring QSE objectives and targets.",
    },
    {
        "id": "doc:QSE-6.2-PLAN-01",
        "parent_id": "qse/corp-objectives",
        "type": "plan",
        "document_number": "QSE-6.2-PLAN-01",
        "title": "Annual QSE Objectives & Targets Plan",
        "path": "/qse/corp-objectives",
        "description": "Documented plan outlining current-year QSE goals and targets.",
    },

    # 7.0 Support
    {
        "id": "qse/corp-support",
        "parent_id": "qse",
        "type": "page",
        "title": "7.0 Support",
        "path": "/qse/corp-support",
        "description": (
            "Organizational support systems for resources, competence, awareness, communication, and documented information."
        ),
    },
    {
        "id": "qse/corp-competence",
        "parent_id": "qse",
        "type": "page",
        "title": "7.1-7.3 Resources, Competence & Awareness",
        "path": "/qse/corp-competence",
        "description": (
            "Ensures adequate resources, develops personnel competence, and promotes QSE awareness."
        ),
    },
    {
        "id": "doc:QSE-7.2-PROC-01",
        "parent_id": "qse/corp-competence",
        "type": "procedure",
        "document_number": "QSE-7.2-PROC-01",
        "title": "Procedure for Training, Competence & Awareness",
        "path": "/qse/corp-competence",
        "description": (
            "Systematic approach for identifying training needs, ensuring competence, and promoting awareness."
        ),
    },
    {
        "id": "doc:QSE-7.2-REG-01",
        "parent_id": "qse/corp-competence",
        "type": "register",
        "document_number": "QSE-7.2-REG-01",
        "title": "Training Needs Analysis & Competency Matrix",
        "path": "/qse/corp-competence",
        "description": (
            "Matrix mapping required competencies to roles and tracking training status."
        ),
    },
    {
        "id": "doc:QSE-7.2-TEMP-01",
        "parent_id": "qse/corp-competence",
        "type": "template",
        "document_number": "QSE-7.2-TEMP-01",
        "title": "Employee Induction Presentation Template",
        "path": "/qse/corp-competence",
        "description": (
            "Standard induction program template covering corporate QSE requirements and culture."
        ),
    },
    {
        "id": "qse/corp-communication",
        "parent_id": "qse",
        "type": "page",
        "title": "7.4 Communication",
        "path": "/qse/corp-communication",
        "description": "Framework for internal and external communication processes.",
    },
    {
        "id": "doc:QSE-7.4-PROC-01",
        "parent_id": "qse/corp-communication",
        "type": "procedure",
        "document_number": "QSE-7.4-PROC-01",
        "title": "Procedure for Internal & External Communication",
        "path": "/qse/corp-communication",
        "description": "Processes and protocols for effective internal and external communication.",
    },
    {
        "id": "doc:QSE-7.4-REG-01",
        "parent_id": "qse/corp-communication",
        "type": "register",
        "document_number": "QSE-7.4-REG-01",
        "title": "Communication Matrix",
        "path": "/qse/corp-communication",
        "description": (
            "Matrix defining communication requirements, channels, responsibilities and tracking."
        ),
    },
    {
        "id": "qse/corp-documentation",
        "parent_id": "qse",
        "type": "page",
        "title": "7.5 Documented Information",
        "path": "/qse/corp-documentation",
        "description": (
            "Creation, update, control and retention of documented information across the IMS."
        ),
    },
    {
        "id": "doc:QSE-7.5-PROC-01",
        "parent_id": "qse/corp-documentation",
        "type": "procedure",
        "document_number": "QSE-7.5-PROC-01",
        "title": "Procedure for Control of Documented Information",
        "path": "/qse/corp-documentation",
        "description": (
            "Systematic approach for creating, reviewing, approving, distributing and controlling documents."
        ),
    },
    {
        "id": "doc:QSE-7.5-REG-01",
        "parent_id": "qse/corp-documentation",
        "type": "register",
        "document_number": "QSE-7.5-REG-01",
        "title": "Master Document & Records Register",
        "path": "/qse/corp-documentation",
        "description": (
            "Comprehensive register of controlled documents and records, with status and review tracking."
        ),
    },

    # 8.0 Operation
    {
        "id": "qse/corp-operation",
        "parent_id": "qse",
        "type": "page",
        "title": "8.0 Operation",
        "path": "/qse/corp-operation",
        "description": (
            "Core operational procedures and templates governing project execution and service delivery."
        ),
    },
    {
        "id": "qse/corp-op-procedures-templates",
        "parent_id": "qse",
        "type": "page",
        "title": "8.1 Corporate Operational Procedures & Templates",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Operational procedures and templates supporting planning, execution, control and handover."
        ),
    },
    # Procedures (8.1)
    {
        "id": "doc:QSE-8.1-PROC-01",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-01",
        "title": "Project Management Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Defines phases and controls for planning, executing, monitoring and closing projects within the system."
        ),
    },
    {
        "id": "doc:QSE-8.1-PROC-02",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-02",
        "title": "Incident Reporting & Investigation Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Reporting, investigation and corrective action workflow for incidents and nonconformities."
        ),
    },
    {
        "id": "doc:QSE-8.1-PROC-03",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-03",
        "title": "WHS Management Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Overarching occupational health and safety operational controls and responsibilities."
        ),
    },
    {
        "id": "doc:QSE-8.1-PROC-04",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-04",
        "title": "Environmental Management Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Operational controls for environmental aspects, mitigation measures and monitoring."
        ),
    },
    {
        "id": "doc:QSE-8.1-PROC-05",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-05",
        "title": "Construction & Operational Control Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Work execution controls including lot management, inspections, hold points and verification."
        ),
    },
    {
        "id": "doc:QSE-8.1-PROC-06",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-06",
        "title": "Design & Development Control Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Controls for review and approval of client-supplied designs and temporary works."
        ),
    },
    {
        "id": "doc:QSE-8.1-PROC-07",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "procedure",
        "document_number": "QSE-8.1-PROC-07",
        "title": "Procurement & Supplier Management Procedure",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Supplier prequalification, purchasing controls and supplier performance monitoring."
        ),
    },
    # Templates (8.1)
    {
        "id": "doc:QSE-8.1-TEMP-PQP",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-PQP",
        "title": "Project Quality Plan (PQP) Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template for project-specific quality objectives, responsibilities, ITPs and verification records."
        ),
    },
    {
        "id": "doc:QSE-8.1-TEMP-EMP",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-EMP",
        "title": "Environmental Management Plan (EMP) Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template for environmental aspects, controls, monitoring plans and incident response."
        ),
    },
    {
        "id": "doc:QSE-8.1-TEMP-OHSMP",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-OHSMP",
        "title": "Occupational Health & Safety Management Plan (OHSMP) Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template for OHS risk controls, responsibilities and emergency preparedness."
        ),
    },
    {
        "id": "doc:QSE-8.1-TEMP-TMP",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-TMP",
        "title": "Traffic Management Plan (TMP) Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template for planning temporary traffic arrangements and controls."
        ),
    },
    {
        "id": "doc:QSE-8.1-TEMP-SWMS",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-SWMS",
        "title": "Safe Work Method Statement (SWMS) Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template for task-level hazards, risk controls and verification sign-off."
        ),
    },
    {
        "id": "doc:QSE-8.1-TEMP-ITP",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-ITP",
        "title": "Inspection & Test Plan (ITP) Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template defining inspection and testing checkpoints, hold/witness points and records."
        ),
    },
    {
        "id": "doc:QSE-8.1-TEMP-05",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-05",
        "title": "Quality Inspection / ITP Record Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": "Template for capturing inspection/test results against ITP checkpoints.",
    },
    {
        "id": "doc:QSE-8.1-TEMP-04",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-04",
        "title": "Site Induction & Training Record Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": "Template for recording induction attendance and training completion.",
    },
    {
        "id": "doc:QSE-8.1-TEMP-03",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-03",
        "title": "Pre-start Meeting / Toolbox Talk Record Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": "Template for recording pre-start/toolbox discussions and attendees.",
    },
    {
        "id": "doc:QSE-8.1-TEMP-02",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-02",
        "title": "Risk Assessment / SWMS Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": "Template for structured risk assessment and SWMS content.",
    },
    {
        "id": "doc:QSE-8.1-TEMP-01",
        "parent_id": "qse/corp-op-procedures-templates",
        "type": "template",
        "document_number": "QSE-8.1-TEMP-01",
        "title": "Project Emergency Preparedness & Response Plan Template",
        "path": "/qse/corp-op-procedures-templates",
        "description": (
            "Template for emergency preparedness, response roles and communication protocols."
        ),
    },

    # 9.0 Performance Evaluation
    {
        "id": "qse/corp-performance",
        "parent_id": "qse",
        "type": "page",
        "title": "9.0 Performance Evaluation",
        "path": "/qse/corp-performance",
        "description": (
            "Monitoring, measurement, analysis and evaluation of IMS performance and effectiveness."
        ),
    },
    {
        "id": "qse/corp-monitoring",
        "parent_id": "qse",
        "type": "page",
        "title": "9.1 Monitoring, Measurement, Analysis & Evaluation",
        "path": "/qse/corp-monitoring",
        "description": (
            "Systematic monitoring, measurement and evaluation; includes customer satisfaction measurement."
        ),
    },
    {
        "id": "doc:QSE-9.1-PROC-01",
        "parent_id": "qse/corp-monitoring",
        "type": "procedure",
        "document_number": "QSE-9.1-PROC-01",
        "title": "Procedure for Monitoring, Measurement, and Analysis",
        "path": "/qse/corp-monitoring",
        "description": (
            "Defines methods and systems to monitor, measure and analyze QSE performance to drive improvement."
        ),
    },
    {
        "id": "doc:QSE-9.1-FORM-01",
        "parent_id": "qse/corp-monitoring",
        "type": "form",
        "document_number": "QSE-9.1-FORM-01",
        "title": "Customer Satisfaction Survey Template",
        "path": "/qse/corp-monitoring",
        "description": (
            "Template for measuring customer perceptions, satisfaction levels and feedback."
        ),
    },
    {
        "id": "qse/corp-audit",
        "parent_id": "qse",
        "type": "page",
        "title": "9.2 Internal Audit",
        "path": "/qse/corp-audit",
        "description": (
            "Systematic internal audits to evaluate conformity and effectiveness of the IMS."
        ),
    },
    {
        "id": "doc:QSE-9.2-PROC-01",
        "parent_id": "qse/corp-audit",
        "type": "procedure",
        "document_number": "QSE-9.2-PROC-01",
        "title": "Internal Audit Procedure",
        "path": "/qse/corp-audit",
        "description": (
            "Methodology for planning, conducting, reporting and following up on internal audits."
        ),
    },
    {
        "id": "doc:QSE-9.2-SCHED-01",
        "parent_id": "qse/corp-audit",
        "type": "plan",
        "document_number": "QSE-9.2-SCHED-01",
        "title": "Annual Internal Audit Schedule",
        "path": "/qse/corp-audit",
        "description": (
            "Annual schedule of internal audits prioritized by risk and process importance."
        ),
    },
    {
        "id": "qse/corp-review",
        "parent_id": "qse",
        "type": "page",
        "title": "9.3 Management Review",
        "path": "/qse/corp-review",
        "description": (
            "Periodic management reviews to evaluate the IMS suitability, adequacy and effectiveness."
        ),
    },
    {
        "id": "doc:QSE-9.3-PROC-01",
        "parent_id": "qse/corp-review",
        "type": "procedure",
        "document_number": "QSE-9.3-PROC-01",
        "title": "Procedure for Management Review",
        "path": "/qse/corp-review",
        "description": (
            "Process for conducting management reviews including inputs, outputs and actions for improvement."
        ),
    },
    {
        "id": "doc:QSE-9.3-MIN-TEMPLATE",
        "parent_id": "qse/corp-review",
        "type": "form",
        "document_number": "QSE-9.3-MIN-TEMPLATE",
        "title": "Management Review Meeting Minutes Template",
        "path": "/qse/corp-review",
        "description": (
            "Template for recording review attendees, inputs, decisions and assigned actions."
        ),
    },

    # 10.0 Improvement
    {
        "id": "qse/corp-improvement",
        "parent_id": "qse",
        "type": "page",
        "title": "10.0 Improvement",
        "path": "/qse/corp-improvement",
        "description": (
            "Framework for identifying, implementing and sustaining improvements across the IMS."
        ),
    },
    {
        "id": "qse/corp-continual-improvement",
        "parent_id": "qse",
        "type": "page",
        "title": "10.3 Continual Improvement",
        "path": "/qse/corp-continual-improvement",
        "description": (
            "Processes and registers for continual improvement opportunities and tracking."
        ),
    },
    {
        "id": "doc:QSE-10.3-PROC-01",
        "parent_id": "qse/corp-continual-improvement",
        "type": "procedure",
        "document_number": "QSE-10.3-PROC-01",
        "title": "Procedure for Continual Improvement",
        "path": "/qse/corp-continual-improvement",
        "description": (
            "Overall approach to continually improve the suitability, adequacy and effectiveness of the IMS."
        ),
    },
    {
        "id": "doc:QSE-10.3-REG-01",
        "parent_id": "qse/corp-continual-improvement",
        "type": "register",
        "document_number": "QSE-10.3-REG-01",
        "title": "Continual Improvement Opportunities Register",
        "path": "/qse/corp-continual-improvement",
        "description": (
            "Live register capturing improvement opportunities from audits, reviews, suggestions and lessons learned."
        ),
    },

    # 10.2 Nonconformity & Corrective Action
    {
        "id": "qse/corp-ncr",
        "parent_id": "qse",
        "type": "page",
        "title": "10.2 Nonconformity & Corrective Action",
        "path": "/qse/corp-ncr",
        "description": (
            "Systematic handling of nonconformities and incidents with corrective and preventative actions."
        ),
    },
    {
        "id": "doc:QSE-10.2-PROC-01",
        "parent_id": "qse/corp-ncr",
        "type": "procedure",
        "document_number": "QSE-10.2-PROC-01",
        "title": "Procedure for Nonconformity, Incident & Corrective Action",
        "path": "/qse/corp-ncr",
        "description": (
            "Integrated procedure for identifying, reporting, investigating and correcting nonconformities and incidents."
        ),
    },
    {
        "id": "doc:QSE-10.2-REG-01",
        "parent_id": "qse/corp-ncr",
        "type": "register",
        "document_number": "QSE-10.2-REG-01",
        "title": "NCR and Corrective Action Register",
        "path": "/qse/corp-ncr",
        "description": (
            "Organization-wide register tracking nonconformities, corrective actions and closure verification."
        ),
    },

    # 4.0 Context of the Organization
    {
        "id": "qse/corp-context",
        "parent_id": "qse",
        "type": "page",
        "title": "4.0 Context of the Organization",
        "path": "/qse/corp-context",
        "description": (
            "Determination of organizational context, internal/external issues and interested parties."
        ),
    },
    {
        "id": "doc:QSE-4.1-PROC-01",
        "parent_id": "qse/corp-context",
        "type": "procedure",
        "document_number": "QSE-4.1-PROC-01",
        "title": "Procedure for Determining Context and Interested Parties",
        "path": "/qse/corp-context",
        "description": (
            "Process framework for identifying, monitoring and reviewing issues and stakeholder expectations."
        ),
    },
    {
        "id": "doc:QSE-4.1-REG-01",
        "parent_id": "qse/corp-context",
        "type": "register",
        "document_number": "QSE-4.1-REG-01",
        "title": "Register of Internal & External Issues",
        "path": "/qse/corp-context",
        "description": "Live register documenting strategic issues relevant to QSE performance.",
    },
    {
        "id": "doc:QSE-4.2-REG-01",
        "parent_id": "qse/corp-context",
        "type": "register",
        "document_number": "QSE-4.2-REG-01",
        "title": "Register of Interested Parties & Requirements",
        "path": "/qse/corp-context",
        "description": "Register of stakeholders, their needs/expectations and engagement approach.",
    },
]


def index_nodes_by_id(nodes):
    """Build a convenience index dict[id] -> node."""
    return {n["id"]: n for n in nodes}


QSE_SYSTEM_INDEX_BY_ID = index_nodes_by_id(QSE_SYSTEM_NODES)

# Export the narrative summary (module docstring) for LLM grounding
QSE_SYSTEM_SUMMARY = (__doc__ or "").strip()


