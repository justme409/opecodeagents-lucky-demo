import os
import re
import json
from typing_extensions import TypedDict
from typing import List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from langchain_xai import ChatXAI
from agent.prompts.itp_generation_prompt_v2 import (
    CONSOLIDATED_ITP_PROMPT_V2,
    ITP_EXTRACTION_PROMPT,
    INSPECTION_POINTS_EXTRACTION_PROMPT
)

# Simple standards matching prompt with jurisdiction focus
SIMPLE_STANDARDS_PROMPT = """
You are an expert in Australian construction standards matching, specializing in jurisdiction-specific requirements.

**CRITICAL MATCHING RULES:**

1. **JURISDICTION IS PRIMARY**: Each Australian state/territory has its own standard packs:
   - QLD (Queensland) - Use QLD-specific standards only
   - NSW (New South Wales) - Use NSW-specific standards only
   - TAS (Tasmania) - Use TAS-specific standards only
   - SA (South Australia) - Use SA-specific standards only
   - VIC (Victoria) - Use VIC-specific standards only
   - WA (Western Australia) - Use WA-specific standards only
   - NT (Northern Territory) - Use NT-specific standards only
   - ACT (Australian Capital Territory) - Use ACT-specific standards only
   - National/Australia-wide standards - Can apply to multiple jurisdictions

2. **LOOK FOR JURISDICTION MATCHES FIRST**: The jurisdiction field shows the jurisdiction. Prioritize standards that match the project's jurisdiction.

3. **BE SPECIFIC**: Most ITPs will only need 1-2 standards from their jurisdiction's standard pack. It's rarely more than that.

4. **PROJECT CONTEXT**: Consider what type of project this is and match standards accordingly.

**Project Jurisdiction:** {project_jurisdiction}

**Required ITPs:**
{required_itps_text}

**Available Standards:**
{standards_list}

**MATCHING PROCESS:**
1. Look at each ITP name and type to understand what it covers
2. Check the jurisdiction field in each standard to see its jurisdiction (QLD, NSW, TAS, SA, VIC, WA, NT, ACT, or National)
3. Match the ITP to standards from the SAME jurisdiction first
4. If no perfect jurisdiction match, consider national standards as secondary options
5. For most ITPs, only 1 standard is needed - the most directly applicable one from the correct jurisdiction
6. Example: A "Concrete Works" ITP in South Australia should primarily use SA standards, not NSW or QLD standards

**Task:**
For each ITP, suggest which standards from the available list would apply to it.
Return pairs in this format:
[
  {{
    "itp_name": "Name of the ITP (use exact name from required ITPs)",
    "applicable_standards": ["uuid1", "uuid2"],  // Usually just 1-2 UUIDs max
    "reasoning": "Brief explanation of why these standards apply, including jurisdiction match"
  }}
]

**IMPORTANT:**
- Only use standards that exist in the Available Standards list
- Only include UUIDs in the applicable_standards array
- Prioritize jurisdiction matches
- Be conservative - fewer standards per ITP is better than too many
- Each ITP typically needs just 1-2 standards maximum
- Focus on the most directly applicable standards from the correct jurisdiction
"""
from agent.tools.db_tools import (
    fetch_reference_documents_by_jurisdiction,
    fetch_standard_document_content,
)
from agent.tools.action_graph_repo import (
    IdempotentAssetWriteSpec,
    upsertAssetsAndEdges,
)

# Validate required environment variables
if not os.getenv("XAI_API_KEY"):
    raise ValueError("XAI_API_KEY environment variable is required")

# Initialize xAI ChatXAI model with improved configuration
llm = ChatXAI(
    model=os.getenv("XAI_MODEL", "grok-beta"),
    api_key=os.getenv("XAI_API_KEY"),
    temperature=0.1,  # Lower temperature for more consistent structured output
    max_tokens=65536,
    timeout=120,  # Add reasonable timeout
    max_retries=3,  # Increase retries for better reliability
    # Disable parallel tool calls to prevent issues
    extra_body={"parallel_tool_calls": False},
)

# Output models
class StandardsMatchingOutput(BaseModel):
    itp_standards_pairs: List[Dict[str, Any]]  # Now includes reasoning in each pair
    reasoning: str

class RequiredItp(BaseModel):
    itp_name: str
    scope: Optional[str] = None
    triggering_documents: Optional[str] = None
    priority: Optional[str] = None
    estimated_items: Optional[int] = None
    # Numbering fields captured in identification step
    itp_number: str
    revision_code: Optional[str] = None

