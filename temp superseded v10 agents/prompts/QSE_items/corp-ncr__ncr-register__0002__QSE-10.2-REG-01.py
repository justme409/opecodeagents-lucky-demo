# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-10.2-REG-01'
TITLE = 'NCR and Corrective Action Register'

HTML = '''<section id="ncr-register" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-orange-100 text-gray-900 p-6 cursor-pointer hover:bg-orange-200 transition-colors"
              onClick={() => toggleDoc('ncr-register')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">NCR and Corrective Action Register</h2>
                  <p className="text-gray-700 leading-relaxed">An organization-wide register to track all nonconformities, incidents, and corrective actions with comprehensive status monitoring and trend analysis.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Database className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['ncr-register'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['ncr-register'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-10.2-REG-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> C</div>
                <div className="border p-3"><span className="font-semibold">Last Updated:</span> 25/07/2024</div>
              </div>

              <h3 className="text-center mt-8 mb-4">Nonconformity & Corrective Action Register</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2">NCR ID</th>
                      <th className="border p-2">Date</th>
                      <th className="border p-2">Description</th>
                      <th className="border p-2">Corrective Action</th>
                      <th className="border p-2">Status</th>
                      <th className="border p-2">Responsible</th>
                      <th className="border p-2">Due Date</th>
                      <th className="border p-2">Project/Lot Link</th>
                      <th className="border p-2">Improvement ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">[Auto-generated NCR ID]</td>
                      <td className="border p-2">[Auto-populated Date/Time]</td>
                      <td className="border p-2">[Enter Nonconformity Description]</td>
                      <td className="border p-2">[Enter Corrective Action Plan]</td>
                      <td className="border p-2">[Auto-tracked: Open/In Progress/Closed]</td>
                      <td className="border p-2">[Auto-assigned Responsible Person]</td>
                      <td className="border p-2">[Enter/Auto-calculated Due Date]</td>
                      <td className="border p-2">[Auto-linked to Project/Lot ID]</td>
                      <td className="border p-2">[Auto-linked to QSE-10.3-REG-01]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 mb-4">NCR Analytics & Trend Analysis Template</h3>
              <div className="overflow-x-auto mb-8">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border p-2 text-left">Analysis Period</th>
                      <th className="border p-2 text-left">NCR Category</th>
                      <th className="border p-2 text-left">Total Count</th>
                      <th className="border p-2 text-left">Recurring Issues</th>
                      <th className="border p-2 text-left">Avg Resolution Time</th>
                      <th className="border p-2 text-left">Effectiveness Rate</th>
                      <th className="border p-2 text-left">Dashboard Link</th>
                      <th className="border p-2 text-left">Improvement Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">[Enter Analysis Period]</td>
                      <td className="border p-2">[Quality/Safety/Environmental]</td>
                      <td className="border p-2">[Auto-calculated Count]</td>
                      <td className="border p-2">[Auto-identified Patterns]</td>
                      <td className="border p-2">[Auto-calculated Average Days]</td>
                      <td className="border p-2">[Auto-calculated % Effective]</td>
                      <td className="border p-2">[Link to /dashboard Analytics]</td>
                      <td className="border p-2">[Link to QSE-10.3-REG-01]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400">
                <p className="text-red-800">
                  <strong>Real-Time Monitoring:</strong> All NCR data is automatically analyzed for trends and patterns through the system dashboard. Recurring issues and ineffective corrective actions trigger automatic alerts and management notifications for prompt action.
                </p>
              </div>

              <div className="mt-4 p-4 bg-orange-50 border-l-4 border-orange-400">
                <p className="text-orange-800">
                  <strong>System Integration:</strong> NCRs are automatically linked to project activities (Lot Register IDs), personnel training records (QSE-7.2-REG-01), and continual improvement initiatives (QSE-10.3-REG-01) for comprehensive impact analysis and prevention strategies.
                </p>
              </div>
            </div>
            )}
          </div>
        </section>
'''
