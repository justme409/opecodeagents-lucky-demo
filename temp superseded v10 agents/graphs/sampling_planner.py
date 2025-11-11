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

class SamplingRequirement(BaseModel):
    """Individual sampling requirement"""
    material_type: str = Field(description="Type of material being tested")
    test_type: str = Field(description="Type of test required")
    standard_reference: str = Field(description="Applicable standard/section")
    sampling_frequency: str = Field(description="How often to sample (per batch, per day, etc.)")
    sample_size: str = Field(description="Required sample size/quantity")
    acceptance_criteria: str = Field(description="Pass/fail criteria")
    risk_level: str = Field(description="Risk level (Low/Medium/High/Critical)")

class SamplingLocation(BaseModel):
    """Sampling location specification"""
    location: str = Field(description="Where sampling should occur")
    material_stream: str = Field(description="Material stream or source")
    sampling_method: str = Field(description="Method of sampling (grab, composite, etc.)")
    frequency: str = Field(description="Sampling frequency")
    responsible_party: str = Field(description="Who is responsible for sampling")

class SamplingPlan(BaseModel):
    """Pydantic model for comprehensive sampling plan"""
    sampling_requirements: List[SamplingRequirement] = Field(description="Detailed sampling requirements")
    sampling_locations: List[SamplingLocation] = Field(description="Where and how to sample")
    quality_control_procedures: List[str] = Field(description="QC procedures to implement")
    testing_schedule: Dict[str, List[str]] = Field(description="Testing schedule by material type")
    risk_based_sampling: List[str] = Field(description="Risk-based sampling considerations")
    compliance_matrix: Dict[str, List[str]] = Field(description="Standards to sampling requirements mapping")
    contingency_procedures: List[str] = Field(description="Contingency procedures for non-conforming results")
    confidence_score: float = Field(description="Confidence in sampling plan adequacy (0-1)")

class SamplingPlannerState(BaseModel):
    """State for sampling plan generation following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    wbs_structure: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None
    sampling_plan: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for sampling plan generation"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    wbs_structure: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for sampling plan generation"""
    sampling_plan: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def generate_sampling_plan_node(state: SamplingPlannerState) -> SamplingPlannerState:
    """Generate sampling plan using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}
        wbs = state.wbs_structure or {}
        standards = state.standards_resolution or {}

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

        # LLM prompt for sampling plan generation
        sampling_prompt = f"""
        Generate a comprehensive sampling and testing plan for this construction project based on applicable standards and specifications.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        WORK BREAKDOWN STRUCTURE:
        {wbs.get('description', 'Not provided')}

        APPLICABLE STANDARDS:
        {standards_text}

        DOCUMENT CONTENT:
        {combined_content}

        Based on Australian Standards (AS 1289, AS 3600, etc.) and project requirements, develop a sampling plan that includes:

        1. MATERIAL TYPES: Concrete, soil, asphalt, aggregates, etc.
        2. TESTING REQUIREMENTS: Strength, gradation, contamination, etc.
        3. SAMPLING LOCATIONS: Source, production, placement sites
        4. SAMPLING METHODS: Grab samples, composite samples, etc.
        5. FREQUENCY REQUIREMENTS: Per batch, per day, per lot
        6. ACCEPTANCE CRITERIA: Specification compliance requirements
        7. QUALITY CONTROL PROCEDURES: Testing protocols and validation
        8. RISK-BASED SAMPLING: Critical vs routine testing

        Consider project scale, risk levels, and regulatory requirements.
        """

        # Create structured LLM for sampling plan
        class SamplingPlanResponse(BaseModel):
            requirements: List[SamplingRequirement] = Field(description="Detailed sampling requirements")
            locations: List[SamplingLocation] = Field(description="Sampling locations and methods")
            qc_procedures: List[str] = Field(description="Quality control procedures")
            testing_schedule: Dict[str, List[str]] = Field(description="Schedule by material type")
            risk_considerations: List[str] = Field(description="Risk-based sampling factors")
            compliance_matrix: Dict[str, List[str]] = Field(description="Standards to requirements mapping")
            contingency_measures: List[str] = Field(description="Non-conformance procedures")

        structured_llm = llm.with_structured_output(SamplingPlanResponse)
        sampling_result = structured_llm.invoke(sampling_prompt)

        # Calculate confidence based on input completeness
        input_completeness = sum([
            1 if docs else 0,
            1 if project_details else 0,
            1 if wbs else 0,
            1 if standards else 0
        ]) / 4.0

        confidence_score = min(0.9, input_completeness * 0.8 + 0.1)  # Base confidence with input bonus

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "sampling_plan": {
                "requirements": [r.model_dump() for r in sampling_result.requirements],
                "locations": [l.model_dump() for l in sampling_result.locations],
                "qc_procedures": sampling_result.qc_procedures,
                "testing_schedule": sampling_result.testing_schedule,
                "risk_considerations": sampling_result.risk_considerations,
                "compliance_matrix": sampling_result.compliance_matrix,
                "contingency_measures": sampling_result.contingency_measures,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "confidence_score": confidence_score,
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for sampling plan
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="plan",
            asset_subtype="sampling_plan",
            name=f"Sampling Plan - {len(sampling_result.requirements)} Requirements",
            description=f"Comprehensive sampling and testing plan for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "plan_type": "sampling_plan",
                "total_requirements": len(sampling_result.requirements),
                "sampling_locations": len(sampling_result.locations),
                "material_types_covered": list(sampling_result.testing_schedule.keys()),
                "confidence_score": confidence_score,
                "llm_outputs": llm_outputs
            },
            content={
                "sampling_requirements": [r.model_dump() for r in sampling_result.requirements],
                "sampling_locations": [l.model_dump() for l in sampling_result.locations],
                "quality_control_procedures": sampling_result.qc_procedures,
                "testing_schedule": sampling_result.testing_schedule,
                "risk_based_considerations": sampling_result.risk_considerations,
                "standards_compliance_matrix": sampling_result.compliance_matrix,
                "contingency_procedures": sampling_result.contingency_measures,
                "source_documents": [d.get('id') for d in docs if d.get('id')]
            },
            idempotency_key=f"sampling_plan:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return SamplingPlannerState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            wbs_structure=state.wbs_structure,
            standards_resolution=state.standards_resolution,
            sampling_plan={
                "requirements": [r.model_dump() for r in sampling_result.requirements],
                "locations": [l.model_dump() for l in sampling_result.locations],
                "qc_procedures": sampling_result.qc_procedures,
                "testing_schedule": sampling_result.testing_schedule,
                "risk_considerations": sampling_result.risk_considerations,
                "compliance_matrix": sampling_result.compliance_matrix,
                "contingency_measures": sampling_result.contingency_measures,
                "confidence_score": confidence_score
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"Sampling plan generation failed: {str(e)}")
        return SamplingPlannerState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            wbs_structure=state.wbs_structure,
            standards_resolution=state.standards_resolution,
            sampling_plan=None,
            asset_specs=[],
            error=f"Sampling plan generation failed: {str(e)}"
        )

def create_sampling_planner_graph():
    """Create the sampling planner graph with persistence"""
    workflow = StateGraph(SamplingPlannerState, input=InputState, output=OutputState)

    workflow.add_node("generate_sampling_plan", generate_sampling_plan_node)

    workflow.add_edge(START, "generate_sampling_plan")
    workflow.add_edge("generate_sampling_plan", END)

    return workflow.compile(checkpointer=True)