class ITPListOutput(BaseModel):
    required_itps: List[RequiredItp]
    reasoning: str

class InspectionPoint(BaseModel):
    point_description: str
    acceptance_criteria: str
    test_method: str
    frequency: str
    hold_witness: str  # "HOLD", "WITNESS", or "NONE"
    responsibility: str
    standard_reference: str

class InspectionPointsOutput(BaseModel):
    reasoning: str  # Moved to top as requested
    itp_inspection_points: List[Dict[str, Any]]  # Each ITP with its points
    # Expected structure for each point in itp_inspection_points:
    # {
    #   "itp_name": "string",
    #   "inspection_points": [
    #     {
    #       "point_description": "string",
    #       "acceptance_criteria": "string",
    #       "test_method": "string",
    #       "frequency": "string",
    #       "hold_witness": "HOLD|WITNESS|NONE",
    #       "responsibility": "string",
    #       "standard_reference": "string"
    #     }
    #   ]
    # }

class ITPItem(BaseModel):
    thinking: Optional[str] = None  # Must be null
    id: str
    parentId: Optional[str] = None
    type: str  # "section" or "inspection"
    item_no: str
    order_index: int
    section_name: Optional[str] = None
    inspection_test_point: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    specification_clause: Optional[str] = None
    inspection_test_method: Optional[str] = None
    frequency: Optional[str] = None
    responsibility: Optional[str] = None
    hold_witness_point: Optional[str] = None

class ITPItemsOutput(BaseModel):
    itp_items: List[ITPItem]  # Must be array of ITPItem objects, not dicts
    # Expected structure: Array of ITPItem objects with these fields:
    # - thinking: null (always)
    # - id: string identifier
    # - parentId: null for sections, parent id for items
    # - type: "section" or "inspection"
    # - item_no: hierarchical number (1.0, 1.1, 2.0, etc.)
    # - order_index: integer for sorting
    # - section_name: name for sections only
    # - inspection_test_point: description for inspection items
    # - acceptance_criteria: pass/fail criteria
    # - specification_clause: referenced clause
    # - inspection_test_method: how to perform
    # - frequency: how often
    # - responsibility: who performs
    # - hold_witness_point: H/W classification

def _to_serializable(value: Any) -> Any:
    """Convert Pydantic models and nested structures to plain Python types for JSON serialization."""
    if isinstance(value, BaseModel):
        try:
            # Pydantic v2
            return value.model_dump()
        except Exception:
            # Pydantic v1
            return value.dict()
    if isinstance(value, list):
        return [_to_serializable(v) for v in value]
    if isinstance(value, dict):
        return {k: _to_serializable(v) for k, v in value.items()}
    return value

def _slugify(text: str) -> str:
    """Create a conservative slug suitable for use as a document_number."""
    if not text:
        return "unknown"
    text = text.strip().lower()
    # Replace non-alphanumeric with dashes
    text = re.sub(r"[^a-z0-9]+", "-", text)
    # Trim dashes
    text = text.strip('-')
    # Collapse multiple dashes
    text = re.sub(r"-+", "-", text)
    return text or "unknown"

def _standard_jurisdiction(jurisdiction: Optional[str]) -> str:
    """Return normalized jurisdiction for a standard; default to NATIONAL when missing/unknown.

    Note: With upstream providing Strict jurisdiction_code, this is only used when
    inspecting DB values for classification and should be very conservative.
    """
    if not jurisdiction:
        return "NATIONAL"
    v = str(jurisdiction).strip().lower()
    mapping = {
        "queensland": "QLD",
        "new south wales": "NSW",
        "tasmania": "TAS",
        "south australia": "SA",
        "victoria": "VIC",
        "western australia": "WA",
        "northern territory": "NT",
        "australian capital territory": "ACT",
    }
    if v in mapping:
        return mapping[v]
    if v in {"qld","nsw","tas","sa","vic","wa","nt","act"}:
        return v.upper()
    if v.startswith("australia"):
        return "NATIONAL"
    return "NATIONAL"

