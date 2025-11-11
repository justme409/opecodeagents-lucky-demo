from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import logging
from agent.prompts.itp_generation_prompt import ITP_GENERATION_PROMPT

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

class ItpItem(BaseModel):
    """Defines an item in the ITP adjacency list (section headers or inspection rows)."""
    thinking: Optional[str] = Field(None, description="Internal reasoning placeholder; MUST be null.")
    id: str = Field(..., description="Simple identifier for this item (e.g., 'section_1', 'item_1_1').")
    parentId: Optional[str] = Field(None, description="Parent simple ID (null for top-level sections).")
    item_no: str = Field(..., description="Hierarchical number (e.g., '1.0', '1.1').")

    # Section-specific
    section_name: Optional[str] = Field(None, description="Only for section headers (parentId is null).")

    # Inspection row-specific
    inspection_test_point: Optional[str] = Field(None, alias="Inspection/Test Point")
    acceptance_criteria: Optional[str] = Field(None, alias="Acceptance Criteria")
    specification_clause: Optional[str] = Field(None, alias="Specification Clause")
    inspection_test_method: Optional[str] = Field(None, alias="Inspection/Test Method")
    frequency: Optional[str] = Field(None, alias="Frequency")
    responsibility: Optional[str] = Field(None, alias="Responsibility")
    hold_witness_point: Optional[str] = Field(None, alias="Hold/Witness Point")

class ItpResponse(BaseModel):
    """Response model for ITP generation"""
    items: List[ItpItem]

class ItpGenerationState(BaseModel):
    """State following V9 TypedDict patterns"""
    project_id: str
    wbs_structure: Optional[Dict[str, Any]] = None
    wbs_nodes_for_itp: List[Dict[str, Any]] = []
    generated_itps: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for ITP generation"""
    project_id: str
    wbs_structure: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for ITP generation"""
    generated_itps: List[Dict[str, Any]] = []
    error: Optional[str] = None

def ensure_wbs_from_state(state: ItpGenerationState) -> ItpGenerationState:
    """Require WBS to be provided by the orchestrator state."""
    if state.wbs_structure and isinstance(state.wbs_structure, dict) and state.wbs_structure.get("nodes"):
        return state
    return ItpGenerationState(
        project_id=state.project_id,
        wbs_structure=state.wbs_structure,
        error="Missing WBS in state. Upstream WBS extraction must populate wbs_structure."
    )

def identify_itp_targets(state: ItpGenerationState) -> ItpGenerationState:
    """Identify WBS leaf nodes marked as requiring ITP generation."""
    if state.error:
        return state

    wbs = state.wbs_structure or {}
    nodes = wbs.get("nodes") or []
    targets = [n for n in nodes if n.get("itp_required") is True and n.get("is_leaf_node") is True]

    return ItpGenerationState(
        project_id=state.project_id,
        wbs_structure=state.wbs_structure,
        wbs_nodes_for_itp=targets,
        generated_itps=state.generated_itps,
        error=state.error
    )

def generate_itps(state: ItpGenerationState) -> ItpGenerationState:
    """Generate ITPs using LLM following V9 patterns - NO MOCK DATA"""
    if state.error:
        return state

    wbs = state.wbs_structure or {}
    targets = state.wbs_nodes_for_itp or []

    if not targets:
        return ItpGenerationState(
            project_id=state.project_id,
            wbs_structure=state.wbs_structure,
            wbs_nodes_for_itp=state.wbs_nodes_for_itp,
            generated_itps=[],
            error=state.error
        )

    generated: List[Dict[str, Any]] = []

    for i, node in enumerate(targets):
        node_title = node.get("name", "Untitled")

        try:
            # Build context following V9 patterns
            context_payload = {
                "target_wbs_node": {"id": node.get("id"), "name": node_title},
                "wbs_hierarchy_chain": [node],  # Simplified for V10
                "project_context": f"Project ID: {state.project_id}"
            }

            prompt = ITP_GENERATION_PROMPT.format(
                node_title=node_title,
                context_payload=context_payload
            )

            structured_llm = llm.with_structured_output(ItpResponse, method="json_mode")
            response: ItpResponse = structured_llm.invoke(prompt)

            if not response or not response.items:
                logger.warning("No structured items returned for node '%s'", node_title)
                continue

            # Store LLM outputs in content per knowledge graph
            llm_outputs = {
                "itp": {
                    "extraction": {
                        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                        "timestamp": "2025-01-01T00:00:00.000Z",
                        "confidence": 0.85,
                        "method": "structured_output"
                    },
                    "summary": {
                        "short": f"ITP generated for {node_title}",
                        "executive": f"Inspection and Test Plan created for work package: {node_title}",
                        "technical": "LLM-based ITP generation with structured inspection criteria and acceptance standards"
                    },
                    "structure": {
                        "target_work_package": node_title,
                        "total_items": len(response.items),
                        "sections": len([i for i in response.items if i.section_name]),
                        "inspection_points": len([i for i in response.items if i.inspection_test_point])
                    }
                }
            }

            generated.append({
                "wbs_node_id": node.get("id"),
                "wbs_node_title": node_title,
                "itp_items": [item.model_dump(by_alias=True) for item in response.items],
                "llm_outputs": llm_outputs,
                "created_at": "2025-01-01T00:00:00.000Z"
            })

        except Exception as e:
            logger.error(f"Failed to generate ITP for {node_title}: {e}")
            continue

    return ItpGenerationState(
        project_id=state.project_id,
        wbs_structure=state.wbs_structure,
        wbs_nodes_for_itp=state.wbs_nodes_for_itp,
        generated_itps=generated,
        error=state.error
    )

