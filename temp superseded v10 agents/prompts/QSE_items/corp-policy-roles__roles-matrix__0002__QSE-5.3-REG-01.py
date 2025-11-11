# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-5.3-REG-01'
TITLE = 'Roles, Responsibilities & Authorities Matrix'

HTML = '''<section id="roles-matrix" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-green-100 text-gray-900 p-6 cursor-pointer hover:bg-green-200 transition-colors"
              onClick={() => toggleDoc('roles-matrix')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Roles, Responsibilities & Authorities Matrix</h2>
                  <p className="text-gray-700">A detailed matrix defining QSE responsibilities for key roles within the organization.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['roles-matrix'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['roles-matrix'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-5.3-REG-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> A</div>
                <div className="border p-3"><span className="font-semibold">Last Updated:</span> 24/07/2024</div>
              </div>

              <h3 className="mt-8 mb-4">QSE Roles, Responsibilities, and Authorities</h3>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border p-2 text-left w-1/4">Role</th>
                      <th className="border p-2 text-left w-1/2">Key QSE Responsibilities</th>
                      <th className="border p-2 text-left w-1/4">Key Authorities</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2 font-semibold">Chief Executive Officer (CEO)</td>
                      <td className="border p-2">
                        <ul>
                          <li>Ensuring the QSE Policy and Objectives are established and compatible with the strategic direction.</li>
                          <li>Taking ultimate accountability for the effectiveness of the IMS.</li>
                          <li>Ensuring necessary resources are available.</li>
                          <li>Chairing Management Review meetings.</li>
                        </ul>
                      </td>
                      <td className="border p-2">
                        <ul>
                          <li>Approve QSE Policy.</li>
                          <li>Stop any operation on QSE grounds.</li>
                          <li>Allocate corporate budget for QSE initiatives.</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-semibold">Operations Manager</td>
                      <td className="border p-2">
                        <ul>
                          <li>Ensuring all projects are resourced to meet QSE requirements.</li>
                          <li>Driving consistent implementation of IMS procedures across all sites.</li>
                          <li>Monitoring project QSE performance against targets.</li>
                        </ul>
                      </td>
                      <td className="border p-2">
                        <ul>
                          <li>Approve Project Management Plans.</li>
                          <li>Authorize resource allocation to projects.</li>
                          <li>Initiate investigation into major incidents.</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-semibold">QSE Manager</td>
                      <td className="border p-2">
                        <ul>
                          <li>Maintaining and improving the IMS in accordance with ISO standards.</li>
                          <li>Reporting on IMS performance to the CEO.</li>
                          <li>Coordinating the internal audit program.</li>
                          <li>Providing expert QSE advice and support.</li>
                          <li>Administering the corporate-level QSE modules (/qse) and ensuring system templates remain compliant.</li>
                        </ul>
                      </td>
                      <td className="border p-2">
                        <ul>
                          <li>Issue and control IMS documentation.</li>
                          <li>Stop work on grounds of imminent danger or serious environmental breach.</li>
                          <li>Liaise with external auditors and regulators.</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-semibold">Project Manager</td>
                      <td className="border p-2">
                        <ul>
                          <li>Overall responsibility for QSE performance on their project.</li>
                          <li>Developing and implementing the Project QSE Management Plan.</li>
                          <li>Ensuring all site personnel comply with IMS requirements.</li>
                          <li>Managing project-specific risks, incidents, and emergencies.</li>
                          <li>Maintaining the project's Lot Register, NCR Register, and Document Register within the system.</li>
                        </ul>
                      </td>
                      <td className="border p-2">
                        <ul>
                          <li>Stop any unsafe work on their site.</li>
                          <li>Approve site-specific risk assessments (e.g., SWMS).</li>
                          <li>Manage project QSE budget.</li>
                        </ul>
                      </td>
                    </tr>
                     <tr>
                      <td className="border p-2 font-semibold">Site Engineer / Supervisor</td>
                      <td className="border p-2">
                        <ul>
                          <li>Conducting daily pre-start meetings and site inspections.</li>
                          <li>Ensuring works are carried out according to the approved method statements and ITPs.</li>
                          <li>Supervising workers and correcting unsafe behaviors.</li>
                          <li>Reporting all incidents and hazards immediately.</li>
                          <li>Conducting and recording daily pre-starts and ITPs using the system's forms and workflows.</li>
                        </ul>
                      </td>
                      <td className="border p-2">
                        <ul>
                          <li>Stop a specific task if it is unsafe.</li>
                          <li>Issue instructions to workers and subcontractors on QSE matters.</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-semibold">All Workers and Subcontractors</td>
                      <td className="border p-2">
                        <ul>
                          <li>Taking reasonable care for their own and others' health and safety.</li>
                          <li>Complying with all QSE policies, procedures, and instructions.</li>
                          <li>Reporting any hazards, incidents, or environmental spills immediately.</li>
                          <li>Using provided personal protective equipment (PPE) correctly.</li>
                          <li>Using the system to access controlled documents (SWMS, ITPs) and report hazards/incidents.</li>
                        </ul>
                      </td>
                      <td className="border p-2">
                        <ul>
                          <li>The right and obligation to stop work if they believe it is unsafe.</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </section>
'''