class ITPGenerationState(TypedDict):
    project_id: str
    pqp_content: Optional[str]
    txt_project_documents: List[Dict[str, Any]]
    project_jurisdiction: Optional[str]
    required_itps: Optional[List[Dict[str, Any]]]
    itp_standards_pairs: Optional[List[Dict[str, Any]]]
    applicable_standard_documents: Optional[List[Dict[str, Any]]]
    inspection_points: Optional[List[Dict[str, Any]]]
    current_itp_index: Optional[int]
    current_generation_index: Optional[int]
    individual_itp_items: Optional[List[Dict[str, Any]]]
    final_itp_items: Optional[List[Dict[str, Any]]]
    error: Optional[str]

class InputState(TypedDict):
    project_id: str
    pqp_content: Optional[str]
    txt_project_documents: List[Dict[str, Any]]
    project_jurisdiction: Optional[str]
    project_details: Optional[Dict[str, Any]]

class OutputState(TypedDict):
    required_itps: List[Dict[str, Any]]
    itp_standards_pairs: List[Dict[str, Any]]
    reasoning: Optional[str]
    final_itp_items: Optional[List[Dict[str, Any]]]
    individual_itp_items: Optional[List[Dict[str, Any]]]
    inspection_points: Optional[List[Dict[str, Any]]]
    error: Optional[str]

def fetch_docs_node(state: InputState) -> ITPGenerationState:
    """Fetch and validate project documents."""
    if not state.get("txt_project_documents"):
        return {**state, "error": "txt_project_documents missing; provide extracted documents upstream"}
    # Derive jurisdiction from orchestrator state when not provided directly
    pj = state.get("project_jurisdiction")
    if not pj:
        details = state.get("project_details") or {}
        pj = details.get("jurisdiction_code")
    return {
        "project_id": state["project_id"],
        "pqp_content": state.get("pqp_content"),
        "txt_project_documents": state["txt_project_documents"],
        "project_jurisdiction": pj,
        "error": None
    }


def extract_required_itps_node(state: ITPGenerationState) -> ITPGenerationState:
    """Extract list of required ITPs from PQP and project documents."""
    try:
        # Prepare context from PQP and project documents
        docs_text = "\n\n".join([
            f"Document: {d['file_name']} (ID: {d['id']})\n{d['content']}"
            for d in state["txt_project_documents"]
        ])

        pqp_text = state.get("pqp_content", "No PQP content provided")

        # Create extraction prompt
        extraction_prompt = f"""
{ITP_EXTRACTION_PROMPT}

**PROJECT QUALITY PLAN (PQP):**
{pqp_text}

**PROJECT DOCUMENTS:**
{docs_text}

Analyze the above information and extract all required ITPs for this project.
"""

        # Get structured output using json_schema method for better reliability
        try:
            structured_llm = llm.with_structured_output(ITPListOutput, method="json_schema")
            response = structured_llm.invoke(extraction_prompt)
        except Exception as e:
            return {**state, "error": f"Failed to get structured output from LLM: {str(e)}"}

        # Convert pydantic objects to dict for downstream use
        required_list = []
        for ri in response.required_itps:
            try:
                required_list.append(ri.model_dump())
            except Exception:
                required_list.append(dict(ri))

        return {
            **state,
            "required_itps": required_list,
            "error": None
        }

    except Exception as e:
        return {
            **state,
            "error": f"Failed to extract required ITPs: {str(e)}"
        }

