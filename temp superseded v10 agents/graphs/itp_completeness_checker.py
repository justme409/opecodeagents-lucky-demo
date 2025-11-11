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

class ITPItem(BaseModel):
    """Individual ITP item assessment"""
    item_number: str = Field(description="ITP item reference number")
    inspection_activity: str = Field(description="Description of inspection/test activity")
    applicable_standard: str = Field(description="Applicable standard reference")
    frequency: str = Field(description="Inspection frequency")
    acceptance_criteria: str = Field(description="Acceptance criteria defined")
    completeness_score: float = Field(description="Completeness score for this item (0-1)")
    gaps_identified: List[str] = Field(description="Gaps or deficiencies found")

class ITPCompletenessCheck(BaseModel):
    """Pydantic model for ITP completeness validation"""
    overall_completeness_score: float = Field(description="Overall completeness score (0-1)")
    itp_items_assessed: List[ITPItem] = Field(description="Detailed assessment of ITP items")
    missing_critical_elements: List[str] = Field(description="Critical elements missing from ITP")
    compliance_gaps: List[str] = Field(description="Gaps in compliance with standards")
    improvement_recommendations: List[str] = Field(description="Recommendations for improvement")
    standard_coverage: Dict[str, float] = Field(description="Coverage of applicable standards (0-1)")
    risk_based_assessment: List[str] = Field(description="Risk-based assessment findings")
    validation_confidence: float = Field(description="Confidence in completeness assessment (0-1)")

