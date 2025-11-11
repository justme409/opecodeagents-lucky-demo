# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-9.3-PROC-01'
TITLE = 'Procedure for Management Review'

HTML = '''<section id="review-procedure" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-blue-100 text-gray-900 p-6 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => toggleDoc('review-procedure')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Procedure for Management Review</h2>
                  <p className="text-gray-700 leading-relaxed">Outlines the process for conducting periodic management reviews, including inputs, outputs, and decision-making requirements for continuous improvement.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['review-procedure'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['review-procedure'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-9.3-PROC-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> B</div>
                <div className="border p-3"><span className="font-semibold">Effective Date:</span> 25/07/2024</div>
              </div>

              <h3 className="mt-8 mb-4">1.0 Purpose</h3>
              <p>To define the process for conducting regular management reviews of the QSE Integrated Management System (IMS). This ensures the ongoing suitability, adequacy, and effectiveness of the IMS and its alignment with the strategic direction of [Company Name]. Management review processes are supported by real-time dashboard analytics and automated data collection from all QSE system modules.</p>

              <h3 className="mt-8 mb-4">2.0 Frequency & Digital Scheduling</h3>
              <p>Management reviews will be conducted at least annually with automated calendar scheduling and reminder notifications through the system. Additional reviews may be convened to address significant changes or events, with automatic triggering based on performance threshold alerts from the monitoring dashboard. Review scheduling is integrated with participant availability and automatically distributes meeting materials from the system's data repositories.</p>

              <h3 className="mt-8 mb-4">3.0 Automated Data Inputs & Analytics</h3>
              <p>The management review shall consider a range of inputs, automatically compiled and analyzed by the system, including but not limited to:</p>
              <ul>
                <li>The status of actions from previous management reviews (auto-tracked through QSE-10.3-REG-01).</li>
                <li>Changes in external and internal issues that are relevant to the IMS (auto-updated from context analysis).</li>
                <li>Information on QSE performance, including trends in customer satisfaction, objectives, non-conformities, and audit results (real-time dashboard analytics from <code>/dashboard</code>).</li>
                <li>The adequacy of resources (competency analysis from QSE-7.2-REG-01).</li>
                <li>The effectiveness of actions taken to address risks and opportunities (risk register analytics from QSE-6.1-REG-01).</li>
                <li>Opportunities for continual improvement (auto-identified through system performance analytics).</li>
                <li>Real-time project performance data from Lot Register, NCR Register, and ITP systems.</li>
                <li>Automated compliance monitoring reports from legal obligations tracking (QSE-6.1-REG-03).</li>
              </ul>

              <h3 className="mt-8 mb-4">4.0 Digital Outputs & Action Tracking</h3>
              <p>The outputs of the management review shall include decisions and actions related to:</p>
              <ul>
                <li>Opportunities for improvement (automatically logged in QSE-10.3-REG-01 with action tracking).</li>
                <li>Any need for changes to the IMS (system change requests with impact analysis).</li>
                <li>Resource needs (competency gap analysis and budget allocation tracking).</li>
                <li>System performance targets and objectives updates (automated dashboard configuration).</li>
                <li>Risk and opportunity register updates (automatic priority reassignment).</li>
              </ul>
              <p>Digital minutes shall be recorded for all management review meetings with automatic distribution, and actions shall be assigned to responsible individuals with due dates, progress tracking, and automated reminder notifications. All decisions are logged in the system audit trail for compliance verification.</p>
            </div>
            )}
          </div>
        </section>
'''
