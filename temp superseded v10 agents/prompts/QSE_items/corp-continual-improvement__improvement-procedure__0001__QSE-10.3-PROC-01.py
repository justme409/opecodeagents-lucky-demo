# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-10.3-PROC-01'
TITLE = 'Procedure for Continual Improvement'

HTML = '''<section id="improvement-procedure" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-green-100 text-gray-900 p-6 cursor-pointer hover:bg-green-200 transition-colors"
              onClick={() => toggleDoc('improvement-procedure')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Procedure for Continual Improvement</h2>
                  <p className="text-gray-700 leading-relaxed">Outlines the overall approach to continually improving the suitability, adequacy, and effectiveness of the integrated QSE management system.</p>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['improvement-procedure'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['improvement-procedure'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-10.3-PROC-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> B</div>
                <div className="border p-3"><span className="font-semibold">Effective Date:</span> 25/07/2024</div>
              </div>

              <h3 className="mt-8 mb-4">1.0 Purpose</h3>
              <p>To establish a proactive and systematic digital approach to continual improvement, ensuring the QSE Integrated Management System (IMS) evolves to enhance performance, adapt to changing contexts, and deliver increasing value to stakeholders. The process is fully integrated with system analytics to automatically identify improvement opportunities and track implementation effectiveness through real-time dashboard monitoring.</p>

              <h3 className="mt-8 mb-4">2.0 Automated Sources of Improvement</h3>
              <p>Improvement opportunities are automatically identified and actively sought from integrated system sources, including:</p>
              <ul>
                <li><strong>Automated Data Analysis:</strong> Real-time review of performance data, audit results, and NCR trends from dashboard analytics (<code>/dashboard</code>) with AI-powered pattern recognition.</li>
                <li><strong>Digital Stakeholder Feedback:</strong> Integrated suggestion system from employees, clients, and suppliers with automatic categorization and priority assignment.</li>
                <li><strong>Project-Based Lessons Learned:</strong> Automated extraction of lessons learned from completed projects and incidents via project management modules and NCR analytics.</li>
                <li><strong>Management Review Actions:</strong> Automatic import of improvement actions from Management Review outputs (QSE-9.3-REG-01) with progress tracking.</li>
                <li><strong>System Performance Analytics:</strong> Automated identification of inefficiencies through system usage analytics and process optimization algorithms.</li>
                <li><strong>Cross-Reference Integration:</strong> Automatic linking with Risk Register (QSE-6.1-REG-01), Audit findings (QSE-9.2-REG-01), and NCR patterns (QSE-10.2-REG-01).</li>
              </ul>

              <h3 className="mt-8 mb-4">3.0 Digital Workflow Process</h3>
              <p>All identified opportunities are automatically logged in the Continual Improvement Opportunities Register (QSE-10.3-REG-01) with unique tracking IDs. Each opportunity is then digitally evaluated using integrated assessment tools based on potential benefit, cost, and alignment with strategic objectives. Approved initiatives are planned and managed as formal projects with clear deliverables, timelines, automated progress tracking, and real-time dashboard monitoring. The system automatically generates status reports, sends reminder notifications, and tracks ROI for completed improvements.</p>
            </div>
            )}
          </div>
        </section>
'''
