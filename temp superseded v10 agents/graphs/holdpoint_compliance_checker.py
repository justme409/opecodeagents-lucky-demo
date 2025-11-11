from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import logging
from agent.tools.action_graph_repo import upsertAssetsAndEdges, IdempotentAssetWriteSpec

logger = logging.getLogger(__name__)

# LLM Configuration following V9 patterns
llm = ChatGoogleGenerativeAI(
    model=os.getenv("GEMINI_MODEL_2", "gemini-2.5-pro"),
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.1,
    max_output_tokens=32768,
    include_thoughts=False,
    thinking_budget=-1,
)

class HoldPoint(BaseModel):
    """Individual hold point assessment"""
    holdpoint_reference: str = Field(description="Hold point reference number/ID")
    activity_description: str = Field(description="Description of the hold point activity")
    contractual_requirement: str = Field(description="Contractual requirement reference")
    compliance_status: str = Field(description="Compliance status (Compliant/Non-compliant/Partially compliant)")
    inspection_criteria: List[str] = Field(description="Defined inspection criteria")
    sign_off_authority: str = Field(description="Required sign-off authority")
    non_compliance_issues: List[str] = Field(description="Identified non-compliance issues")
    risk_implications: str = Field(description="Risk implications of non-compliance")

class HoldPointComplianceCheck(BaseModel):
    """Pydantic model for hold point compliance validation"""
    overall_compliance_score: float = Field(description="Overall compliance score (0-1)")
    holdpoint_assessments: List[HoldPoint] = Field(description="Detailed hold point assessments")
    critical_non_compliances: List[str] = Field(description="Critical non-compliance issues")
    procedural_gaps: List[str] = Field(description="Procedural gaps identified")
    improvement_recommendations: List[str] = Field(description="Recommendations for improvement")
    risk_assessment: Dict[str, str] = Field(description="Risk levels for non-compliant items")
    contractual_alignment: float = Field(description="Alignment with contract requirements (0-1)")
    validation_confidence: float = Field(description="Confidence in compliance assessment (0-1)")

