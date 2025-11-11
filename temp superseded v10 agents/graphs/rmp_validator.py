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

class RiskAssessment(BaseModel):
    """Individual risk assessment validation"""
    risk_category: str = Field(description="Category of risk (safety, environmental, financial, etc.)")
    risk_description: str = Field(description="Description of the risk")
    likelihood_assessment: str = Field(description="Assessment of likelihood (Low/Medium/High)")
    consequence_assessment: str = Field(description="Assessment of consequences (Low/Medium/High)")
    mitigation_measures: List[str] = Field(description="Existing mitigation measures")
    gaps_identified: List[str] = Field(description="Gaps in risk mitigation")
    compliance_status: str = Field(description="Compliance with standards (Compliant/Non-compliant/Partially compliant)")

class RMPValidation(BaseModel):
    """Pydantic model for RMP validation results"""
    overall_compliance_score: float = Field(description="Overall compliance score (0-1)")
    risk_assessments: List[RiskAssessment] = Field(description="Detailed risk assessments")
    compliance_gaps: List[str] = Field(description="Major compliance gaps identified")
    improvement_recommendations: List[str] = Field(description="Recommendations for improvement")
    regulatory_compliance: Dict[str, bool] = Field(description="Compliance with specific regulations")
    standard_alignment: Dict[str, float] = Field(description="Alignment with relevant standards (0-1)")
    critical_findings: List[str] = Field(description="Critical findings requiring immediate attention")
    validation_confidence: float = Field(description="Confidence in validation assessment (0-1)")

