# QSE Document Prompt Review Log

## QSE-5.2-POL-01 — QSE Policy Statement
- Suggested improvements: Strip React UI wrappers, reference master register `/qse/corp-documentation` and publication path `/qse/corp-policy-roles`, reinforce annual review requirement, and keep placeholders for `[Company Name]`, `[CEO Name]`, `[Effective Date]`.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-policy-roles__qse-policy__0001__QSE-5.2-POL-01.py`
- Changes applied: Replaced JSX container with clean HTML body (h1/h2/p/ul), added note on availability in the QSE portal, tied commitments to QSE modules, retained placeholder fields for organization tailoring.

## QSE-5.3-REG-01 — Roles, Responsibilities & Authorities Matrix
- Suggested improvements: Remove React wrappers, align role responsibilities with system modules (lot register, NCR register, approvals), include placeholders for role names mapped to user assets, describe matrix governance within `/qse/corp-policy-roles`, and reference auto-sync with HR data if available.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-policy-roles__roles-matrix__0002__QSE-5.3-REG-01.py`
- Changes applied: Rebuilt table in plain HTML, annotated responsibilities with links to app modules, highlighted RACI alignment and the approvals workflow storing data in assets edges.

## QSE-5.4-FORM-01 — Health & Safety Committee Meeting Minutes Template
- Suggested improvements: Convert to plain HTML, ensure sections reference `/app/projects/[projectId]/inbox` and `/qse/corp-consultation` for distribution, direct action tracking to QSE-10.3-REG-01 and `/app/projects/[projectId]/quality/itp-register` for hold point follow-up, keep placeholders for meeting metadata.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-consultation__hsc-minutes__0002__QSE-5.4-FORM-01.py`
- Changes applied: Template now outputs clean HTML, includes guidance for logging actions in Continual Improvement register and linking to inspection requests when needed, clarified workflow notes for publishing minutes.

## QSE-5.4-PROC-01 — Procedure for Consultation & Participation
- Suggested improvements: Clarify system touchpoints (incident workflow, SWMS authoring, `/app/projects/[projectId]/field/toolbox-talks`), emphasize linkage to worker participation edges in the assets graph, and ensure record section references storage in `/app/projects/[projectId]/inbox` and `asset_edges` CONTEXT_FOR relationships.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-consultation__consult-procedure__0001__QSE-5.4-PROC-01.py`
- Changes applied: Streamlined to pure HTML, added explicit cross-references to hazard reporting, SWMS collaboration, and documentation control flow, reinforced ISO 45001 consultation obligations.

## QSE-6.1-PROC-01 — Procedure for Risk & Opportunity Management
- Suggested improvements: Reference `/dashboard` analytics, WBS AI agent, and registers QSE-6.1-REG-01/02; ensure treatment actions link to QSE-10.3-REG-01 and inspection workflows; remove JSX wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-risk-management__risk-procedure__0001__QSE-6.1-PROC-01.py`
- Changes applied: Plain HTML body with sections for process, roles, and records, tied to assets/edges (OUTPUT_OF, CONTEXT_FOR) and residual risk reviews.

## QSE-6.1-REG-01 — Corporate Risk Register
- Suggested improvements: Ensure table fields align with assets schema (status, review date, linked assets), reference `/dashboard` and lot/WBS linkages, remove React UI wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-risk-management__risk-register__0002__QSE-6.1-REG-01.py`
- Changes applied: Plain HTML table with placeholders for status/review, explicit guidance to link treatments to actions and inspection/NCR workflows.

## QSE-6.1-PROC-02 — Procedure for Identifying Compliance Obligations
- Suggested improvements: Explicitly align with ISO 9001/14001/45001, reference Compliance Obligations Register and QSE-10.3-REG-01 action tracking, remove React wrappers, clarify change management workflow.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-legal__legal-procedure__0001__QSE-6.1-PROC-02.py`
- Changes applied: Added sections for identification, evaluation, change management, and traceability with links to app modules and asset edges.

## QSE-6.1-REG-03 — Compliance Obligations Register
- Suggested improvements: Align table columns with asset metadata (status, review, linked assets), include change notification template, tie updates to QSE-10.3-REG-01, remove JSX wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-legal__legal-register__0002__QSE-6.1-REG-03.py`
- Changes applied: Clean HTML table plus change notification template; guidance for linking actions and projects.

