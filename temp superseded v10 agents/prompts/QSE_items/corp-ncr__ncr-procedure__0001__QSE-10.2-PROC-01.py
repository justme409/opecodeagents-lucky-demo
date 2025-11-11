# QSE extracted item (verbatim HTML preserved)
ITEM_ID = 'QSE-10.2-PROC-01'
TITLE = 'Procedure for Nonconformity, Incident & Corrective Action'

HTML = '''<section id="ncr-procedure" className="scroll-mt-8">
          <div className="bg-white border border-slate-300">
            <div 
              className="bg-red-100 text-gray-900 p-6 cursor-pointer hover:bg-red-200 transition-colors"
              onClick={() => toggleDoc('ncr-procedure')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Procedure for Nonconformity, Incident & Corrective Action</h2>
                  <p className="text-gray-700 leading-relaxed">An integrated procedure for identifying, reporting, investigating, and correcting nonconformities, incidents, and complaints across all QSE aspects.</p>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-12 w-12 text-gray-600 opacity-60" />
                  {expandedDocs['ncr-procedure'] ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
              </div>
            </div>
            {expandedDocs['ncr-procedure'] && (
            <div className="p-8 prose prose-slate max-w-none">
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="border p-3"><span className="font-semibold">Document ID:</span> QSE-10.2-PROC-01</div>
                <div className="border p-3"><span className="font-semibold">Revision:</span> B</div>
                <div className="border p-3"><span className="font-semibold">Effective Date:</span> 25/07/2024</div>
              </div>

              <h3 className="mt-8 mb-4">1.0 Purpose</h3>
              <p>To establish a systematic digital process for identifying, reporting, investigating, and resolving nonconformities and incidents, and for implementing effective corrective actions to prevent their recurrence. The process is fully integrated with the QSE Management System for automated tracking, analytics, and dashboard monitoring.</p>

              <h3 className="mt-8 mb-4">2.0 Process</h3>
              
              <h4>2.1 Digital Identification & Automated Reporting</h4>
              <p>Any employee or subcontractor can report a nonconformity or incident through the digital NCR reporting module with mobile app capability. Reports automatically notify supervisors and are formally logged in the Nonconformity & Corrective Action Register (QSE-10.2-REG-01) with timestamps, GPS location, photo evidence, and immediate supervisor assignment. Integration with project systems auto-links NCRs to specific Lot Register IDs and ITP references.</p>
              
              <h4>2.2 Real-Time Containment & Immediate Correction</h4>
              <p>The supervisor receives automatic notifications and is responsible for taking immediate action to contain the issue (e.g., quarantining nonconforming product, making a hazard safe). Containment actions are digitally recorded with photo evidence and automatically update the project dashboard for real-time visibility.</p>

              <h4>2.3 Digital Investigation & Automated Root Cause Analysis</h4>
              <p>The severity of the issue (auto-assigned by system risk algorithms) dictates the level of investigation required. A formal root cause analysis is conducted using digital investigation tools (5 Whys, Fishbone diagram templates) integrated within the system. Historical data analytics assist in identifying patterns and underlying causes.</p>

              <h4>2.4 Automated Corrective Action Planning</h4>
              <p>Based on the root cause analysis, a corrective action plan is developed using system templates to eliminate the cause and prevent recurrence. Actions are automatically assigned to responsible persons with due dates, progress tracking, and automated reminder notifications. All actions are cross-referenced with the Continual Improvement Register (QSE-10.3-REG-01).</p>

              <h4>2.5 Digital Verification & Effectiveness Monitoring</h4>
              <p>After implementation, the effectiveness of corrective actions is verified through digital evidence collection and automated monitoring of performance data from the dashboard analytics (<code>/dashboard</code>). The system tracks recurrence patterns and triggers alerts for ineffective corrective actions, automatically escalating to management review if required.</p>
            </div>
            )}
          </div>
        </section>
'''
