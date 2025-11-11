from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import logging
from agent.tools.action_graph_repo import upsertAssetsAndEdges, IdempotentAssetWriteSpec
from agent.prompts.project_details_prompt import PROJECT_DETAILS_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# LLM Configuration following V9/V10 patterns (LLM as primary, no regex)
llm = ChatGoogleGenerativeAI(
    model=os.getenv("GEMINI_MODEL_2", "gemini-2.5-pro"),
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.1,
    max_output_tokens=32768,
    include_thoughts=False,
    thinking_budget=-1,
)

class ProjectDetailsOutput(BaseModel):
    """Flat project details output with optional fields, used for structured LLM output."""
    project_name: Optional[str] = Field(default=None)
    project_code: Optional[str] = Field(default=None)
    contract_number: Optional[str] = Field(default=None)
    project_description: Optional[str] = Field(default=None)
    scope_summary: Optional[str] = Field(default=None)
    project_address: Optional[str] = Field(default=None)
    state_territory: Optional[str] = Field(default=None)
    local_council: Optional[str] = Field(default=None)
    parties: Optional[str] = Field(default=None, description='Compact JSON string for { "client":[string], "principal":[string], "parties_mentioned_in_docs":string(JSON) }')
    key_dates: Optional[Dict[str, Optional[str]]] = Field(default=None, description="{ commencement_date, practical_completion_date, defects_liability_period }")
    contract_value: Optional[str] = Field(default=None)
    procurement_method: Optional[str] = Field(default=None)
    jurisdiction: Optional[str] = Field(default=None)
    jurisdiction_code: Optional[str] = Field(default=None)
    regulatory_framework: Optional[str] = Field(default=None)
    applicable_standards: Optional[List[str]] = Field(default=None)
    html: str = Field(description="Mandatory sanitized HTML string per prompt rules")
    source_documents: Optional[List[str]] = Field(default=None, description="[uuid_string]")
    provenance: Optional[str] = Field(default=None, description="Free-form notes or compact JSON string")

class ProjectDetailsState(BaseModel):
    """Project details state driven by LLM structured extraction"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    project_details: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def _extract_project_details_node(state: ProjectDetailsState) -> ProjectDetailsState:
    """Extract consolidated project details via LLM structured output (no regex, no fallbacks)."""
    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}

        combined_content = "\n\n".join([
            f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}"
            for d in docs
        ])

        # Avoid Python str.format on prompts containing JSON braces (e.g., {"lat": ...}).
        # Use a single explicit placeholder token that we replace safely.
        placeholder = "{document_content}"
        if placeholder not in PROJECT_DETAILS_SYSTEM_PROMPT:
            raise ValueError("PROJECT_DETAILS_SYSTEM_PROMPT missing {document_content} placeholder")
        extraction_prompt = PROJECT_DETAILS_SYSTEM_PROMPT.replace(placeholder, combined_content)

        structured_llm = llm.with_structured_output(ProjectDetailsOutput)
        details_result = structured_llm.invoke(extraction_prompt)

        # Persist as single project asset (versioned, idempotent)
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="project",
            asset_subtype="project",
            name=details_result.project_name or f"Project Details - {state.project_id}",
            description=f"Project details for project {state.project_id}",
            project_id=state.project_id,
            metadata={"generator": "llm"},
            content=details_result.model_dump(),
            idempotency_key=f"project_details:{state.project_id}"
        )

        upsertAssetsAndEdges([asset_spec])

        return ProjectDetailsState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=details_result.model_dump(),
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"Project details extraction failed: {str(e)}")
        return ProjectDetailsState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            asset_specs=[],
            error=f"Project details extraction failed: {str(e)}"
        )

def create_project_details_graph():
    """Create the project details graph (now performing jurisdiction resolution)."""
    workflow = StateGraph(ProjectDetailsState, input=InputState, output=OutputState)
    workflow.add_node("extract_project_details", _extract_project_details_node)
    workflow.add_edge(START, "extract_project_details")
    workflow.add_edge("extract_project_details", END)
    #return workflow.compile(checkpointer=True)
    return workflow.compile()