## QSE-6.1-REG-02 — Corporate Opportunity Register
- Suggested improvements: Update table to include target date and linked assets, ensure workflow integration with QSE-10.3-REG-01 and management review, remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-risk-management__opportunity-register__0003__QSE-6.1-REG-02.py`
- Changes applied: Clean HTML table and guidance on linking opportunities to actions, projects, and dashboards.

## QSE-6.2-PROC-01 — Procedure for Setting QSE Objectives
- Suggested improvements: Align with ISO 9001/14001/45001 objective cycle, reflect data sources (`/dashboard`, lot/NCR modules), connect to QSE-6.2-PLAN-01 and QSE-10.3-REG-01, remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-objectives__objectives-procedure__0001__QSE-6.2-PROC-01.py`
- Changes applied: Structured plain HTML covering lifecycle, cascading, monitoring, communication, and records with explicit module references.

## QSE-6.2-PLN-01 — Annual QSE Objectives & Targets Plan
- Suggested improvements: Plain HTML table, reference `/dashboard` feeds, include review template tied to QSE-10.3-REG-01, remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-objectives__objectives-plan__0002__QSE-6.2-PLN-01.py`
- Changes applied: Clean plan table with measurement fields and review section mapping to improvement register.

## QSE-7.2-PROC-01 — Procedure for Training, Competence & Awareness
- Suggested improvements: Reframe around ISO 9001/14001/45001 clauses, tie to QSE-7.2-REG-01, QSE-10.3-REG-01, `/dashboard`, and induction/attendance workflows; remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-competence__competence-procedure__0001__QSE-7.2-PROC-01.py`
- Changes applied: Plain HTML with sections for responsibilities, lifecycle, awareness, and record integrations referencing actual system modules.

## QSE-7.2-REG-01 — Training Needs Analysis & Competency Matrix
- Suggested improvements: Plain HTML tables for roles, training plan, and gap analysis; include linkage to QSE-10.3-REG-01 and dashboard reporting; remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-competence__training-matrix__0002__QSE-7.2-REG-01.py`
- Changes applied: Clean matrix template with explicit fields for qualifications, training, budgets, and gap actions referencing system modules.

## QSE-7.4-PROC-01 — Procedure for Internal & External Communication
- Suggested improvements: Clean HTML structure, reference Communication Matrix (QSE-7.4-REG-01), emergency workflows, `/dashboard` integrations, and QSE-10.3-REG-01 tracking; remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-communication__communication-procedure__0001__QSE-7.4-PROC-01.py`
- Changes applied: Plain HTML covering responsibilities, channels, emergency response, digital integration, and effectiveness review tied to app modules.

## QSE-7.4-REG-01 — Communication Matrix
- Suggested improvements: Replace JSX table structures with plain HTML, include fields for KPIs and tracking IDs, tie to `/dashboard` and QSE-10.3-REG-01.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-communication__communication-matrix__0002__QSE-7.4-REG-01.py`
- Changes applied: Internal/external matrices and effectiveness template now reflect system integrations and improvement tracking in clean HTML.

## QSE-7.5-PROC-01 — Procedure for Control of Documented Information
- Suggested improvements: Convert to plain HTML, ensure lifecycle steps reference QSE-7.5-REG-01, change workflow, dashboard metrics, and improvement logging; remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-documentation__documentation-procedure__0001__QSE-7.5-PROC-01.py`
- Changes applied: Restructured into sections for creation, review, access, revision, and records integration referencing system automation and registers.

## QSE-7.5-REG-01 — Master Document & Records Register
- Suggested improvements: Plain HTML for document and record tables with lifecycle metadata, include analytics template linked to dashboard and improvement register, remove React wrappers.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-documentation__master-register__0002__QSE-7.5-REG-01.py`
- Changes applied: Tables now align with asset schema (status, access level, retention) and include analytics rows referencing QSE-10.3-REG-01.

## QSE-8.1-PROC-01 — Project Management Procedure
- Suggested improvements: Remove JSX, align lifecycle phases with `/app/projects/[projectId]` dashboard, risk/change workflows, and handover exports; reference Austroads alignment.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__proj-mgmt__0001__QSE-8.1-PROC-01.py`
- Changes applied: Clean HTML covering purpose, lifecycle phases, and key management processes tied to system modules and registers.

## QSE-8.1-PROC-02 — Incident Reporting & Investigation Procedure
- Suggested improvements: Expand beyond initial stub, cover reporting workflow, investigation levels, corrective action tracking (QSE-10.3-REG-01), dashboards, and data privacy; remove JSX.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__incident-report__0012__QSE-8.1-PROC-02.py`
- Changes applied: Detailed plain HTML sections for reporting, investigation, CAPA, lessons learned, and system integrations.

## QSE-8.1-PROC-03 — WHS Management Procedure
- Suggested improvements: Expand beyond brief outline to cover risk controls, consultation, training, incident response, compliance monitoring, and records; remove JSX.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__whs-mgmt__0014__QSE-8.1-PROC-03.py`
- Changes applied: Detailed plain HTML sections for WHS risk management, consultation, training, incidents, compliance, and integration with system modules.

