from typing import Dict, List, Any, Annotated
from pydantic import BaseModel, field_validator
import asyncio
import logging
from uuid import UUID
from agent.tools.azure_tools import generate_sas_token, extract_document_content_async
from agent.tools.db_fetcher import db_fetcher_step
from agent.tools.action_graph_repo import upsertAssetsAndEdges, IdempotentAssetWriteSpec

logger = logging.getLogger(__name__)

class Document(BaseModel):
    id: str
    file_name: str
    content: str
    project_id: str
    metadata: Dict[str, Any] = {}
    blob_url: str = ""
    storage_path: str = ""

 

class ExtractionState(BaseModel):
    project_id: str
    document_ids: List[str] = []
    txt_project_documents: List[Dict[str, Any]] = []
    failed_documents: List[Dict[str, str]] = []
    error: str = ""
    done: bool = False
    failed: bool = False

    @field_validator('failed_documents', mode='before')
    @classmethod
    def convert_uuids_in_failed_documents(cls, v):
        """Convert UUID objects to strings in failed_documents to prevent validation errors."""
        if isinstance(v, list):
            converted_list = []
            for item in v:
                if isinstance(item, dict):
                    converted_item = {}
                    for key, value in item.items():
                        if isinstance(value, UUID):
                            converted_item[key] = str(value)
                        else:
                            converted_item[key] = value
                    converted_list.append(converted_item)
                else:
                    converted_list.append(item)
            return converted_list
        return v

# Note: No LLM or deterministic extraction. Only Azure Document Intelligence content is used; no post-processing.

async def fetch_document_details(state: ExtractionState) -> Dict[str, Any]:
    """Fetch document details from database"""
    if not state.document_ids:
        return {"document_details": []}

    # Fetch document metadata from database
    from agent.tools.db_fetcher import DbFetcherState
    # v10 uses document ASSETS; read from public.assets and project required fields from JSONB content
    fetch_state = DbFetcherState(queries=[{
        "table": "assets",
        "columns": [
            "id",
            "name AS file_name",
            "content->>'blob_url' AS blob_url",
            "content->>'storage_path' AS storage_path",
            "project_id"
        ],
        "where": {"id": {"$in": state.document_ids}}
    }])

    result = db_fetcher_step(fetch_state)
    # Ensure all IDs are strings to prevent UUID validation errors
    records = result.get("records", [])
    for record in records:
        if 'id' in record:
            record['id'] = str(record['id'])
        if 'project_id' in record:
            record['project_id'] = str(record['project_id'])

    return {"document_details": records}

async def fetch_document_ids_for_project(state: ExtractionState) -> Dict[str, Any]:
    """Fetch document/drawing asset IDs for the given project when IDs are not supplied."""
    # If IDs already provided (targeted run), normalize to strings and use them
    if state.document_ids:
        return {"document_ids": [str(x) for x in state.document_ids]}

    from agent.tools.db_fetcher import DbFetcherState

    fetch_state = DbFetcherState(queries=[{
        "table": "assets",
        "columns": ["id"],
        "where": {
            "project_id": state.project_id,
            "type": {"$in": ["document", "drawing"]},
            "is_deleted": False
        }
    }])

    result = db_fetcher_step(fetch_state)
    ids = [str(r["id"]) for r in result.get("records", [])]
    return {"document_ids": ids}

async def extract_single_document(doc_detail: Dict[str, Any], project_id: str) -> Dict[str, Any]:
    """Extract content from a single document using real Azure Document Intelligence"""
    doc_id = str(doc_detail["id"])  # Convert UUID to string
    file_name = doc_detail["file_name"]
    blob_url = doc_detail["blob_url"]
    storage_path = doc_detail["storage_path"]

    try:
        logger.info(f"🔄 Extracting content from {file_name}")

        # Generate SAS token for Azure blob access
        blob_path = storage_path or blob_url.split("/documents/", 1)[1]
        sas_url = generate_sas_token(blob_path)

        # Extract content using Azure Document Intelligence
        extraction_result = await extract_document_content_async(sas_url, file_name)

        if extraction_result["status"] != "success":
            raise ValueError(f"Extraction failed: {extraction_result.get('error', 'Unknown error')}")

        content = extraction_result.get("content", "")
        azure_meta = extraction_result.get("meta", {})
        logger.info(f"✅ Successfully extracted {len(content)} characters from {file_name}")

        doc = Document(
            id=doc_id,
            file_name=file_name,
            content=content,
            project_id=project_id,
            metadata={},
            blob_url=blob_url,
            storage_path=storage_path
        )

        return {"document": doc}

    except Exception as e:
        logger.error(f"❌ Failed to process {file_name}: {str(e)}")
        return {
            "failed": {
                "uuid": str(doc_id),  # Ensure UUID is converted to string
                "file_name": file_name,
                "error": str(e)
            },
            "extraction_meta": {
                "document_id": str(doc_id),  # Ensure UUID is converted to string
                "file_name": file_name,
                "status": "error",
                "error": str(e)
            }
        }