class RMPValidatorState(BaseModel):
    """State for RMP validation following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    jurisdiction_analysis: Optional[Dict[str, Any]] = None
    rmp_document: Optional[Dict[str, Any]] = None
    rmp_validation: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for RMP validation"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    jurisdiction_analysis: Optional[Dict[str, Any]] = None
    rmp_document: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for RMP validation"""
    rmp_validation: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def validate_rmp_node(state: RMPValidatorState) -> RMPValidatorState:
    """Validate Risk Management Plan using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}
        jurisdiction = state.jurisdiction_analysis or {}
        rmp_doc = state.rmp_document or {}

        combined_content = "\n\n".join([
            f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in docs
        ])

        rmp_content = rmp_doc.get('content', 'RMP document not provided')

        # LLM prompt for RMP validation
        rmp_validation_prompt = f"""
        Perform a comprehensive validation of the Risk Management Plan (RMP) against Australian regulatory requirements and industry standards.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        JURISDICTION:
        {jurisdiction.get('jurisdiction', 'Not specified')}

        RISK MANAGEMENT PLAN CONTENT:
        {rmp_content}

        ADDITIONAL PROJECT DOCUMENTS:
        {combined_content}

        Validate the RMP against these requirements:

        1. WORK HEALTH SAFETY REGULATIONS (WHS, Model WHS Laws)
        2. ENVIRONMENTAL REGULATIONS (EP&A Act, Protection of the Environment Operations Act)
        3. CONSTRUCTION STANDARDS (AS/NZS ISO 31000, AS 2061)
        4. JURISDICTIONAL REQUIREMENTS (state-specific regulations)
        5. INDUSTRY BEST PRACTICES (risk management frameworks)

        Assess:
        - Risk identification completeness
        - Risk assessment methodology
        - Mitigation strategy adequacy
        - Monitoring and review processes
        - Compliance with regulatory requirements
        - Alignment with project scope and complexity

        Provide detailed findings and recommendations.
        """

        # Create structured LLM for RMP validation
        class RMPValidationResponse(BaseModel):
            compliance_score: float = Field(description="Overall compliance score (0-1)")
            risk_assessments: List[RiskAssessment] = Field(description="Detailed risk assessments")
            major_gaps: List[str] = Field(description="Major compliance gaps")
            improvement_recs: List[str] = Field(description="Improvement recommendations")
            regulatory_compliance: Dict[str, bool] = Field(description="Specific regulation compliance")
            standard_alignment: Dict[str, float] = Field(description="Standard alignment scores")
            critical_findings: List[str] = Field(description="Critical issues requiring attention")

        structured_llm = llm.with_structured_output(RMPValidationResponse)
        validation_result = structured_llm.invoke(rmp_validation_prompt)

        # Calculate validation confidence based on input completeness
        input_completeness = sum([
            1 if docs else 0,
            1 if project_details else 0,
            1 if jurisdiction else 0,
            1 if rmp_doc else 0
        ]) / 4.0

        validation_confidence = min(0.95, input_completeness * 0.9 + 0.1)

        # Determine overall validation status
        if validation_result.compliance_score >= 0.8:
            validation_status = "COMPLIANT"
        elif validation_result.compliance_score >= 0.6:
            validation_status = "PARTIALLY COMPLIANT"
        else:
            validation_status = "NON-COMPLIANT"

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "rmp_validation": {
                "compliance_score": validation_result.compliance_score,
                "validation_status": validation_status,
                "risk_assessments": [r.model_dump() for r in validation_result.risk_assessments],
                "major_gaps": validation_result.major_gaps,
                "improvement_recommendations": validation_result.improvement_recs,
                "regulatory_compliance": validation_result.regulatory_compliance,
                "standard_alignment": validation_result.standard_alignment,
                "critical_findings": validation_result.critical_findings,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "validation_confidence": validation_confidence,
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for RMP validation
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="analysis",
            asset_subtype="rmp_validation",
            name=f"RMP Validation - {validation_status} ({validation_result.compliance_score:.1%})",
            description=f"Risk Management Plan validation for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "analysis_type": "rmp_validation",
                "compliance_score": validation_result.compliance_score,
                "validation_status": validation_status,
                "risk_assessments_count": len(validation_result.risk_assessments),
                "major_gaps_count": len(validation_result.major_gaps),
                "critical_findings_count": len(validation_result.critical_findings),
                "validation_confidence": validation_confidence,
                "llm_outputs": llm_outputs
            },
            content={
                "validation_results": {
                    "overall_score": validation_result.compliance_score,
                    "status": validation_status,
                    "risk_assessments": [r.model_dump() for r in validation_result.risk_assessments],
                    "compliance_gaps": validation_result.major_gaps,
                    "improvement_recommendations": validation_result.improvement_recs,
                    "regulatory_compliance": validation_result.regulatory_compliance,
                    "standard_alignment": validation_result.standard_alignment,
                    "critical_findings": validation_result.critical_findings
                },
                "source_documents": [d.get('id') for d in docs if d.get('id')],
                "rmp_document_id": rmp_doc.get('id')
            },
            idempotency_key=f"rmp_validation:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return RMPValidatorState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            jurisdiction_analysis=state.jurisdiction_analysis,
            rmp_document=state.rmp_document,
            rmp_validation={
                "compliance_score": validation_result.compliance_score,
                "validation_status": validation_status,
                "risk_assessments": [r.model_dump() for r in validation_result.risk_assessments],
                "compliance_gaps": validation_result.major_gaps,
                "improvement_recommendations": validation_result.improvement_recs,
                "regulatory_compliance": validation_result.regulatory_compliance,
                "standard_alignment": validation_result.standard_alignment,
                "critical_findings": validation_result.critical_findings,
                "validation_confidence": validation_confidence
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"RMP validation failed: {str(e)}")
        return RMPValidatorState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            jurisdiction_analysis=state.jurisdiction_analysis,
            rmp_document=state.rmp_document,
            rmp_validation=None,
            asset_specs=[],
            error=f"RMP validation failed: {str(e)}"
        )

def create_rmp_validator_graph():
    """Create the RMP validator graph with persistence"""
    workflow = StateGraph(RMPValidatorState, input=InputState, output=OutputState)

    workflow.add_node("validate_rmp", validate_rmp_node)

    workflow.add_edge(START, "validate_rmp")
    workflow.add_edge("validate_rmp", END)

    return workflow.compile(checkpointer=True)
