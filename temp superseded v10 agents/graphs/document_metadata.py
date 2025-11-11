from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import logging
import uuid
from datetime import datetime
from agent.tools.action_graph_repo import upsertAssetsAndEdges, IdempotentAssetWriteSpec, get_asset_by_idempotency_key
from agent.prompts.document_metadata_prompt import (
    UNIFIED_DOCUMENT_METADATA_PROMPT,
)

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

class UnifiedRegisterMetadata(BaseModel):
    """Unified register metadata for any asset (document or drawing)."""
    model_config = ConfigDict(populate_by_name=True, extra='allow')
    asset_type: str = Field(alias="doc_kind", description="'document' or 'drawing'")
    document_id: Optional[str] = Field(default=None, description="Unique source document identifier")
    document_number: Optional[str] = Field(default=None, description="Official document or drawing number/reference")
    revision_code: Optional[str] = Field(default=None, description="Revision identifier")
    title: Optional[str] = Field(default=None, description="Title of the document or drawing")
    subtype: Optional[str] = Field(default=None, description="Subtype label")
    category: Optional[str] = Field(default=None, description="Category if applicable")
    scale: Optional[str] = Field(default=None, description="Drawing scale")
    sheet_number: Optional[str] = Field(default=None, description="Sheet number")
    total_sheets: Optional[int] = Field(default=None, description="Total number of sheets")
    discipline: Optional[str] = Field(default=None, description="Discipline if present")
    classification_level: Optional[str] = Field(default="internal", description="Security classification")
    additional_fields: Optional[str] = Field(default=None, description="Extra register-relevant fields as a JSON string (object)")

class UnifiedDocumentMetadataExtraction(BaseModel):
    """Complete extraction result for unified assets"""
    assets: List[UnifiedRegisterMetadata] = Field(description="Extracted unified asset metadata")

# State models

class DocumentMetadataState(BaseModel):
    """State for document metadata extraction"""
    project_id: str
    document_ids: List[str] = []
    txt_project_documents: List[Dict[str, Any]] = []
    # Keyed by f"{asset_type}:{document_number}" -> { id, asset_uid, revision_code, current_version, is_current, type }
    existing_revisions: Dict[str, Dict[str, Any]] = {}
    extracted_metadata: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    llm_assets: List[Dict[str, Any]] = []
    error: Optional[str] = None
    processing_complete: bool = False

class InputState(BaseModel):
    """Input state for metadata extraction"""
    project_id: str
    document_ids: List[str] = []
    # Pass through extracted documents from upstream subgraph
    txt_project_documents: List[Dict[str, Any]] = []

class OutputState(BaseModel):
    """Output state for metadata extraction"""
    extracted_metadata: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    llm_assets: List[Dict[str, Any]] = []
    error: Optional[str] = None
    processing_complete: bool = False

## Determination is LLM-only per user rules; no deterministic methods used.

# Graph nodes

async def extract_document_metadata_node(state: DocumentMetadataState) -> DocumentMetadataState:
    """Extract metadata from documents and drawings using LLM with structured output"""
    assets: List[UnifiedRegisterMetadata] = []

    # Process each document into unified assets
    for doc in state.txt_project_documents:
        doc_id = doc.get("id", "")
        file_name = doc.get("file_name", "")
        content = doc.get("content", "")

        if not content:
            logger.warning(f"Skipping document {file_name} - no content")
            continue

        unified_prompt = UNIFIED_DOCUMENT_METADATA_PROMPT.format(
            file_name=file_name,
            content=content
        )

        unified_llm = llm.with_structured_output(UnifiedRegisterMetadata)
        result = unified_llm.invoke(unified_prompt)
        asset_type = (getattr(result, "asset_type", None) or "document").lower()

        # Keep additional_fields as-is (JSON string) per prompt contract

        # Normalize and enrich the result in place
        try:
            result.asset_type = asset_type
            result.document_id = doc_id
            result.title = (result.title or file_name)
            result.classification_level = (result.classification_level or "internal")
        except Exception:
            # If any assignment fails, wrap into dict to avoid breaking flow
            pass

        # Do not merge sources into additional_fields; leave as provided by LLM
        assets.append(result)

    # Create complete extraction result
    extraction_result = UnifiedDocumentMetadataExtraction(assets=assets)

    # Proceed regardless of asset count or missing fields; downstream nodes will handle
    return DocumentMetadataState(
        project_id=state.project_id,
        document_ids=state.document_ids,
        txt_project_documents=state.txt_project_documents,
        existing_revisions=state.existing_revisions,
        extracted_metadata=extraction_result.model_dump(),
        asset_specs=extraction_result.model_dump().get("assets", []),
        llm_assets=extraction_result.model_dump().get("assets", []),
        error=None,
        processing_complete=False,
    )