def match_standards_to_itps_node(state: ITPGenerationState) -> ITPGenerationState:
    """Simple standards matching: match standards to ITPs."""
    try:
        if not state.get("required_itps"):
            return {**state, "error": "No required ITPs available"}

        # Fail fast if jurisdiction is missing
        project_juris = state.get("project_jurisdiction")
        if not project_juris:
            return {**state, "error": "Missing project_jurisdiction in state; ensure project details extraction populated it"}

        # Get jurisdiction-filtered standards directly from DB tool
        filtered = fetch_reference_documents_by_jurisdiction.invoke({"project_jurisdiction": project_juris})

        # Format standards list for the prompt (filtered only)
        standards_list = []
        for std in filtered:
            standards_list.append({
                "id": std.get("id"),
                "spec_id": std.get("spec_id"),
                "spec_name": std.get("spec_name"),
                "jurisdiction": std.get("jurisdiction"),
                "synopsis": std.get("synopsis", "No synopsis available")
            })

        # Format required ITPs
        required_itps_text = json.dumps(state["required_itps"], indent=2)

        # Create simple prompt with project context
        project_context = ""
        if state.get("pqp_content"):
            project_context = f"\n**Project Context from PQP:**\n{state['pqp_content'][:1000]}..."

        prompt = SIMPLE_STANDARDS_PROMPT.format(
            standards_list=json.dumps(standards_list, indent=2),
            required_itps_text=required_itps_text,
            project_jurisdiction=project_juris
        ) + project_context

        # Get structured output
        structured_llm = llm.with_structured_output(StandardsMatchingOutput, method="json_schema")
        response = structured_llm.invoke(prompt)

        # Extract the pairs and overall reasoning
        itp_standards_pairs = response.itp_standards_pairs
        overall_reasoning = response.reasoning

        # Fetch the actual standard documents that we'll need for inspection points extraction
        # The LLM returns UUIDs (our reference_documents.id). We need to map to spec_id for content fetch.
        all_uuids = []
        for pair in itp_standards_pairs:
            all_uuids.extend(pair.get("applicable_standards", []))

        # Build a map from uuid -> spec_id using the standards_list we constructed above
        uuid_to_spec_id = {std["id"]: std["spec_id"] for std in standards_list}
        spec_ids = [uuid_to_spec_id.get(u) for u in all_uuids if uuid_to_spec_id.get(u)]

        standard_documents = []
        if spec_ids:
            standard_documents = fetch_standard_document_content.invoke({"spec_ids": spec_ids})

        # Also attach mapped spec_ids on each pair to simplify later filtering
        if itp_standards_pairs:
            for pair in itp_standards_pairs:
                uuids = pair.get("applicable_standards", [])
                pair["applicable_spec_ids"] = [uuid_to_spec_id.get(u) for u in uuids if uuid_to_spec_id.get(u)]

        return {
            **state,
            "itp_standards_pairs": itp_standards_pairs,
            "applicable_standard_documents": standard_documents,
            "error": None
        }

    except Exception as e:
        return {**state, "error": f"Failed to match standards: {str(e)}"}

def extract_inspection_points_node(state: ITPGenerationState) -> ITPGenerationState:
    """Extract inspection points for each ITP individually, looping through all ITPs."""
    try:
        if not state.get("required_itps"):
            return {**state, "error": "Missing required ITPs for inspection point extraction"}

        if not state.get("itp_standards_pairs"):
            return {**state, "error": "Missing ITP-standards pairs for inspection point extraction"}

        if not state.get("applicable_standard_documents"):
            return {**state, "error": "No standard documents available for inspection point extraction"}

        # Get current ITP index or start from 0
        current_index = state.get("current_itp_index", 0)
        required_itps = state["required_itps"]
        itp_standards_pairs = state["itp_standards_pairs"]
        standard_documents = state["applicable_standard_documents"]

        # Safety check: prevent infinite loops
        if current_index > len(required_itps):
            return {**state, "error": f"ITP index {current_index} exceeds required ITPs count {len(required_itps)}"}

        # Check if we've processed all ITPs
        if current_index >= len(required_itps):
            # All ITPs processed, return current state for next step
            return state

        current_itp = required_itps[current_index]

        # Find the standards for this ITP (prefer mapped spec_ids)
        current_itp_standards = []
        for pair in itp_standards_pairs:
            if pair.get("itp_name") == current_itp.get("itp_name"):
                current_itp_standards = pair.get("applicable_spec_ids") or pair.get("applicable_standards", [])
                break

        if not current_itp_standards:
            print(f"No standards found for ITP: {current_itp.get('itp_name', 'Unknown')}")
            # Move to next ITP even if no standards found for this one
            next_index = current_index + 1
            return {
                **state,
                "current_itp_index": next_index,
                "error": None
            }

        # Filter standard documents for this ITP
        relevant_documents = []
        for doc in standard_documents:
            if doc["spec_id"] in current_itp_standards:
                relevant_documents.append(doc)

        if not relevant_documents:
            # If no content found, still advance the index so the loop continues
            next_index = current_index + 1
            return {
                **state,
                "current_itp_index": next_index,
                "error": None
            }

        # Format standard documents for prompt
        standards_text = ""
        for doc in relevant_documents:
            standards_text += f"Standard: {doc['spec_name']} ({doc['spec_id']})\n{doc['content']}\n\n"

        # Prepare context for this specific ITP
        docs_text = "\n\n".join([
            f"Document: {d['file_name']} (ID: {d['id']})\n{d['content']}"
            for d in state["txt_project_documents"]
        ])

        # Create inspection points extraction prompt for this specific ITP
        inspection_prompt = f"""
{INSPECTION_POINTS_EXTRACTION_PROMPT}

**CURRENT ITP TO PROCESS:**
{json.dumps(current_itp, indent=2)}

**RELEVANT STANDARDS FOR THIS ITP:**
{standards_text}

**PROJECT DOCUMENTS:**
{docs_text}

Extract detailed inspection points, hold points, witness points, and associated conditions for this specific ITP based on the relevant standard documents provided.
"""

        # Get structured output using json_schema method (best for xAI)
        try:
            structured_llm = llm.with_structured_output(InspectionPointsOutput, method="json_schema")
            response = structured_llm.invoke(inspection_prompt)
        except Exception as e:
            return {**state, "error": f"Failed to get structured output from LLM: {str(e)}"}

        # Get existing inspection points or initialize
        existing_points = state.get("inspection_points", [])

        # Add the new inspection points for this ITP
        if response.itp_inspection_points:
            # Normalize to ensure each entry has itp_name and non-empty inspection_points
            normalized = []
            for block in response.itp_inspection_points:
                block_itp_name = block.get("itp_name") or current_itp.get("itp_name", "Unknown")
                points_list = block.get("inspection_points") or []
                if points_list:
                    normalized.append({
                        "itp_name": block_itp_name,
                        "inspection_points": points_list
                    })
            existing_points.extend(normalized)

        # Move to next ITP
        next_index = current_index + 1

        return {
            **state,
            "inspection_points": existing_points,
            "current_itp_index": next_index,
            "error": None
        }

    except Exception as e:
        return {
            **state,
            "error": f"Failed to extract inspection points: {str(e)}"
        }