class HoldPointComplianceCheckerState(BaseModel):
    """State for hold point compliance checking following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    contract_documents: List[Dict[str, Any]] = []
    itp_document: Optional[Dict[str, Any]] = None
    holdpoint_compliance_check: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for hold point compliance checking"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    contract_documents: List[Dict[str, Any]] = []
    itp_document: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for hold point compliance checking"""
    holdpoint_compliance_check: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def check_holdpoint_compliance_node(state: HoldPointComplianceCheckerState) -> HoldPointComplianceCheckerState:
    """Check hold point compliance using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}
        contract_docs = state.contract_documents or []
        itp_doc = state.itp_document or {}

        combined_content = "\n\n".join([
            f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in docs
        ])

        contract_content = "\n\n".join([
            f"Contract Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in contract_docs
        ])

        itp_content = itp_doc.get('content', 'ITP document not provided')

        # LLM prompt for hold point compliance checking
        holdpoint_check_prompt = f"""
        Perform a comprehensive compliance check of hold points against contractual requirements, safety standards, and project specifications.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        CONTRACT DOCUMENTS:
        {contract_content}

        INSPECTION AND TEST PLAN:
        {itp_content}

        PROJECT DOCUMENTS:
        {combined_content}

        Analyze hold points for compliance by checking:

        1. CONTRACTUAL COMPLIANCE:
           - Hold point definitions in contract
           - Notification requirements
           - Inspection criteria specified
           - Sign-off authorities defined

        2. SAFETY AND QUALITY STANDARDS:
           - AS/NZS 2061 (Safety inspections)
           - AS 1288 (Critical activity inspections)
           - WHS Regulations compliance
           - Risk-based hold point placement

        3. PROCEDURAL REQUIREMENTS:
           - Pre-inspection notifications
           - Inspection record keeping
           - Non-conformance procedures
           - Follow-up inspection requirements

        4. RISK MANAGEMENT:
           - Critical path activities identified
           - High-risk work hold points
           - Contingency procedures
           - Escalation protocols

        5. DOCUMENTATION STANDARDS:
           - Hold point logs maintained
           - Inspection reports complete
           - Sign-off documentation
           - Audit trail maintained

        Identify any non-compliances, procedural gaps, and provide recommendations for improvement.
        """

        # Create structured LLM for hold point compliance checking
        class HoldPointComplianceResponse(BaseModel):
            compliance_score: float = Field(description="Overall compliance score (0-1)")
            holdpoint_assessments: List[HoldPoint] = Field(description="Detailed hold point assessments")
            critical_issues: List[str] = Field(description="Critical non-compliance issues")
            procedural_gaps: List[str] = Field(description="Procedural gaps identified")
            improvement_recs: List[str] = Field(description="Improvement recommendations")
            risk_levels: Dict[str, str] = Field(description="Risk levels for non-compliant items")
            contractual_alignment: float = Field(description="Contract alignment score (0-1)")

        structured_llm = llm.with_structured_output(HoldPointComplianceResponse)
        compliance_result = structured_llm.invoke(holdpoint_check_prompt)

        # Calculate validation confidence based on input completeness
        input_completeness = sum([
            1 if docs else 0,
            1 if project_details else 0,
            1 if contract_docs else 0,
            1 if itp_doc else 0
        ]) / 4.0

        validation_confidence = min(0.95, input_completeness * 0.9 + 0.1)

        # Determine overall compliance status
        if compliance_result.compliance_score >= 0.8:
            compliance_status = "COMPLIANT"
        elif compliance_result.compliance_score >= 0.6:
            compliance_status = "PARTIALLY COMPLIANT"
        else:
            compliance_status = "NON-COMPLIANT"

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "holdpoint_compliance_check": {
                "compliance_score": compliance_result.compliance_score,
                "compliance_status": compliance_status,
                "holdpoint_assessments": [h.model_dump() for h in compliance_result.holdpoint_assessments],
                "critical_issues": compliance_result.critical_issues,
                "procedural_gaps": compliance_result.procedural_gaps,
                "improvement_recommendations": compliance_result.improvement_recs,
                "risk_assessment": compliance_result.risk_levels,
                "contractual_alignment": compliance_result.contractual_alignment,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "contract_document_ids": [d.get('id') for d in contract_docs if d.get('id')],
                "validation_confidence": validation_confidence,
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for hold point compliance check
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="analysis",
            asset_subtype="holdpoint_compliance_check",
            name=f"Hold Point Compliance Check - {compliance_status} ({compliance_result.compliance_score:.1%})",
            description=f"Hold point compliance validation for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "analysis_type": "holdpoint_compliance_check",
                "compliance_score": compliance_result.compliance_score,
                "compliance_status": compliance_status,
                "holdpoints_assessed": len(compliance_result.holdpoint_assessments),
                "critical_issues_count": len(compliance_result.critical_issues),
                "procedural_gaps_count": len(compliance_result.procedural_gaps),
                "contractual_alignment": compliance_result.contractual_alignment,
                "validation_confidence": validation_confidence,
                "llm_outputs": llm_outputs
            },
            content={
                "compliance_assessment": {
                    "overall_score": compliance_result.compliance_score,
                    "status": compliance_status,
                    "holdpoint_assessments": [h.model_dump() for h in compliance_result.holdpoint_assessments],
                    "critical_non_compliances": compliance_result.critical_issues,
                    "procedural_gaps": compliance_result.procedural_gaps,
                    "improvement_recommendations": compliance_result.improvement_recs,
                    "risk_assessment": compliance_result.risk_levels,
                    "contractual_alignment": compliance_result.contractual_alignment
                },
                "source_documents": [d.get('id') for d in docs if d.get('id')],
                "contract_documents": [d.get('id') for d in contract_docs if d.get('id')],
                "itp_document_id": itp_doc.get('id')
            },
            idempotency_key=f"holdpoint_compliance_check:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return HoldPointComplianceCheckerState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            contract_documents=state.contract_documents,
            itp_document=state.itp_document,
            holdpoint_compliance_check={
                "compliance_score": compliance_result.compliance_score,
                "compliance_status": compliance_status,
                "holdpoint_assessments": [h.model_dump() for h in compliance_result.holdpoint_assessments],
                "critical_issues": compliance_result.critical_issues,
                "procedural_gaps": compliance_result.procedural_gaps,
                "improvement_recommendations": compliance_result.improvement_recs,
                "risk_assessment": compliance_result.risk_levels,
                "contractual_alignment": compliance_result.contractual_alignment,
                "validation_confidence": validation_confidence
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"Hold point compliance check failed: {str(e)}")
        return HoldPointComplianceCheckerState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            contract_documents=state.contract_documents,
            itp_document=state.itp_document,
            holdpoint_compliance_check=None,
            asset_specs=[],
            error=f"Hold point compliance check failed: {str(e)}"
        )

def create_holdpoint_compliance_checker_graph():
    """Create the hold point compliance checker graph with persistence"""
    workflow = StateGraph(HoldPointComplianceCheckerState, input=InputState, output=OutputState)

    workflow.add_node("check_holdpoint_compliance", check_holdpoint_compliance_node)

    workflow.add_edge(START, "check_holdpoint_compliance")
    workflow.add_edge("check_holdpoint_compliance", END)

    # Inherit parent's checkpointer when embedded as a subgraph
    return workflow.compile(checkpointer=True)