def persist_assets_node(state: DocumentMetadataState) -> DocumentMetadataState:
    """Persist unified assets via action_graph_repo with idempotency and edges support"""
    if not state.extracted_metadata:
        return DocumentMetadataState(
            project_id=state.project_id,
            document_ids=state.document_ids,
            txt_project_documents=state.txt_project_documents,
            existing_revisions=state.existing_revisions,
            extracted_metadata=None,
            asset_specs=[],
            error=(state.error or "No extracted metadata available to persist"),
            processing_complete=True
        )

    extraction_data = state.extracted_metadata
    assets = extraction_data.get("assets", [])

    write_specs: List[IdempotentAssetWriteSpec] = []
    for asset in assets:
        # Target the processed_document asset created during content extraction
        src_doc_id = asset.get('document_id')
        if not src_doc_id:
            logger.warning("Skipping LLM metadata persist: missing document_id on asset")
            continue
        idempotency_key = f"doc_extract:{state.project_id}:{src_doc_id}"
        existing = get_asset_by_idempotency_key(state.project_id, 'document', idempotency_key)
        if not existing:
            logger.error(f"No processed_document asset found for idempotency_key={idempotency_key}")
            continue

        # Preserve existing content (raw text only), merge metadata
        existing_content = existing.get('content') or {}
        existing_metadata = existing.get('metadata') or {}

        # Merge LLM output under metadata.llm_outputs.unified_register without touching content
        llm_outputs = dict(existing_metadata.get('llm_outputs') or {})
        llm_outputs['unified_register'] = asset
        merged_metadata = dict(existing_metadata)
        merged_metadata['llm_outputs'] = llm_outputs

        write_spec = IdempotentAssetWriteSpec(
            asset_type='document',
            asset_subtype=(existing.get('subtype') or 'processed_document'),
            name=existing.get('name') or 'Document',
            description=f"Update LLM register metadata for {existing.get('name')}",
            project_id=str(existing.get('project_id') or state.project_id),
            document_number=existing.get('document_number'),
            revision_code=existing.get('revision_code'),
            metadata=merged_metadata,
            content=existing_content,
            idempotency_key=str(existing.get('idempotency_key') or idempotency_key),
            edges=[]
        )
        write_specs.append(write_spec)

    try:
        if write_specs:
            _ = upsertAssetsAndEdges(write_specs)
            logger.info(f"Updated metadata on {len(write_specs)} processed_document assets")
        else:
            logger.warning("No write specs generated for LLM metadata persist")
        return DocumentMetadataState(
            project_id=state.project_id,
            document_ids=state.document_ids,
            txt_project_documents=state.txt_project_documents,
            existing_revisions=state.existing_revisions,
            extracted_metadata=state.extracted_metadata,
            asset_specs=state.llm_assets,
            llm_assets=state.llm_assets,
            error=None,
            processing_complete=True
        )
    except Exception as e:
        logger.error(f"Failed to persist LLM register metadata: {e}")
        return DocumentMetadataState(
            project_id=state.project_id,
            document_ids=state.document_ids,
            txt_project_documents=state.txt_project_documents,
            existing_revisions=state.existing_revisions,
            extracted_metadata=state.extracted_metadata,
            asset_specs=[],
            error=f"Failed to persist assets: {str(e)}",
            processing_complete=True
        )

# removed legacy db_tools-based persist

# Graph creation

def create_document_metadata_graph():
    """Create the document metadata extraction graph"""
    workflow = StateGraph(DocumentMetadataState, input=InputState, output=OutputState)

    # Add nodes
    workflow.add_node("extract_metadata", extract_document_metadata_node)
    workflow.add_node("persist_assets", persist_assets_node)

    # Define flow
    workflow.add_edge(START, "extract_metadata")
    workflow.add_edge("extract_metadata", "persist_assets")
    workflow.add_edge("persist_assets", END)

    # Compile with checkpointer enabled
    return workflow.compile(checkpointer=True)