## QSE-8.1-PROC-04 — Environmental Management Procedure
- Suggested improvements: Extend beyond brief bullets, include aspects/impacts management, compliance monitoring, spill response, stakeholder engagement, and system linkages; remove JSX.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__environmental-mgmt__0015__QSE-8.1-PROC-04.py`
- Changes applied: Detailed plain HTML sections for aspects, key management areas, compliance/monitoring, communication, and records integration.

## QSE-8.1-PROC-05 — Construction & Operational Control Procedure
- Suggested improvements: Expand SWMS/ITP guidance, include permits, execution controls, monitoring, change management, and record integration; remove JSX.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__construction-control__0016__QSE-8.1-PROC-05.py`
- Changes applied: Comprehensive plain HTML covering risk-based planning, execution, verification, change control, and records linked to system modules.

## QSE-8.1-PROC-06 — Design & Development Control Procedure
- Suggested improvements: Remove JSX, expand to include review, verification, temporary works controls, change management, and records integration; align with Safety in Design requirements.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__design-control__0017__QSE-8.1-PROC-06.py`
- Changes applied: Plain HTML covering client design review, verification, in-house temporary works, change control, and record linkage to system modules.

## QSE-8.1-PROC-07 — Procurement & Supplier Management Procedure
- Suggested improvements: Expand prequalification, tendering, onboarding, monitoring, and integration steps; remove JSX; tie records to dashboards and approvals.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__procurement__0018__QSE-8.1-PROC-07.py`
- Changes applied: Plain HTML sections covering supplier vetting, contract award, mobilisation, performance reviews, and system recordkeeping.

## QSE-8.1-TEMP-PQP — Project Quality Plan Template
- Suggested improvements: Replace JSX utilities, ensure sections/tables align with PMP workflow, include lot, ITP, risk, handover, and KPI integrations.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__pqp-template__0002__QSE-8.1-TEMP-PQP.py`
- Changes applied: Clean HTML template with structured tables and guidance referencing system modules and exports.

## QSE-8.1-TEMP-EMP — Environmental Management Plan Template
- Suggested improvements: Produce clean HTML template with sections for project info, aspects, controls, monitoring, incident response, training, and review.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__environmental-management-plan__QSE-8.1-TEMP-EMP.py`
- Changes applied: Added structured tables for aspects/controls and sections covering monitoring, incident response, communication, and close-out.

## QSE-8.1-TEMP-ITP — Inspection & Test Plan Template
- Suggested improvements: Provide plain HTML template with project info, references, schedule table, hold points, records, NCR handling, revision history.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__inspection-test-plan__QSE-8.1-TEMP-ITP.py`
- Changes applied: Added structured tables and sections covering notifications, verification, non-conformance, and revisions.

## QSE-8.1-TEMP-01 — Project Emergency Preparedness & Response Plan Template
- Suggested improvements: Provide full template covering project info, contacts, scenarios, equipment, training, communications, review.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__project-emergency-preparedness-plan__QSE-8.1-TEMP-01.py`
- Changes applied: Clean HTML with structured tables for contacts and scenarios plus sections for resources, drills, communications, and review.

## QSE-8.1-TEMP-03 — Pre-start Meeting / Toolbox Talk Record Template
- Suggested improvements: Create clean HTML template capturing meeting details, attendance, hazards, actions, and notes.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__pre-start-toolbox-record__QSE-8.1-TEMP-03.py`
- Changes applied: Added structured sections for meeting metadata, attendance table, topics, hazard controls, and follow-up actions.

## QSE-8.1-TEMP-04 — Site Induction & Training Record Template
- Suggested improvements: Provide clean HTML template covering induction details, attendees, modules, PPE, notes, and verification.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__site-induction-training-record__QSE-8.1-TEMP-04.py`
- Changes applied: Added structured tables for attendee info and modules plus sections for PPE, actions, and sign-off.

## QSE-8.1-TEMP-SWMS — Safe Work Method Statement Template
- Suggested improvements: Provide full SWMS template with work details, consultation, PPE, equipment, hazard/control table, emergency, training, sign-off, revisions.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__swms-template__QSE-8.1-TEMP-SWMS.py`
- Changes applied: Added clean HTML structure with required sections and tables for high-risk work documentation.

## QSE-8.1-TEMP-TMP — Traffic Management Plan Template
- Suggested improvements: Provide structured template covering project details, controls, communication, risks, monitoring, emergency, appendices.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-op-procedures-templates__traffic-management-plan__QSE-8.1-TEMP-TMP.py`
- Changes applied: Added clean HTML with tables and sections for traffic measures, stakeholders, controllers, risk assessment, review, and appendices.

