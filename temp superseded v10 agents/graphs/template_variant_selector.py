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

class TemplateSelection(BaseModel):
    """Pydantic model for template selection"""
    selected_templates: List[Dict[str, Any]] = Field(description="List of selected templates with reasons")
    template_category: str = Field(description="Primary template category (e.g., construction, engineering, management)")
    customization_requirements: List[str] = Field(description="Required customizations for selected templates")
    compliance_mappings: Dict[str, List[str]] = Field(description="How templates map to compliance requirements")
    risk_considerations: List[str] = Field(description="Risk factors considered in template selection")
    confidence_score: float = Field(description="Confidence in template selection (0-1)")

class TemplateVariant(BaseModel):
    """Individual template variant"""
    template_id: str = Field(description="Template identifier")
    template_name: str = Field(description="Human-readable template name")
    template_type: str = Field(description="Type of template (document, plan, checklist, etc.)")
    applicability_score: float = Field(description="How well this template fits the project (0-1)")
    selection_reason: str = Field(description="Why this template was selected")
    customization_notes: List[str] = Field(description="Required customizations")

class TemplateSelectorState(BaseModel):
    """State for template selection following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    wbs_structure: Optional[Dict[str, Any]] = None
    standards_from_project_documents: List[Dict[str, Any]] = []
    template_selection: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for template selection"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    wbs_structure: Optional[Dict[str, Any]] = None
    standards_from_project_documents: List[Dict[str, Any]] = []

class OutputState(BaseModel):
    """Output state for template selection"""
    template_selection: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def select_templates_node(state: TemplateSelectorState) -> TemplateSelectorState:
    """Select appropriate templates using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.get("txt_project_documents", []) or []
        project_details = state.get("project_details", {}) or {}
        wbs = state.get("wbs_structure", {}) or {}
        standards = state.get("standards_from_project_documents", []) or []

        combined_content = "\n\n".join([
            f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in docs
        ])

        standards_text = "\n".join([
            f"- {s.get('standard_code', '')}: {s.get('spec_name', '')}"
            for s in standards
        ])

        # LLM prompt for template selection
        template_prompt = f"""
        Analyze the following project information and select the most appropriate templates for documentation, plans, and compliance requirements.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        WORK BREAKDOWN STRUCTURE:
        {wbs.get('description', 'Not provided')}

        APPLICABLE STANDARDS:
        {standards_text}

        DOCUMENT CONTENT:
        {combined_content}

        Based on Australian construction industry standards, select appropriate templates for:

        1. DOCUMENT TEMPLATES: Contract documents, specifications, reports
        2. MANAGEMENT PLAN TEMPLATES: Quality, safety, environmental plans
        3. COMPLIANCE TEMPLATES: Checklists, registers, audit forms
        4. TECHNICAL TEMPLATES: Drawings, calculations, certifications

        Consider:
        - Project complexity and risk level
        - Jurisdictional requirements
        - Industry best practices
        - Compliance obligations
        - Document management needs

        Provide template selections with detailed reasoning and customization requirements.
        """

        # Create structured LLM for template selection
        template_selection_prompt = f"""
        Based on the project analysis above, select specific templates from this list:

        AVAILABLE TEMPLATES:
        - Contract Administration Template
        - Quality Management Plan Template
        - Work Health Safety Management Plan Template
        - Environmental Management Plan Template
        - Traffic Management Plan Template
        - Construction Management Plan Template
        - Inspection and Test Plan Template
        - Non-Conformance Report Template
        - Daily Inspection Checklist Template
        - Material Compliance Certificate Template
        - As-Built Documentation Template
        - Commissioning Plan Template

        For each selected template, provide:
        1. Template name and ID
        2. Applicability score (0-1)
        3. Selection reasoning
        4. Required customizations
        """

        # Get initial analysis
        analysis_response = llm.invoke(template_prompt)

        # Get structured template selection
        class TemplateSelectionResponse(BaseModel):
            selections: List[TemplateVariant] = Field(description="Selected templates with details")
            category: str = Field(description="Primary template category")
            customizations: List[str] = Field(description="General customization requirements")
            compliance_mapping: Dict[str, List[str]] = Field(description="Compliance to template mapping")
            risk_factors: List[str] = Field(description="Risk factors considered")

        structured_llm = llm.with_structured_output(TemplateSelectionResponse)
        template_result = structured_llm.invoke(template_selection_prompt)

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "template_selection": {
                "analysis": analysis_response.content,
                "selected_templates": [t.model_dump() for t in template_result.selections],
                "category": template_result.category,
                "customizations": template_result.customizations,
                "compliance_mapping": template_result.compliance_mapping,
                "risk_factors": template_result.risk_factors,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for template selection
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="analysis",
            asset_subtype="template_selection",
            name=f"Template Selection - {template_result.category}",
            description=f"Template selection analysis for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "analysis_type": "template_selection",
                "template_category": template_result.category,
                "selected_templates_count": len(template_result.selections),
                "customization_requirements": template_result.customizations,
                "compliance_mappings": template_result.compliance_mapping,
                "risk_considerations": template_result.risk_factors,
                "llm_outputs": llm_outputs
            },
            content={
                "template_analysis": analysis_response.content,
                "selected_templates": [t.model_dump() for t in template_result.selections],
                "source_documents": [d.get('id') for d in docs if d.get('id')]
            },
            idempotency_key=f"template_selection:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return TemplateSelectorState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.get("project_details", {}),
            wbs_structure=state.get("wbs_structure", {}),
            standards_from_project_documents=state.get("standards_from_project_documents", []),
            template_selection={
                "selected_templates": [t.model_dump() for t in template_result.selections],
                "category": template_result.category,
                "customizations": template_result.customizations,
                "compliance_mapping": template_result.compliance_mapping,
                "risk_factors": template_result.risk_factors
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"Template selection failed: {str(e)}")
        return TemplateSelectorState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.get("project_details", {}),
            wbs_structure=state.get("wbs_structure", {}),
            standards_from_project_documents=state.get("standards_from_project_documents", []),
            template_selection=None,
            asset_specs=[],
            error=f"Template selection failed: {str(e)}"
        )

def create_template_variant_selector_graph():
    """Create the template variant selector graph with persistence"""
    workflow = StateGraph(TemplateSelectorState, input=InputState, output=OutputState)

    workflow.add_node("select_templates", select_templates_node)

    workflow.add_edge(START, "select_templates")
    workflow.add_edge("select_templates", END)

    return workflow.compile(checkpointer=True)