def generate_individual_itp_node(state: ITPGenerationState) -> ITPGenerationState:
    """Generate individual ITPs for each ITP type, looping through all ITPs."""
    try:
        if not state.get("inspection_points"):
            return {**state, "error": "No inspection points available for ITP generation"}

        if not state.get("required_itps"):
            return {**state, "error": "No required ITPs available for ITP generation"}

        # Get current generation index or start from 0
        current_index = state.get("current_generation_index", 0)
        required_itps = state["required_itps"]

        # Safety check: prevent infinite loops
        if current_index > len(required_itps):
            return {**state, "error": f"Generation index {current_index} exceeds required ITPs count {len(required_itps)}"}

        # Check if we've generated all individual ITPs
        if current_index >= len(required_itps):
            # All individual ITPs generated, return current state for final consolidation
            return state

        current_itp = required_itps[current_index]

        # Filter inspection points for this specific ITP
        all_inspection_points = state["inspection_points"]
        filtered_points = []

        # Flatten blocks into individual point rows with itp_name
        for block in all_inspection_points:
            if block.get("itp_name") == current_itp.get("itp_name"):
                for p in block.get("inspection_points", []):
                    row = {
                        "itp_name": block.get("itp_name"),
                        "point_description": p.get("point_description"),
                        "acceptance_criteria": p.get("acceptance_criteria"),
                        "test_method": p.get("test_method"),
                        "frequency": p.get("frequency"),
                        "hold_witness": p.get("hold_witness"),
                        "responsibility": p.get("responsibility"),
                        "standard_reference": p.get("standard_reference")
                    }
                    filtered_points.append(row)

        if not filtered_points:
            print(f"No inspection points found for ITP: {current_itp.get('itp_name', 'Unknown')}")
            # Move to next ITP even if no points found for this one
            next_index = current_index + 1
            return {
                **state,
                "current_generation_index": next_index,
                "error": None
            }

        # Prepare context for individual ITP generation
        pqp_text = state.get("pqp_content", "No PQP content provided")
        docs_text = "\n\n".join([
            f"Document: {d['file_name']} (ID: {d['id']})\n{d['content']}"
            for d in state["txt_project_documents"]
        ])

        # Create individual ITP generation prompt
        individual_prompt = f"""
{CONSOLIDATED_ITP_PROMPT_V2}

**PROJECT QUALITY PLAN (PQP):**
{pqp_text}

**CURRENT ITP TO GENERATE:**
{json.dumps(current_itp, indent=2)}

**RELEVANT INSPECTION POINTS FOR THIS ITP:**
{json.dumps(filtered_points, indent=2)}

**PROJECT DOCUMENTS:**
{docs_text}

Generate a complete Inspection and Test Plan for the specific ITP type above. Include only the inspection points that are relevant to this specific ITP type.
"""

        # Get structured output using json_schema method (best for xAI)
        try:
            structured_llm = llm.with_structured_output(ITPItemsOutput, method="json_schema")
            response = structured_llm.invoke(individual_prompt)
        except Exception as e:
            return {**state, "error": f"Failed to get structured output from LLM: {str(e)}"}

        # Get existing individual ITP items or initialize
        existing_items = state.get("individual_itp_items", [])

        # Create the individual ITP entry
        individual_itp_entry = {
            "itp_name": current_itp.get("itp_name", "Unknown ITP"),
            "itp_type": current_itp.get("itp_type", "Unknown"),
            "itp_items": response.itp_items,  # List of ITPItem objects
            "inspection_points_count": len(filtered_points),
            "standards_applied": 0
        }

        # Persist one asset per ITP (includes spec UUIDs, inspection points, and complete ITP items)
        try:
            # Find standards mapping for this ITP
            itp_pair = None
            for pair in state.get("itp_standards_pairs", []):
                if pair.get("itp_name") == current_itp.get("itp_name"):
                    itp_pair = pair
                    break

            applicable_standard_uuids = (itp_pair or {}).get("applicable_standards", [])
            applicable_spec_ids = (itp_pair or {}).get("applicable_spec_ids", [])
            individual_itp_entry["standards_applied"] = len(applicable_standard_uuids) or len(applicable_spec_ids)

            itp_name = individual_itp_entry["itp_name"]

            # Pull numbering from identification step
            matched_req = None
            for req in state.get("required_itps", []) or []:
                if req.get("itp_name") == individual_itp_entry["itp_name"]:
                    matched_req = req
                    break

            document_number = (matched_req or {}).get("itp_number")
            revision_code = (matched_req or {}).get("revision_code")

            asset_content = {
                "itp_name": individual_itp_entry["itp_name"],
                "itp_type": individual_itp_entry["itp_type"],
                "applicable_standard_uuids": applicable_standard_uuids,
                "applicable_spec_ids": applicable_spec_ids,
                "inspection_points": filtered_points,
                "itp_items": _to_serializable(response.itp_items),
            }

            asset_metadata = {
                "source": "itp_generation_rev2",
                "inspection_points_count": len(filtered_points),
                "itp_items_count": len(response.itp_items or []),
                "itp_slug": _slugify(itp_name),
            }
            # Persist using versioned asset writer with idempotency
            # Use document_number + revision in idempotency to support true revisions
            idempotency_key = (
                f"itp:{document_number}:{revision_code}" if document_number else f"itp:{_slugify(itp_name)}"
            )
            spec = IdempotentAssetWriteSpec(
                asset_type="itp_document",
                asset_subtype="",
                name=itp_name,
                description=f"ITP asset for {itp_name}",
                project_id=state["project_id"],
                document_number=document_number,
                revision_code=revision_code,
                metadata=asset_metadata,
                content=asset_content,
                idempotency_key=idempotency_key,
                edges=[],
            )

            persist_result = upsertAssetsAndEdges([spec])
            if not persist_result.get("success"):
                return {**state, "error": f"Failed to persist ITP asset for '{itp_name}': {persist_result.get('error')}"}
            result_items = persist_result.get("results") or []
            if not result_items or not result_items[0].get("asset_id"):
                return {**state, "error": f"Failed to persist ITP asset for '{itp_name}': empty result"}
            individual_itp_entry["asset_id"] = result_items[0]["asset_id"]
        except Exception as e:
            return {**state, "error": f"Failed to upsert ITP asset for '{current_itp.get('itp_name', 'Unknown')}': {str(e)}"}

        # Add the new individual ITP (with asset_id if available)
        existing_items.append(individual_itp_entry)

        # Move to next ITP
        next_index = current_index + 1

        return {
            **state,
            "individual_itp_items": existing_items,
            "current_generation_index": next_index,
            "error": None
        }

    except Exception as e:
        return {
            **state,
            "error": f"Failed to generate individual ITP: {str(e)}"
        }