## QSE-7.2-TEMP-01 — Employee Induction Presentation Template
- Suggested improvements: Produce plain HTML outline covering QSE policy, roles, WHS, environmental, quality, systems, emergency, competency, feedback.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-competence__employee-induction-template__0001__QSE-7.2-TEMP-01.py`
- Changes applied: Added structured sections to guide induction delivery without JSX utilities.

## QSE-4.3-STMT-01 — IMS Scope Statement
- Suggested improvements: Remove JSX, simplify to plain HTML, include scope boundaries, standards, exclusions, review checklist.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corporate-tier-1__ims-scope__0002__QSE-4.3-STMT-01.py`
- Changes applied: Rewrote document to clean HTML headings, lists, and tables covering scope, boundaries, standards, exclusions, and review checklist.

## QSE-1-MAN-01 — Integrated Management System Manual
- Suggested improvements: Replace JSX, condense structure while retaining key sections, align with PDCA and knowledge graph modules.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corporate-tier-1__ims-manual__0001__QSE-1-MAN-01.py`
- Changes applied: Rewrote manual in plain HTML with sections for intro, references, definitions, leadership, planning, support, operation, performance, improvement, PDCA mapping.

## QSE-CORP-LEADERSHIP-0001 — Leadership Overview
- Suggested improvements: Replace JSX with simple HTML summary referencing dashboard and linked documents.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-leadership__overview__0001.py`
- Changes applied: Condensed to clean HTML highlighting leadership commitments and related documentation.

## QSE-CORP-PLANNING-0001 — Planning Overview
- Suggested improvements: Replace JSX with concise HTML summary referencing risk/opportunity tracking and supporting docs.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-planning__overview__0001.py`
- Changes applied: Simplified to clean HTML text highlighting proactive planning, dashboards, and linked procedures.

## QSE-CORP-SUPPORT-0001 — Support Overview
- Suggested improvements: Remove JSX layout components, provide concise HTML summary referencing dashboards and subsections.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-support__overview__0001.py`
- Changes applied: Reduced to clean text highlighting support elements, monitoring, and related documentation.

## QSE-CORP-OPERATION-0001 — Operation Overview
- Suggested improvements: Remove JSX container, provide plain HTML summary referencing operational controls and dashboard metrics.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-operation__overview__0001.py`
- Changes applied: Condensed to clean text describing operational templates, PMPs, and dashboard tracking.

## QSE-CORP-PERFORMANCE-0001 — Performance Evaluation Overview
- Suggested improvements: Replace JSX layout with concise HTML summary referencing dashboards and evaluation processes.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-performance__overview__0001.py`
- Changes applied: Simplified to clean text highlighting monitoring, analytics, and links to detailed procedures.

## QSE-CORP-IMPROVEMENT-0001 — Improvement Overview
- Suggested improvements: Replace JSX with concise HTML summary referencing continual improvement register and procedures.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-improvement__overview__0001.py`
- Changes applied: Simplified overview text highlighting tracking mechanisms and linked documents.

## QSE-4.1-PROC-01 — Procedure for Determining Context and Interested Parties
- Suggested improvements: Replace JSX-heavy markup with plain HTML, maintain responsibilities, steps, and record references.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-context__context-procedure__0001__QSE-4.1-PROC-01.py`
- Changes applied: Structured sections for purpose, scope, responsibilities, context analysis, stakeholder mapping, monitoring, and records using simple HTML elements.

## QSE-4.1-REG-01 — Register of Internal & External Issues
- Suggested improvements: Convert to plain HTML tables, include review/update guidance.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-context__issues-register__0002__QSE-4.1-REG-01.py`
- Changes applied: Defined internal/external issue tables with standard columns and added review/update notes.

## QSE-4.2-REG-01 — Register of Interested Parties & Requirements
- Suggested improvements: Replace JSX with clean table layout and review guidance.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-context__stakeholders-register__0003__QSE-4.2-REG-01.py`
- Changes applied: Added stakeholder table and review/update section in plain HTML.

## QSE-9.2-PROC-01 — Internal Audit Procedure
- Suggested improvements: Remove JSX container logic; keep audit planning/execution/follow-up content in plain HTML with module references.
- Prompt module: `services/langgraph_v10/src/agent/prompts/QSE_items/corp-audit__audit-procedure__0001__QSE-9.2-PROC-01.py`
- Changes applied: Structured sections for purpose, programme, process, and competency using simple markup and highlighting system integrations.
