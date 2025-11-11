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

class StandardMatch(BaseModel):
    """Individual standard match with reasoning"""
    standard_code: str = Field(description="Standard code (e.g., AS1289, AS3600)")
    standard_title: str = Field(description="Full standard title")
    relevance_score: float = Field(description="Relevance to project (0-1)")
    applicability_reason: str = Field(description="Why this standard applies")
    specific_sections: List[str] = Field(description="Specific sections/clauses that apply")
    compliance_requirements: List[str] = Field(description="Key compliance requirements from this standard")
    testing_requirements: List[str] = Field(description="Testing/validation requirements")

class StandardsResolution(BaseModel):
    """Pydantic model for comprehensive standards resolution"""
    primary_standards: List[StandardMatch] = Field(description="Core standards that must be complied with")
    secondary_standards: List[StandardMatch] = Field(description="Supporting standards")
    jurisdictional_standards: List[StandardMatch] = Field(description="State/territory specific standards")
    industry_specific_standards: List[StandardMatch] = Field(description="Industry-specific standards")
    risk_based_standards: List[str] = Field(description="Standards identified based on risk assessment")
    compliance_gaps: List[str] = Field(description="Potential compliance gaps identified")
    recommendation_priority: Dict[str, int] = Field(description="Priority ranking for standards implementation")
    confidence_score: float = Field(description="Overall confidence in standards resolution (0-1)")

class StandardsResolverState(BaseModel):
    """State for standards resolution following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    wbs_structure: Optional[Dict[str, Any]] = None
    jurisdiction_analysis: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for standards resolution"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    wbs_structure: Optional[Dict[str, Any]] = None
    jurisdiction_analysis: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for standards resolution"""
    standards_resolution: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def resolve_standards_node(state: StandardsResolverState) -> StandardsResolverState:
    """Resolve applicable standards using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}
        wbs = state.wbs_structure or {}
        jurisdiction = state.jurisdiction_analysis or {}

        combined_content = "\n\n".join([
            f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in docs
        ])

        # LLM prompt for comprehensive standards resolution
        standards_prompt = f"""
        Perform a comprehensive analysis to identify all applicable Australian standards and codes for this construction project.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        JURISDICTION:
        {jurisdiction.get('jurisdiction', 'Not specified')}

        WORK BREAKDOWN STRUCTURE:
        {wbs.get('description', 'Not provided')}

        DOCUMENT CONTENT:
        {combined_content}

        Based on the Australian Standards framework, identify applicable standards considering:

        1. CORE CONSTRUCTION STANDARDS (AS 1288, AS 3600, AS 4100, etc.)
        2. SAFETY STANDARDS (AS/NZS 4801, AS 2061, etc.)
        3. QUALITY STANDARDS (AS/NZS ISO 9001, AS 1289, etc.)
        4. ENVIRONMENTAL STANDARDS (AS/NZS ISO 14001, etc.)
        5. JURISDICTIONAL REQUIREMENTS (state-specific standards)
        6. INDUSTRY-SPECIFIC STANDARDS (roads, buildings, infrastructure)

        For each applicable standard, provide:
        - Relevance score (0-1)
        - Specific sections/clauses that apply
        - Key compliance requirements
        - Testing/validation requirements
        - Implementation priority

        Consider risk levels, project complexity, and regulatory requirements.
        """

        # Create structured LLM for standards resolution
        class StandardsResolutionResponse(BaseModel):
            primary_standards: List[StandardMatch] = Field(description="Core mandatory standards")
            secondary_standards: List[StandardMatch] = Field(description="Supporting standards")
            jurisdictional_standards: List[StandardMatch] = Field(description="State/territory specific")
            industry_standards: List[StandardMatch] = Field(description="Industry-specific standards")
            risk_based_standards: List[str] = Field(description="Risk-driven standard requirements")
            compliance_gaps: List[str] = Field(description="Identified compliance gaps")
            priority_ranking: Dict[str, int] = Field(description="Implementation priority (1-5)")

        structured_llm = llm.with_structured_output(StandardsResolutionResponse)
        standards_result = structured_llm.invoke(standards_prompt)

        # Calculate overall confidence based on input completeness
        input_completeness = sum([
            1 if docs else 0,
            1 if project_details else 0,
            1 if wbs else 0,
            1 if jurisdiction else 0
        ]) / 4.0

        confidence_score = min(0.9, input_completeness * 0.8 + 0.2)  # Base confidence with input bonus

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "standards_resolution": {
                "primary_standards": [s.model_dump() for s in standards_result.primary_standards],
                "secondary_standards": [s.model_dump() for s in standards_result.secondary_standards],
                "jurisdictional_standards": [s.model_dump() for s in standards_result.jurisdictional_standards],
                "industry_standards": [s.model_dump() for s in standards_result.industry_standards],
                "risk_based_standards": standards_result.risk_based_standards,
                "compliance_gaps": standards_result.compliance_gaps,
                "priority_ranking": standards_result.priority_ranking,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "confidence_score": confidence_score,
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for standards resolution
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="analysis",
            asset_subtype="standards_resolution",
            name=f"Standards Resolution - {len(standards_result.primary_standards)} Primary Standards",
            description=f"Comprehensive standards analysis for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "analysis_type": "standards_resolution",
                "total_standards_identified": len(standards_result.primary_standards) + len(standards_result.secondary_standards),
                "primary_standards_count": len(standards_result.primary_standards),
                "jurisdictional_standards_count": len(standards_result.jurisdictional_standards),
                "compliance_gaps_count": len(standards_result.compliance_gaps),
                "confidence_score": confidence_score,
                "llm_outputs": llm_outputs
            },
            content={
                "standards_analysis": {
                    "primary": [s.model_dump() for s in standards_result.primary_standards],
                    "secondary": [s.model_dump() for s in standards_result.secondary_standards],
                    "jurisdictional": [s.model_dump() for s in standards_result.jurisdictional_standards],
                    "industry": [s.model_dump() for s in standards_result.industry_standards]
                },
                "risk_based_requirements": standards_result.risk_based_standards,
                "compliance_gaps": standards_result.compliance_gaps,
                "implementation_priorities": standards_result.priority_ranking,
                "source_documents": [d.get('id') for d in docs if d.get('id')]
            },
            idempotency_key=f"standards_resolution:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return StandardsResolverState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            wbs_structure=state.wbs_structure,
            jurisdiction_analysis=state.jurisdiction_analysis,
            standards_resolution={
                "primary_standards": [s.model_dump() for s in standards_result.primary_standards],
                "secondary_standards": [s.model_dump() for s in standards_result.secondary_standards],
                "jurisdictional_standards": [s.model_dump() for s in standards_result.jurisdictional_standards],
                "industry_standards": [s.model_dump() for s in standards_result.industry_standards],
                "risk_based_standards": standards_result.risk_based_standards,
                "compliance_gaps": standards_result.compliance_gaps,
                "priority_ranking": standards_result.priority_ranking,
                "confidence_score": confidence_score
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"Standards resolution failed: {str(e)}")
        return StandardsResolverState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            wbs_structure=state.wbs_structure,
            jurisdiction_analysis=state.jurisdiction_analysis,
            standards_resolution=None,
            asset_specs=[],
            error=f"Standards resolution failed: {str(e)}"
        )

def create_standards_resolver_graph():
    """Create the standards resolver graph with persistence"""
    workflow = StateGraph(StandardsResolverState, input=InputState, output=OutputState)

    workflow.add_node("resolve_standards", resolve_standards_node)

    workflow.add_edge(START, "resolve_standards")
    workflow.add_edge("resolve_standards", END)

    return workflow.compile(checkpointer=True)
