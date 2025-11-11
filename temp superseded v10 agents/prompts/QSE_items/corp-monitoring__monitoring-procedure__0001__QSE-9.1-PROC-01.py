# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-9.1-PROC-01'
TITLE = 'Procedure for Monitoring, Measurement, and Analysis'

HTML = '''<section id="monitoring-procedure" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-blue-100 text-gray-900 p-6 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => toggleDoc('monitoring-procedure')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Procedure for Monitoring, Measurement, and Analysis</h2>
                  <p className="text-gray-700 leading-relaxed">Defines the methods and systems for monitoring, measuring, and analyzing QSE performance to demonstrate achievement of objectives and drive improvement.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['monitoring-procedure'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['monitoring-procedure'] && (
              <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-9.1-PROC-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> B</div>
                <div className="border p-3"><span className="font-semibold">Effective Date:</span> 25/07/2024</div>
              </div>
              <h3 className="mt-8 mb-4">1.0 Purpose</h3>
              <p>To define the systematic digital process for monitoring, measuring, analysing, and evaluating the QSE performance of [Company Name]'s operations and management system. This ensures that performance against objectives is understood through real-time dashboard analytics, compliance is maintained, and data-driven decisions are made to foster continual improvement.</p>
              
              <h3 className="mt-8 mb-4">2.0 Scope</h3>
              <p>This procedure applies to all activities across the organisation that monitor and measure QSE performance. This includes, but is not limited to, project site operations, workshop activities, and corporate functions.</p>

              <h3 className="mt-8 mb-4">3.0 Procedure Details</h3>
              
              <h4>3.1 Automated Digital Monitoring & Measurement</h4>
              <p>The key aspects to be monitored are defined in the company's QSE Objectives and Targets Plan and project-specific PMPs, with real-time data collection and dashboard display (<code>/dashboard</code>). These typically include:</p>
              <ul>
                <li><strong>Quality:</strong> Conformance of work to specifications (e.g., survey results, material test reports), number of non-conformances (NCRs) from QSE-10.2-REG-01 with automated trend analysis.</li>
                <li><strong>Safety:</strong> Lead and lag indicators such as the number of site inspections, positive observations, near misses, and LTIFR/TRIFR with real-time calculation and alert thresholds.</li>
                <li><strong>Environment:</strong> Environmental monitoring results (e.g., water quality, noise levels), waste generation data, and incident reports with automatic compliance checking against legal obligations (QSE-6.1-REG-03).</li>
                <li><strong>Compliance:</strong> Status of compliance with all items listed in the Compliance Obligations Register with automated monitoring and alert notifications.</li>
                <li><strong>Customer Satisfaction:</strong> Digital feedback and results from customer surveys with automated analysis and improvement opportunity identification (QSE-10.3-REG-01).</li>
                <li><strong>System Performance:</strong> Digital analytics on user adoption, process efficiency, and automation effectiveness across all QSE modules.</li>
              </ul>

              <h4>3.2 Digital Methods and Automated Frequency</h4>
              <p>Monitoring shall be conducted through various digital methods with automated data collection and real-time processing:</p>
              <ul>
                <li><strong>Digital Inspections:</strong> Mobile app-based daily site safety walks, weekly environmental inspections, formal system audits with GPS tracking and photo evidence automatically uploaded to the system.</li>
                <li><strong>Automated Testing Integration:</strong> Material sampling and testing results automatically imported into project ITPs with compliance checking.</li>
                <li><strong>Real-Time Observation:</strong> Digital behavioural safety observations with immediate reporting and trend analysis.</li>
                <li><strong>Continuous Data Review:</strong> Automated analysis of incident reports, NCRs, and customer feedback with AI-powered pattern recognition and alert generation.</li>
              </ul>
              <p>The frequency of these activities is defined in project schedules, PMPs, and the Internal Audit Schedule, with automated scheduling and reminder notifications through the system.</p>

              <h4>3.3 Real-Time Analysis and Evaluation</h4>
              <p>Data collected from monitoring and measurement activities is automatically analysed using system analytics to identify trends, performance gaps, and opportunities for improvement in real-time. This analysis is continuously displayed on the monitoring dashboard (<code>/dashboard</code>) and forms a key input into monthly project reviews and the formal Management Review process. Performance variance alerts automatically trigger improvement opportunities in the Continual Improvement Register (QSE-10.3-REG-01).</p>
              
              <h3 className="mt-8 mb-4">4.0 Digital Records & Analytics</h3>
              <p>All records of monitoring, measurement, analysis, and evaluation are automatically maintained in the digital system as evidence of performance. This includes digital inspection checklists, test reports, audit findings, and meeting minutes with complete audit trails, timestamps, and cross-system integration. Performance analytics are automatically generated and displayed on the real-time monitoring dashboard for management oversight and decision-making.</p>
            </div>
            )}
          </div>
        </section>
'''