class ITPCompletenessCheckerState(BaseModel):
    """State for ITP completeness checking following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None
    itp_document: Optional[Dict[str, Any]] = None
    itp_completeness_check: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for ITP completeness checking"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None
    itp_document: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for ITP completeness checking"""
    itp_completeness_check: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def check_itp_completeness_node(state: ITPCompletenessCheckerState) -> ITPCompletenessCheckerState:
    """Check ITP completeness using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}
        standards = state.standards_resolution or {}
        itp_doc = state.itp_document or {}

        combined_content = "\n\n".join([
            f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in docs
        ])

        standards_text = ""
        if "primary_standards" in standards:
            standards_text = "\n".join([
                f"- {s.get('standard_code', '')}: {s.get('standard_title', '')}"
                for s in standards["primary_standards"]
            ])

        itp_content = itp_doc.get('content', 'ITP document not provided')

        # LLM prompt for ITP completeness checking
        itp_check_prompt = f"""
        Perform a comprehensive completeness check of the Inspection and Test Plan (ITP) against project requirements, applicable standards, and industry best practices.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        APPLICABLE STANDARDS:
        {standards_text}

        INSPECTION AND TEST PLAN CONTENT:
        {itp_content}

        ADDITIONAL PROJECT DOCUMENTS:
        {combined_content}

        Validate the ITP for completeness by checking:

        1. COVERAGE OF CRITICAL ACTIVITIES:
           - Material testing and verification
           - Installation inspections
           - Safety critical inspections
           - Quality control checkpoints

        2. COMPLIANCE WITH STANDARDS:
           - AS 1289 (Soils testing)
           - AS 3600 (Concrete structures)
           - AS 4100 (Steel structures)
           - AS/NZS 2061 (Safety inspections)

        3. INSPECTION CRITERIA DEFINITION:
           - Clear acceptance criteria
           - Defined inspection methods
           - Specified frequencies
           - Responsible parties identified

        4. RISK-BASED APPROACH:
           - Critical path items identified
           - High-risk activities covered
           - Contingency procedures defined

        5. DOCUMENTATION REQUIREMENTS:
           - Inspection records format
           - Non-conformance procedures
           - Sign-off authorities

        Provide detailed assessment of completeness and identify any gaps.
        """

        # Create structured LLM for ITP completeness checking
        class ITPCompletenessResponse(BaseModel):
            completeness_score: float = Field(description="Overall completeness score (0-1)")
            item_assessments: List[ITPItem] = Field(description="Detailed item assessments")
            missing_elements: List[str] = Field(description="Critical missing elements")
            compliance_gaps: List[str] = Field(description="Compliance gaps identified")
            improvement_recs: List[str] = Field(description="Improvement recommendations")
            standard_coverage: Dict[str, float] = Field(description="Standard coverage scores")
            risk_findings: List[str] = Field(description="Risk-based assessment findings")

        structured_llm = llm.with_structured_output(ITPCompletenessResponse)
        completeness_result = structured_llm.invoke(itp_check_prompt)

        # Calculate validation confidence based on input completeness
        input_completeness = sum([
            1 if docs else 0,
            1 if project_details else 0,
            1 if standards else 0,
            1 if itp_doc else 0
        ]) / 4.0

        validation_confidence = min(0.95, input_completeness * 0.9 + 0.1)

        # Determine completeness status
        if completeness_result.completeness_score >= 0.8:
            completeness_status = "COMPLETE"
        elif completeness_result.completeness_score >= 0.6:
            completeness_status = "PARTIALLY COMPLETE"
        else:
            completeness_status = "INCOMPLETE"

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "itp_completeness_check": {
                "completeness_score": completeness_result.completeness_score,
                "completeness_status": completeness_status,
                "item_assessments": [i.model_dump() for i in completeness_result.item_assessments],
                "missing_elements": completeness_result.missing_elements,
                "compliance_gaps": completeness_result.compliance_gaps,
                "improvement_recommendations": completeness_result.improvement_recs,
                "standard_coverage": completeness_result.standard_coverage,
                "risk_findings": completeness_result.risk_findings,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "validation_confidence": validation_confidence,
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for ITP completeness check
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="analysis",
            asset_subtype="itp_completeness_check",
            name=f"ITP Completeness Check - {completeness_status} ({completeness_result.completeness_score:.1%})",
            description=f"Inspection and Test Plan completeness validation for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "analysis_type": "itp_completeness_check",
                "completeness_score": completeness_result.completeness_score,
                "completeness_status": completeness_status,
                "items_assessed": len(completeness_result.item_assessments),
                "missing_elements_count": len(completeness_result.missing_elements),
                "compliance_gaps_count": len(completeness_result.compliance_gaps),
                "validation_confidence": validation_confidence,
                "llm_outputs": llm_outputs
            },
            content={
                "completeness_assessment": {
                    "overall_score": completeness_result.completeness_score,
                    "status": completeness_status,
                    "item_assessments": [i.model_dump() for i in completeness_result.item_assessments],
                    "missing_critical_elements": completeness_result.missing_elements,
                    "compliance_gaps": completeness_result.compliance_gaps,
                    "improvement_recommendations": completeness_result.improvement_recs,
                    "standard_coverage": completeness_result.standard_coverage,
                    "risk_based_findings": completeness_result.risk_findings
                },
                "source_documents": [d.get('id') for d in docs if d.get('id')],
                "itp_document_id": itp_doc.get('id')
            },
            idempotency_key=f"itp_completeness_check:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return ITPCompletenessCheckerState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            standards_resolution=state.standards_resolution,
            itp_document=state.itp_document,
            itp_completeness_check={
                "completeness_score": completeness_result.completeness_score,
                "completeness_status": completeness_status,
                "item_assessments": [i.model_dump() for i in completeness_result.item_assessments],
                "missing_elements": completeness_result.missing_elements,
                "compliance_gaps": completeness_result.compliance_gaps,
                "improvement_recommendations": completeness_result.improvement_recs,
                "standard_coverage": completeness_result.standard_coverage,
                "risk_findings": completeness_result.risk_findings,
                "validation_confidence": validation_confidence
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"ITP completeness check failed: {str(e)}")
        return ITPCompletenessCheckerState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            standards_resolution=state.standards_resolution,
            itp_document=state.itp_document,
            itp_completeness_check=None,
            asset_specs=[],
            error=f"ITP completeness check failed: {str(e)}"
        )

def create_itp_completeness_checker_graph():
    """Create the ITP completeness checker graph with persistence"""
    workflow = StateGraph(ITPCompletenessCheckerState, input=InputState, output=OutputState)

    workflow.add_node("check_itp_completeness", check_itp_completeness_node)

    workflow.add_edge(START, "check_itp_completeness")
    workflow.add_edge("check_itp_completeness", END)

    return workflow.compile(checkpointer=True)
