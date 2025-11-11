# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-6.1-PROC-01'
TITLE = 'Procedure for Risk & Opportunity Management'

HTML = '''<h1>Procedure for Risk &amp; Opportunity Management</h1>
<p>This procedure sets out how [Company Name] applies ISO 31000 principles to identify, assess, and treat risks and opportunities within the Integrated Management System.</p>
<h2>1. Purpose</h2>
<p>Provide a disciplined, data-driven approach for managing risks and opportunities that could impact QSE objectives, project delivery, or stakeholder commitments.</p>
<h2>2. Scope</h2>
<p>Applies to corporate strategy, portfolio planning, and project execution handled through `/qse/corp-risk-management`, the dashboard, and project workspaces.</p>
<h2>3. Process</h2>
<ol>
  <li><strong>Identification:</strong> Gather inputs from context reviews, compliance obligations, incident investigations, lessons learned, and analytics surfaced in `/dashboard` and `/app/projects/[projectId]/overview`.</li>
  <li><strong>Analysis &amp; Evaluation:</strong> Rate likelihood and consequence using the corporate 5x5 matrix; flag critical scenarios for executive review. AI-assisted WBS analyses automatically propose risk candidates for validation.</li>
  <li><strong>Treatment:</strong> Define controls following the hierarchy (elimination to PPE). For opportunities, specify enablers, benefits, and owners. Link treatments to action assets so progress is tracked in QSE-10.3-REG-01.</li>
  <li><strong>Documentation:</strong> Record approved entries in QSE-6.1-REG-01 (Risk Register) or QSE-6.1-REG-02 (Opportunity Register). Project-specific items map to lots, ITP checkpoints, or procurement workflows.</li>
  <li><strong>Monitoring &amp; Review:</strong> Review status quarterly at management review and dynamically via register dashboards. Update residual ratings and close actions in coordination with NCR and audit findings.</li>
</ol>
<h2>4. Roles</h2>
<ul>
  <li><strong>Executive Leadership:</strong> Own strategic risks, approve treatment budgets, and monitor heatmaps.</li>
  <li><strong>Project Managers:</strong> Maintain project risk registers, integrate treatments into schedules, and escalate high residual risks.</li>
  <li><strong>Discipline Leads &amp; Engineers:</strong> Validate controls in the field, ensure SWMS and inspection plans reflect agreed treatments.</li>
  <li><strong>QSE Team:</strong> Facilitate workshops, administer registers, and ensure alignment with compliance and audit programs.</li>
</ul>
<h2>5. Risk Matrix</h2>
<p>The corporate matrix assigns risk levels based on five likelihood and five consequence bands. Embed current matrix graphic or describe thresholds here (e.g., Extreme requires executive approval before work proceeds).</p>
<h2>6. Records &amp; Linkages</h2>
<ul>
  <li>QSE-6.1-REG-01 and QSE-6.1-REG-02 hold controlled records with version history.</li>
  <li>Associated actions are captured as assets with OUTPUT_OF edges to processing runs when AI assistance was used.</li>
  <li>Audit trails link risks to incidents (QSE-10.2) and inspections (IR register) for traceability.</li>
</ul>
'''
