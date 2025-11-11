# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-9.2-SCHED-01'
TITLE = 'Annual Internal Audit Schedule'

HTML = '''<section id="audit-schedule" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-green-100 text-gray-900 p-6 cursor-pointer hover:bg-green-200 transition-colors"
              onClick={() => toggleDoc('audit-schedule')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Annual Internal Audit Schedule</h2>
                  <p className="text-gray-700 leading-relaxed">An annual schedule for internal audits, planned based on risk assessment and importance of processes to ensure comprehensive system coverage.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['audit-schedule'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['audit-schedule'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-9.2-SCHED-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> B</div>
                <div className="border p-3"><span className="font-semibold">Planning Year:</span> 2024</div>
              </div>

              <h3 className="text-center mt-8 mb-4">2024 Annual Internal Audit Schedule</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2">Month</th>
                      <th className="border p-2">Audit Focus</th>
                      <th className="border p-2">Lead Auditor</th>
                      <th className="border p-2">Risk Level</th>
                      <th className="border p-2">System Module</th>
                      <th className="border p-2">Dashboard Tracking</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">[Enter Month]</td>
                      <td className="border p-2">[Enter Audit Focus Area/Process]</td>
                      <td className="border p-2">[Enter Lead Auditor Name]</td>
                      <td className="border p-2">[Auto-assigned: High/Medium/Low]</td>
                      <td className="border p-2">[System Module/Process Area]</td>
                      <td className="border p-2">[Auto-linked to Dashboard Analytics]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 mb-4">Audit Performance Analytics Template</h3>
              <div className="overflow-x-auto mb-8">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border p-2 text-left">Performance Indicator</th>
                      <th className="border p-2 text-left">Current Value</th>
                      <th className="border p-2 text-left">Target</th>
                      <th className="border p-2 text-left">Trend</th>
                      <th className="border p-2 text-left">Action Required</th>
                      <th className="border p-2 text-left">Dashboard Link</th>
                      <th className="border p-2 text-left">Improvement ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">[Enter Audit KPI/Metric]</td>
                      <td className="border p-2">[Auto-populated from System]</td>
                      <td className="border p-2">[Enter Target Value]</td>
                      <td className="border p-2">[Auto-calculated Trend Analysis]</td>
                      <td className="border p-2">[Enter Action if Below Target]</td>
                      <td className="border p-2">[Link to /dashboard Analytics]</td>
                      <td className="border p-2">[Link to QSE-10.3-REG-01]</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </section>
'''