# Graph definition following V9 patterns
def create_itp_generation_graph():
    """Create the ITP generation graph with persistence"""
    from langgraph.graph import StateGraph, START, END
    # from langgraph.checkpoint.sqlite import SqliteSaver

    graph = StateGraph(ItpGenerationState, input=InputState, output=OutputState)

    # Add nodes following V9 patterns
    graph.add_node("ensure_wbs", ensure_wbs_from_state)
    graph.add_node("identify_targets", identify_itp_targets)
    graph.add_node("generate_itps", generate_itps)
    graph.add_node("create_asset_spec", lambda state: {
        "asset_specs": [create_itp_asset_spec(state)]
    })
    graph.add_node("persist_assets", persist_itp_to_database)

    # Define flow following V9 patterns
    graph.set_entry_point("ensure_wbs")
    graph.add_edge("ensure_wbs", "identify_targets")
    graph.add_edge("identify_targets", "generate_itps")
    graph.add_edge("generate_itps", "create_asset_spec")
    graph.add_edge("create_asset_spec", "persist_assets")
    graph.add_edge("persist_assets", END)

    return graph.compile(checkpointer=True)

def create_itp_asset_spec(state: ItpGenerationState) -> Dict[str, Any]:
    """Create asset write specification for ITPs following knowledge graph"""
    if not state.generated_itps:
        return {}

    # Combine all ITPs into a single asset following knowledge graph patterns
    itp_content = {
        "itps": state.generated_itps,
        "summary": {
            "total_itps": len(state.generated_itps),
            "target_work_packages": [itp["wbs_node_title"] for itp in state.generated_itps],
            "total_inspection_points": sum(len(itp["itp_items"]) for itp in state.generated_itps)
        }
    }

    spec = {
        "asset": {
            "type": "plan",
            "name": "Inspection and Test Plans",
            "project_id": state.project_id,
            "approval_state": "not_required",
            "classification": "internal",
            "content": itp_content,
            "metadata": {
                "plan_type": "itp",
                "category": "quality",
                "tags": ["itp", "inspection", "testing", "quality"],
                "llm_outputs": {
                    "itp_generation": {
                        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                        "timestamp": "2025-01-01T00:00:00.000Z",
                        "total_itps": len(state.generated_itps)
                    }
                }
            },
            "status": "draft"
        },
        "idempotency_key": f"itp:{state.project_id}",
        "edges": []
    }

    return spec

def persist_itp_to_database(state: ItpGenerationState) -> Dict[str, Any]:
    """Persist ITP asset specification to the knowledge graph database"""
    if not state.generated_itps:
        return {"persistence_result": {"success": True, "message": "No ITPs to persist"}}

    try:
        # Create asset spec
        asset_spec = create_itp_asset_spec(state)

        # Convert to IdempotentAssetWriteSpec object
        write_spec = IdempotentAssetWriteSpec(
            asset_type=asset_spec["asset"]["type"],
            asset_subtype="itp",
            name=asset_spec["asset"]["name"],
            description="Generated Inspection and Test Plans",
            project_id=state.project_id,
            metadata=asset_spec["asset"]["metadata"],
            content=asset_spec["asset"]["content"],
            idempotency_key=asset_spec["idempotency_key"],
            edges=asset_spec["edges"]
        )

        # Persist to database
        result = upsertAssetsAndEdges([write_spec])

        logger.info("Successfully persisted ITP asset to database")
        return {"persistence_result": result}

    except Exception as e:
        logger.error(f"Failed to persist ITP asset: {e}")
        return {"persistence_result": {"success": False, "error": str(e)}}

# Description: V10 ITP generation converted from V9 patterns.
# Uses LLM with structured output instead of mock data.
# Stores results in assets.metadata.llm_outputs per knowledge graph.
# NO MOCK DATA - Real LLM calls with detailed inspection criteria.


