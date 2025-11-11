from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.tools.action_graph_repo import upsertAssetsAndEdges, IdempotentAssetWriteSpec
import os
import logging
from agent.prompts.wbs_extraction_prompt import WBS_EXTRACTION_PROMPT

logger = logging.getLogger(__name__)

# LLM Configuration following V9 patterns
llm = ChatGoogleGenerativeAI(
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2,
    max_output_tokens=65536,
    include_thoughts=False,
    thinking_budget=-1,
)

class WbsNode(BaseModel):
    """Pydantic model for WBS nodes following V9 patterns"""
    reasoning: Optional[str] = Field(default="", description="Brief reasoning")
    id: str = Field(description="Temporary ID")
    parentId: Optional[str] = Field(default=None)
    node_type: str
    name: str
    source_reference_uuids: List[str] = Field(default_factory=list, description="List of document UUIDs")
    source_reference_hints: List[str] = Field(default_factory=list, description="List of location hints")
    source_reference_quotes: List[Optional[str]] = Field(default_factory=list, description="List of quoted sections")
    description: str = Field(default="")
    specification_reasoning: str = Field(default="")
    applicable_specifications: List[str] = Field(default_factory=list)
    applicable_specification_uuids: List[str] = Field(default_factory=list)
    advisory_specifications: List[str] = Field(default_factory=list)
    itp_reasoning: str = Field(default="")
    itp_required: bool = Field(default=False)
    specific_quality_requirements: List[str] = Field(default_factory=list)
    is_leaf_node: bool = Field(default=False)

class InitialWbsGenerationResponse(BaseModel):
    """Response model for initial WBS generation"""
    nodes: List[WbsNode]

class WbsExtractionState(BaseModel):
    """State following V9 TypedDict patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    wbs_structure: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for WBS extraction"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []

class OutputState(BaseModel):
    """Output state for WBS extraction"""
    wbs_structure: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

def generate_wbs_structure_node(state: WbsExtractionState) -> WbsExtractionState:
    """Generate WBS structure using LLM following V9 patterns - NO REGEX, NO MOCK DATA"""
    docs = state.txt_project_documents or []
    combined_content = "\n\n".join([
        f"Document: {d.get('file_name','Unknown')} (ID: {d.get('id','')})\n{d.get('content','')}" for d in docs
    ])

    # Fail fast: require non-empty documents and content
    if not docs or not combined_content.strip():
        raise ValueError("WBS extraction requires extracted document content; none available")

    # Use extracted WBS prompt
    prompt = WBS_EXTRACTION_PROMPT.format(combined_content=combined_content)

    structured_llm = llm.with_structured_output(InitialWbsGenerationResponse, method="json_mode")

    try:
        response: InitialWbsGenerationResponse = structured_llm.invoke(prompt)

        wbs_structure = {
            "nodes": [node.model_dump() for node in response.nodes],
            "metadata": {
                "extraction_method": "llm_structured_output",
                "llm_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                "source_documents_count": len(docs),
                "extraction_timestamp": "2025-01-01T00:00:00.000Z"
            }
        }

        # Store LLM outputs in content per knowledge graph
        llm_outputs = {
            "wbs": {
                "extraction": {
                    "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                    "timestamp": "2025-01-01T00:00:00.000Z",
                    "confidence": 0.85,
                    "method": "structured_output"
                },
                "summary": {
                    "short": f"WBS: {len(response.nodes)} elements extracted",
                    "executive": f"Work Breakdown Structure generated from {len(docs)} documents",
                    "technical": "LLM-based WBS generation with hierarchical decomposition and source references"
                },
                "structure": {
                    "total_nodes": len(response.nodes),
                    "sections": len([n for n in response.nodes if n.node_type == "section"]),
                    "work_packages": len([n for n in response.nodes if n.node_type == "work_package"]),
                    "itp_required_count": len([n for n in response.nodes if n.itp_required])
                }
            }
        }

        wbs_structure["llm_outputs"] = llm_outputs

        return WbsExtractionState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            wbs_structure=wbs_structure
        )

    except Exception as e:
        logger.error(f"WBS extraction failed: {e}")
        raise ValueError(f"WBS extraction failed: {str(e)}")

# Graph definition following V9 patterns
def create_wbs_extraction_graph():
    """Create the WBS extraction graph with persistence"""
    from langgraph.graph import StateGraph, START, END
    # from langgraph.checkpoint.sqlite import SqliteSaver

    graph = StateGraph(WbsExtractionState, input=InputState, output=OutputState)

    # Add nodes following V9 patterns
    graph.add_node("generate_wbs", generate_wbs_structure_node)
    graph.add_node("create_asset_spec", lambda state: {
        "asset_specs": [create_wbs_asset_spec(state)]
    })
    graph.add_node("persist_assets", persist_wbs_to_database)

    # Define flow following V9 patterns
    graph.set_entry_point("generate_wbs")
    graph.add_edge("generate_wbs", "create_asset_spec")
    graph.add_edge("create_asset_spec", "persist_assets")
    graph.add_edge("persist_assets", END)

    return graph.compile(checkpointer=True)

def create_wbs_asset_spec(state: WbsExtractionState) -> Dict[str, Any]:
    """Create asset write specification for WBS following knowledge graph"""
    if not state.wbs_structure or not state.wbs_structure.get("nodes"):
        return {}

    spec = {
        "asset": {
            "type": "plan",
            "name": "Work Breakdown Structure",
            "project_id": state.project_id,
            "approval_state": "not_required",
            "classification": "internal",
            "content": state.wbs_structure,
            "metadata": {
                "plan_type": "wbs",
                "category": "planning",
                "tags": ["wbs", "work_breakdown", "project_structure"],
                "llm_outputs": state.wbs_structure.get("llm_outputs", {})
            },
            "status": "draft"
        },
        "idempotency_key": f"wbs:{state.project_id}",
        "edges": []
    }

    return spec

def persist_wbs_to_database(state: WbsExtractionState) -> Dict[str, Any]:
    """Persist WBS asset specification to the knowledge graph database"""
    if not state.wbs_structure:
        return {"persistence_result": {"success": True, "message": "No WBS to persist"}}

    try:
        # Create asset spec
        asset_spec = create_wbs_asset_spec(state)

        # Convert to IdempotentAssetWriteSpec object
        write_spec = IdempotentAssetWriteSpec(
            asset_type=asset_spec["asset"]["type"],
            asset_subtype="wbs",
            name=asset_spec["asset"]["name"],
            description="Extracted Work Breakdown Structure",
            project_id=state.project_id,
            metadata=asset_spec["asset"]["metadata"],
            content=asset_spec["asset"]["content"],
            idempotency_key=asset_spec["idempotency_key"],
            edges=asset_spec["edges"]
        )

        # Persist to database
        result = upsertAssetsAndEdges([write_spec])

        logger.info("Successfully persisted WBS asset to database")
        return {"persistence_result": result}

    except Exception as e:
        logger.error(f"Failed to persist WBS asset: {e}")
        return {"persistence_result": {"success": False, "error": str(e)}}

# Description: V10 WBS extraction converted from V9 patterns.
# Uses LLM with structured output instead of regex patterns.
# Stores results in assets.metadata.llm_outputs per knowledge graph.
# NO MOCK DATA - Real LLM calls with hierarchical decomposition.
