# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-10.3-REG-01'
TITLE = 'Continual Improvement Opportunities Register'

HTML = '''<section id="improvement-register" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-blue-100 text-gray-900 p-6 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => toggleDoc('improvement-register')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Continual Improvement Opportunities Register</h2>
                  <p className="text-gray-700 leading-relaxed">A live register capturing opportunities for improvement identified from audits, reviews, suggestions, and organizational learning initiatives.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['improvement-register'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['improvement-register'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-10.3-REG-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> B</div>
                <div className="border p-3"><span className="font-semibold">Last Updated:</span> 25/07/2024</div>
              </div>

              <h3 className="text-center mt-8 mb-4">Continual Improvement Opportunities Register</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2">ID</th>
                      <th className="border p-2">Opportunity</th>
                      <th className="border p-2">Source</th>
                      <th className="border p-2">Status</th>
                      <th className="border p-2">Priority</th>
                      <th className="border p-2">Responsible</th>
                      <th className="border p-2">Target Date</th>
                      <th className="border p-2">Source Reference</th>
                      <th className="border p-2">ROI/Benefits</th>
                      <th className="border p-2">Dashboard Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">[Auto-generated CI-ID]</td>
                      <td className="border p-2">[Enter Improvement Opportunity Description]</td>
                      <td className="border p-2">[Auto-categorized Source Type]</td>
                      <td className="border p-2">[Auto-tracked: Identified/Under Review/Approved/In Progress/Implemented/Closed]</td>
                      <td className="border p-2">[Auto-assigned: High/Medium/Low]</td>
                      <td className="border p-2">[Auto-assigned Responsible Person]</td>
                      <td className="border p-2">[Enter/Auto-calculated Target Date]</td>
                      <td className="border p-2">[Auto-linked Source: NCR/Audit/Risk/Review ID]</td>
                      <td className="border p-2">[Enter Expected ROI/Benefits]</td>
                      <td className="border p-2">[Auto-linked to /dashboard Analytics]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 mb-4">Improvement Analytics & ROI Tracking Template</h3>
              <div className="overflow-x-auto mb-8">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border p-2 text-left">Improvement Category</th>
                      <th className="border p-2 text-left">Total Opportunities</th>
                      <th className="border p-2 text-left">Implemented</th>
                      <th className="border p-2 text-left">Success Rate</th>
                      <th className="border p-2 text-left">Avg Implementation Time</th>
                      <th className="border p-2 text-left">Total ROI</th>
                      <th className="border p-2 text-left">Cost Savings</th>
                      <th className="border p-2 text-left">Dashboard Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">[Quality/Safety/Environmental/Process]</td>
                      <td className="border p-2">[Auto-calculated Count]</td>
                      <td className="border p-2">[Auto-calculated Implemented]</td>
                      <td className="border p-2">[Auto-calculated % Success]</td>
                      <td className="border p-2">[Auto-calculated Avg Days]</td>
                      <td className="border p-2">[Auto-calculated Total ROI]</td>
                      <td className="border p-2">[Auto-calculated Cost Savings]</td>
                      <td className="border p-2">[Link to /dashboard Trend Analysis]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 mb-4">System Integration Summary</h3>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="text-xl font-semibold text-green-900 mb-3">Automated Opportunity Identification</h4>
                  <ul className="text-green-800 space-y-2">
                    <li>• Real-time analytics from dashboard performance data</li>
                    <li>• NCR pattern analysis with automatic suggestions</li>
                    <li>• Risk register correlation for proactive improvements</li>
                    <li>• Management review action automatic import</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="text-xl font-semibold text-blue-900 mb-3">Digital Workflow Management</h4>
                  <ul className="text-blue-800 space-y-2">
                    <li>• Automated progress tracking and notifications</li>
                    <li>• ROI calculation and cost-benefit analysis</li>
                    <li>• Cross-system integration and impact assessment</li>
                    <li>• Real-time dashboard monitoring and reporting</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-400">
                <p className="text-green-800">
                  <strong>Critical System Role:</strong> The Continual Improvement Register (QSE-10.3-REG-01) serves as the central hub for all improvement activities across the QSE Management System. It automatically receives inputs from NCR corrective actions, audit findings, management review decisions, risk assessments, and system performance analytics, ensuring comprehensive organizational learning and development.
                </p>
              </div>

              <div className="mt-4 p-4 bg-purple-50 border-l-4 border-purple-400">
                <p className="text-purple-800">
                  <strong>Data-Driven Excellence:</strong> All improvement opportunities are prioritized using AI-powered analytics that consider impact, effort, strategic alignment, and resource availability. The system automatically tracks implementation success rates and ROI to optimize future improvement decisions and resource allocation.
                </p>
              </div>
            </div>
            )}
          </div>
        </section>
'''