async def document_extraction_node(state: ExtractionState) -> Dict[str, Any]:
    """Extract text content from documents using real Azure Document Intelligence - NO MOCK DATA"""
    # Ensure all document IDs are strings to prevent UUID validation errors
    document_ids = [str(doc_id) for doc_id in state.document_ids]
    state.document_ids = document_ids

    logger.info(f"🚀 Starting document extraction for {len(state.document_ids)} documents")

    # Fetch document details from database
    doc_details_result = await fetch_document_details(state)
    doc_details = doc_details_result.get("document_details", [])

    documents = []
    failed_docs = []

    # Process documents concurrently for better performance
    tasks = [extract_single_document(doc, state.project_id) for doc in doc_details]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Task failed with exception: {result}")
            continue

        if "document" in result:
            documents.append(result["document"])
        elif "failed" in result:
            failed_docs.append(result["failed"])
    failed_flag = len(documents) == 0
    if failed_flag:
        logger.error("❌ Document extraction failed fast: no documents extracted")
    else:
        logger.info(f"✅ Document extraction complete: {len(documents)} successful docs, {len(failed_docs)} failed")

    # Convert Document objects to dictionaries for compatibility with downstream graphs
    txt_project_documents = [
        {
            "id": doc.id,
            "file_name": doc.file_name,
            "content": doc.content,
            "project_id": doc.project_id,
            "metadata": doc.metadata,
            "blob_url": doc.blob_url,
            "storage_path": doc.storage_path
        }
        for doc in documents
    ]

    # Capture successfully processed document IDs for orchestrator state
    processed_document_ids = [d["id"] for d in txt_project_documents]

    return {
        "document_ids": processed_document_ids,
        "txt_project_documents": txt_project_documents,
        "failed_documents": failed_docs,
        "error": ("Document Extraction produced no content" if failed_flag else ""),
        "failed": failed_flag,
        "done": True
    }

def create_asset_write_specs(state: ExtractionState) -> List[Dict[str, Any]]:
    """Create asset write specifications for processed documents following knowledge graph"""
    specs = []

    for doc in state.txt_project_documents:
        # Support dicts emitted by extraction_node
        d = doc if isinstance(doc, dict) else doc.model_dump()
        meta = d.get("metadata", {}) or {}
        spec = {
            "asset": {
                "type": meta.get("type", "document"),
                "name": meta.get("name", d.get("file_name")),
                "project_id": state.project_id,
                # Do not set document_number/revision here; metadata graph owns these
                "approval_state": "not_required",
                "classification": "internal",
                # CONTENT: only the raw document text (object shape required by writer)
                "content": {
                    "extracted_content": d.get("content")
                },
                # METADATA: all extraction context
                "metadata": {
                    "source_document_id": d.get("id"),
                    "file_name": d.get("file_name"),
                    "blob_url": d.get("blob_url"),
                    "storage_path": d.get("storage_path"),
                    "extraction_method": meta.get("extraction_method"),
                    "word_count": meta.get("word_count"),
                    "character_count": meta.get("character_count")
                },
                "status": "draft"
            },
            "idempotency_key": f"doc_extract:{state.project_id}:{d.get('id')}",
            "edges": []
        }
        specs.append(spec)

    return specs

def persist_assets_to_database(state: ExtractionState) -> Dict[str, Any]:
    """Persist asset specifications to the knowledge graph database"""
    if not state.txt_project_documents:
        return {"persistence_result": {"success": True, "message": "No documents to persist"}}

    try:
        # Create asset specs
        asset_specs = create_asset_write_specs(state)

        # Convert to IdempotentAssetWriteSpec objects
        write_specs = []
        for spec in asset_specs:
            write_spec = IdempotentAssetWriteSpec(
                asset_type=spec["asset"]["type"],
                asset_subtype="processed_document",
                name=spec["asset"]["name"],
                description=f"Processed document: {spec['asset']['name']}",
                project_id=state.project_id,
                metadata=spec["asset"]["metadata"],
                content=spec["asset"]["content"],
                idempotency_key=spec["idempotency_key"],
                edges=spec["edges"]
            )
            write_specs.append(write_spec)

        # Persist to database
        result = upsertAssetsAndEdges(write_specs)

        logger.info(f"Successfully persisted {len(write_specs)} document assets to database")
        return {"persistence_result": result}

    except Exception as e:
        logger.error(f"Failed to persist document assets: {e}")
        return {"persistence_result": {"success": False, "error": str(e)}}

# Graph definition
def create_document_extraction_graph():
    """Create the document extraction graph with persistence"""
    from langgraph.graph import StateGraph
    # from langgraph.checkpoint.sqlite import SqliteSaver

    graph = StateGraph(ExtractionState)

    # Add nodes
    graph.add_node("fetch_ids", fetch_document_ids_for_project)
    graph.add_node("extract", document_extraction_node)
    graph.add_node("persist_assets", persist_assets_to_database)


    # Define flow
    graph.set_entry_point("fetch_ids")
    graph.add_edge("fetch_ids", "extract")
    graph.add_edge("extract", "persist_assets")

    # Inherit parent's checkpointer when embedded as a subgraph
    return graph.compile(checkpointer=True)