def should_continue_processing(state: ITPGenerationState) -> str:
    """Determine the next step in the workflow based on current state."""
    # Check if there's an error in the state
    if state.get("error"):
        return "error"

    required_itps = state.get("required_itps", [])

    # If no required ITPs, go to error
    if not required_itps:
        return "error"

    current_itp_index = state.get("current_itp_index", 0)
    current_generation_index = state.get("current_generation_index", 0)

    # If we've finished generating individual ITPs, go to final consolidation
    if current_generation_index >= len(required_itps):
            return "generate_itp"

    # If we've finished extracting inspection points, start generating individual ITPs
    if current_itp_index >= len(required_itps):
        return "generate_individual_itp"

    # If we're in the middle of processing ITPs, continue with current task
    if current_itp_index < len(required_itps):
        return "extract_inspection_points"

    # Default fallback - shouldn't reach here
    return "error"


def generate_final_itp_node(state: ITPGenerationState) -> ITPGenerationState:
    """Generate the final consolidated ITP based on all individual ITPs."""
    try:
        individual_itps = state.get("individual_itp_items", [])
        if not individual_itps:
            return {**state, "error": "No individual ITPs available for final consolidation"}

        # Consolidate all individual ITP items into one final ITP
        consolidated_items = []
        for individual_itp in individual_itps:
            if individual_itp.get("itp_items"):
                consolidated_items.extend(individual_itp["itp_items"])

        return {
            **state,
            "final_itp_items": consolidated_items,
            "error": None
        }

    except Exception as e:
        return {
            **state,
            "error": f"Failed to generate final consolidated ITP: {str(e)}"
        }


