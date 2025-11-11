from langgraph.graph import StateGraph, START, END
from typing import List, Dict, Any, Optional, Annotated
from typing_extensions import TypedDict
from agent.tools.db_tools import fetch_reference_documents, upsert_asset
from agent.prompts.standards_extraction_prompt import STANDARDS_EXTRACTION_PROMPT
import logging
from operator import add
from langgraph.constants import Send
from pydantic import BaseModel, Field
import os
from langchain_google_genai import ChatGoogleGenerativeAI
# from ..orchestrator import OrchestratorState  # Remove this line

logger = logging.getLogger(__name__)

class ExtractedStandard(BaseModel):
    """Schema for individual extracted standard with database information"""
    standard_code: str = Field(description="Standard code as mentioned in document (e.g., 'AS 1379', 'ASTM C123', 'MRTS04')")
    uuid: Optional[str] = Field(default=None, description="UUID from reference database if standard is found")
    spec_name: Optional[str] = Field(default=None, description="Full name from reference database if standard is found")
    org_identifier: Optional[str] = Field(default=None, description="Organization identifier from reference database if standard is found")
    section_reference: Optional[str] = Field(default=None, description="Specific section or clause where referenced")
    context: Optional[str] = Field(default=None, description="Context of how this standard is referenced")
    found_in_database: bool = Field(description="Whether this standard was found in the reference database")
    document_ids: List[str] = Field(description="IDs of the documents where this standard was found")

class ExtractedStandards(BaseModel):
    """Schema for extracted standards response."""
    standards: List[ExtractedStandard] = Field(description="List of standards found with database information")

class StandardsState(TypedDict):  # Change to standalone TypedDict
    project_id: str
    txt_project_documents: List[Dict[str, Any]]
    reference_database: Optional[List[Dict[str, Any]]]
    standards_from_project_documents: List[Dict[str, Any]]
    error: Optional[str]
    done: bool

class InputState(TypedDict):
    project_id: str
    txt_project_documents: List[Dict[str, Any]]

class OutputState(TypedDict):
    standards_from_project_documents: List[Dict[str, Any]]
    error: Optional[str]
    done: bool

def fetch_reference_database_node(state: StandardsState) -> StandardsState:
    ref_db = fetch_reference_documents.invoke({})
    return {**state, "reference_database": ref_db}

def extract_standards_node(state: StandardsState) -> StandardsState:
    ref_db = state["reference_database"]
    txt_docs = [{k: v for k, v in doc.items() if k not in ['blob_url', 'project_id']} for doc in state["txt_project_documents"]]
    
    if not txt_docs:
        return {"standards_from_project_documents": [], "done": True, "error": None}
    
    ref_db_text = ""
    for ref in ref_db:
        ref_db_text += f"UUID: {ref['id']}, Spec ID: {ref['spec_id']}, Name: {ref['spec_name']}, Org: {ref['org_identifier']}\n"
    
    combined_content = "\n\n".join([f"Document: {doc['file_name']} (ID: {doc['id']})\n{doc['content']}" for doc in txt_docs])
    
    prompt = STANDARDS_EXTRACTION_PROMPT.format(
        reference_db_text=ref_db_text,
        document_content=combined_content
    )
    
    llm = ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL"),
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        thinking_budget=-1,
        include_thoughts=False
    )
    structured_llm = llm.with_structured_output(ExtractedStandards, method="json_mode")
    
    try:
        parsed_response = structured_llm.invoke(prompt)
        
        if not parsed_response:
            return {"error": "No parsed response from LLM", "done": True}
        
        standards_list = [std.model_dump() for std in parsed_response.standards]
        # Save to assets as a plan-type asset 'Standards Register' with richer metadata
        try:
            source_document_ids = [doc.get('id') for doc in txt_docs if doc.get('id')]
            upsert_asset.invoke({
                "project_id": state["project_id"],
                "asset_type": "plan",
                "name": "Standards Register",
                "content": {
                    "title": "Standards Register",
                    "nodes": standards_list,
                    "summary": {
                        "total_references": len(standards_list),
                        "found_in_database": sum(1 for s in standards_list if s.get('found_in_database')),
                        "unique_codes": len({s.get('standard_code') for s in standards_list if s.get('standard_code')})
                    }
                },
                "metadata": {
                    "plan_type": "standards_register",
                    "category": "register",
                    "tags": ["standards", "register", "compliance", "references"],
                    "source_document_ids": source_document_ids,
                },
                "document_number": None,
            })
        except Exception:
            pass
        return {"standards_from_project_documents": standards_list, "done": True}
    except Exception as e:
        logger.error(f"Error extracting standards: {e}")
        return {"error": str(e), "done": True}

builder = StateGraph(StandardsState, input=InputState, output=OutputState)
builder.add_node("fetch_reference_database", fetch_reference_database_node)
builder.add_node("extract_standards", extract_standards_node)
builder.add_edge(START, "fetch_reference_database")
builder.add_edge("fetch_reference_database", "extract_standards")
builder.add_edge("extract_standards", END)

standards_extraction_graph = builder.compile()

# Description: Subgraph for extracting referenced standards with parallel per-document processing. Accepts txt_project_documents from input state. Returns results in state without DB writes.
# Sub-agent of orchestrator. Tools handle DB fetches for modularity.
# Source: Ported from agents_v7 extract_referenced_standards.py, adapted for v9 design with minimal DB interaction. 

def create_standards_extraction_graph():
    """Factory exported for orchestrator integration."""
    return builder.compile()