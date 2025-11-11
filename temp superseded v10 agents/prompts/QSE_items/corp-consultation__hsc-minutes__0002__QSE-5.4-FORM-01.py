# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-5.4-FORM-01'
TITLE = 'Health & Safety Committee Meeting Minutes Template'

HTML = '''<h1>Health &amp; Safety Committee Meeting Minutes</h1>
<p><strong>Meeting Date:</strong> [Meeting Date] | <strong>Location:</strong> [Location]</p>
<p><strong>Attendees:</strong> [Attendees] | <strong>Apologies:</strong> [Apologies] | <strong>Secretariat:</strong> [Secretariat]</p>
<h2>1. Welcome &amp; Opening Remarks</h2>
<p>[Opening remarks, key safety messages, acknowledgement of previous actions]</p>
<h2>2. Review of Previous Minutes &amp; Actions</h2>
<p>[Confirmation of previous minutes and summary of outcomes]</p>
<ul>
  <li>[Status updates on outstanding actions sourced from QSE-10.3-REG-01 and project action logs]</li>
</ul>
<h2>3. QSE Performance Review</h2>
<p>Dashboard extracts from <code>/dashboard</code> and project analytics should be referenced here.</p>
<ul>
  <li><strong>Lead Indicators:</strong> [Enter lead indicator data]</li>
  <li><strong>Lag Indicators:</strong> [Enter lag indicator data]</li>
  <li><strong>Environmental:</strong> [Enter environmental compliance data]</li>
</ul>
<h2>4. HSR Reports &amp; Issues Raised</h2>
<p>[Summaries of Health &amp; Safety Representative reports, issues logged via incident register, and outcomes]</p>
<h2>5. New Business</h2>
<p>[Discussion items including planned major works, changes to procedures, or legislative updates]</p>
<h2>6. Actions Arising</h2>
<p>All actions must be entered into the Continual Improvement Register (QSE-10.3-REG-01) with linked tasks. Where actions relate to inspections or lot hold points, create or update corresponding entries in `/app/projects/[projectId]/inspections` or `/app/projects/[projectId]/quality/itp-register`.</p>
<table>
  <thead>
    <tr>
      <th>Action ID</th>
      <th>Action Item</th>
      <th>Responsible</th>
      <th>Due Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Action ID]</td>
      <td>[Description and required system updates]</td>
      <td>[Responsible person or role]</td>
      <td>[Due date]</td>
    </tr>
  </tbody>
</table>
<h2>7. Next Meeting</h2>
<p>[Date, time, and location for next HSC meeting. Minutes to be published to `/app/projects/[projectId]/inbox` and `/qse/corp-consultation` within 48 hours.]</p>
'''