# Create the main graph
builder = StateGraph(ITPGenerationState, input=InputState, output=OutputState)

def error_node(state: ITPGenerationState) -> ITPGenerationState:
    """Handle error states and terminate the workflow."""
    return state

# Add nodes
builder.add_node("fetch_docs", fetch_docs_node)
builder.add_node("extract_itps", extract_required_itps_node)
builder.add_node("match_standards", match_standards_to_itps_node)
builder.add_node("extract_inspection_points", extract_inspection_points_node)
builder.add_node("generate_individual_itp", generate_individual_itp_node)
builder.add_node("generate_itp", generate_final_itp_node)
builder.add_node("error", error_node)

# Define workflow
builder.add_edge(START, "fetch_docs")
builder.add_edge("fetch_docs", "extract_itps")
builder.add_edge("extract_itps", "match_standards")

# Conditional edges using routing function
builder.add_conditional_edges(
    "match_standards",
    should_continue_processing,
    {
        "extract_inspection_points": "extract_inspection_points",
        "generate_individual_itp": "generate_individual_itp",
        "generate_itp": "generate_itp",
        "error": END
    }
)

builder.add_conditional_edges(
    "extract_inspection_points",
    should_continue_processing,
    {
        "extract_inspection_points": "extract_inspection_points",
        "generate_individual_itp": "generate_individual_itp",
        "generate_itp": "generate_itp",
        "error": END
    }
)

builder.add_conditional_edges(
    "generate_individual_itp",
    should_continue_processing,
    {
        "generate_individual_itp": "generate_individual_itp",
        "generate_itp": "generate_itp",
        "error": END
    }
)

# Add error handling and final edges
builder.add_edge("error", END)
builder.add_edge("generate_itp", END)

# Compile the graph with increased recursion limit to prevent infinite loops
itp_generation_rev2_graph = builder.compile()

# Convenience function to run ITP generation
def run_itp_generation_rev2(project_id: str, pqp_content: Optional[str] = None, txt_project_documents: Optional[List[Dict[str, Any]]] = None, project_jurisdiction: Optional[str] = None) -> Dict[str, Any]:
    """Run the ITP generation workflow using project_id and optional PQP content and documents."""
    inputs: InputState = {
        "project_id": project_id,
        "pqp_content": pqp_content,
        "txt_project_documents": txt_project_documents or [],
        "project_jurisdiction": project_jurisdiction,
    }
    result = itp_generation_rev2_graph.invoke(inputs)
    return {
        "required_itps": result.get("required_itps", []),
        "itp_standards_pairs": result.get("itp_standards_pairs", []),
        "reasoning": result.get("reasoning"),
        "final_itp_items": result.get("final_itp_items", []),
        "individual_itp_items": result.get("individual_itp_items", []),
        "error": result.get("error")
    }

def create_itp_generation_rev2_graph():
    """Factory function for orchestrator integration. Returns the ITP generation graph."""
    # Note: When using this graph in orchestrator, make sure to set recursion_limit in config
    return builder.compile()
