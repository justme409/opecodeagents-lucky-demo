# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-6.1-REG-01'
TITLE = 'Corporate Risk Register'

HTML = '''<h1>Corporate Risk Register</h1>
<p>Controlled register for significant strategic and operational risks. Maintained in `/qse/corp-risk-management` with analytics surfaced in `/dashboard`.</p>
<table>
  <thead>
    <tr>
      <th>Risk ID</th>
      <th>Description</th>
      <th>Consequence</th>
      <th>Likelihood</th>
      <th>Risk Level</th>
      <th>Treatment / Controls</th>
      <th>Owner</th>
      <th>Linked Assets</th>
      <th>Status</th>
      <th>Review Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Risk ID]</td>
      <td>[Narrative aligned to context/asset edge references]</td>
      <td>[Consequence rating]</td>
      <td>[Likelihood rating]</td>
      <td>[Risk level]</td>
      <td>[Treatment plan referencing actions, SWMS, or procurement controls]</td>
      <td>[Assigned role/person]</td>
      <td>[Links to projects, WBS nodes, or lots]</td>
      <td>[Open / Monitoring / Closed]</td>
      <td>[Next review date]</td>
    </tr>
  </tbody>
</table>
<p>All entries must have corresponding actions recorded in QSE-10.3-REG-01 and, where applicable, linked to NCRs or Inspection Requests. Updates should capture idempotency keys for integration with downstream analytics.</p>
'''
