# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-8.1-TEMP-PQP'
TITLE = 'Project Quality Plan (PQP) Template'

HTML = '''<h1>Project Quality Plan (PQP) Template</h1>
<p>Use this template to build the project-specific quality plan that feeds the PMP and downstream registers.</p>
<h2>1.0 Project Information</h2>
<table>
  <tbody>
    <tr><td>Project Name:</td><td>[Enter Project Name]</td></tr>
    <tr><td>Client:</td><td>[Enter Client Name]</td></tr>
    <tr><td>Contract Value:</td><td>[Enter Value]</td></tr>
    <tr><td>Project Manager:</td><td>[Enter PM Name]</td></tr>
    <tr><td>QA/QC Manager:</td><td>[Enter QA Manager]</td></tr>
  </tbody>
</table>
<h2>2.0 Quality Policy &amp; Objectives</h2>
<p><strong>Quality Policy Statement:</strong> Reference corporate QSE Policy (QSE-5.2-POL-01).</p>
<p><strong>Project-Specific Quality Objectives:</strong></p>
<table>
  <thead>
    <tr>
      <th>Quality Objective</th>
      <th>Target</th>
      <th>Measurement Method</th>
      <th>Responsible</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Objective]</td>
      <td>[Target]</td>
      <td>[Measurement]</td>
      <td>[Responsible Party]</td>
    </tr>
  </tbody>
</table>
<h2>3.0 Lot Management</h2>
<p>Lots managed in <code>/projects/[projectId]/lots</code> with:</p>
<ul>
  <li>Lot register containing unique identifiers.</li>
  <li>ITP assignment for each lot.</li>
  <li>Real-time progress tracking and completion records.</li>
  <li>NCR linkage for traceability.</li>
</ul>
<h2>4.0 Inspection &amp; Test Plans (ITPs)</h2>
<ul>
  <li>ITPs generated via AI agent based on specs and standards.</li>
  <li>Executed digitally with real-time data entry.</li>
  <li>Automatic notifications for hold/witness points.</li>
  <li>Records stored in <code>/projects/[projectId]/itp-templates</code>.</li>
</ul>
<h2>5.0 Quality Risks &amp; Mitigation</h2>
<table>
  <thead>
    <tr>
      <th>Quality Risk</th>
      <th>Impact</th>
      <th>Likelihood</th>
      <th>Mitigation Measures</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Risk description]</td>
      <td>[High/Medium/Low]</td>
      <td>[High/Medium/Low]</td>
      <td>[Mitigation]</td>
    </tr>
  </tbody>
</table>
<h2>6.0 Handover Records</h2>
<p>Compile the following via export tools:</p>
<ul>
  <li>Completed ITP register with results and certifications.</li>
  <li>As-built documentation from document register.</li>
  <li>NCR register including closure evidence.</li>
  <li>Material certificates and compliance documentation.</li>
  <li>Final quality audit report.</li>
</ul>
<h2>7.0 Quality KPIs</h2>
<table>
  <thead>
    <tr>
      <th>KPI</th>
      <th>Target</th>
      <th>Current Performance</th>
      <th>Trend</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ITP First-Pass Rate</td>
      <td>[Target %]</td>
      <td>[Auto-populated]</td>
      <td>[Trend analysis]</td>
    </tr>
    <tr>
      <td>NCR Closure Rate</td>
      <td>[Target days]</td>
      <td>[Auto-populated]</td>
      <td>[Trend analysis]</td>
    </tr>
  </tbody>
</table>
'''
