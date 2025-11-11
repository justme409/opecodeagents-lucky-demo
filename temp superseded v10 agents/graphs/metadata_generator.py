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

class MetadataCard(BaseModel):
    """Comprehensive metadata card for a document/asset"""
    document_id: str = Field(description="Unique document identifier")
    document_type: str = Field(description="Type of document (contract, specification, drawing, etc.)")
    classification_level: str = Field(description="Security/confidentiality classification")
    primary_subject: str = Field(description="Primary subject matter")
    key_entities: List[str] = Field(description="Key entities mentioned (companies, people, locations)")
    compliance_references: List[str] = Field(description="Standards/regulations referenced")
    risk_indicators: List[str] = Field(description="Risk indicators identified")
    contractual_obligations: List[str] = Field(description="Contractual obligations identified")
    temporal_relevance: str = Field(description="Time relevance (current, historical, future)")
    relationship_context: Dict[str, List[str]] = Field(description="Relationships to other documents/assets")

class IntelligentMetadata(BaseModel):
    """Pydantic model for intelligent metadata generation"""
    metadata_cards: List[MetadataCard] = Field(description="Comprehensive metadata cards")
    cross_document_insights: List[str] = Field(description="Insights from cross-document analysis")
    compliance_summary: Dict[str, List[str]] = Field(description="Compliance requirements summary")
    risk_assessment: Dict[str, str] = Field(description="Document-level risk assessments")
    knowledge_gaps: List[str] = Field(description="Identified knowledge gaps")
    action_recommendations: List[str] = Field(description="Recommended actions based on metadata")
    metadata_completeness_score: float = Field(description="Completeness of generated metadata (0-1)")
    confidence_score: float = Field(description="Confidence in metadata accuracy (0-1)")

class MetadataGeneratorState(BaseModel):
    """State for intelligent metadata generation following V9 patterns"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    jurisdiction_analysis: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None
    intelligent_metadata: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

class InputState(BaseModel):
    """Input state for metadata generation"""
    project_id: str
    txt_project_documents: List[Dict[str, Any]] = []
    project_details: Optional[Dict[str, Any]] = None
    jurisdiction_analysis: Optional[Dict[str, Any]] = None
    standards_resolution: Optional[Dict[str, Any]] = None

class OutputState(BaseModel):
    """Output state for metadata generation"""
    intelligent_metadata: Optional[Dict[str, Any]] = None
    asset_specs: List[Dict[str, Any]] = []
    error: Optional[str] = None

def generate_intelligent_metadata_node(state: MetadataGeneratorState) -> MetadataGeneratorState:
    """Generate intelligent metadata using LLM analysis - NO REGEX, NO MOCK DATA"""

    try:
        docs = state.txt_project_documents or []
        project_details = state.project_details or {}
        jurisdiction = state.jurisdiction_analysis or {}
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

        jurisdiction_text = jurisdiction.get('jurisdiction', 'Not specified')

        # LLM prompt for intelligent metadata generation
        metadata_prompt = f"""
        Generate comprehensive, intelligent metadata for the following construction project documents. Go beyond basic extraction to provide contextual insights, relationships, and compliance intelligence.

        PROJECT DETAILS:
        {project_details.get('html', 'Not provided')}

        JURISDICTION:
        {jurisdiction_text}

        APPLICABLE STANDARDS:
        {standards_text}

        DOCUMENT CONTENT:
        {combined_content}

        For each document, generate metadata that includes:

        1. DOCUMENT CLASSIFICATION:
           - Document type and purpose
           - Security/confidentiality level
           - Temporal relevance (current/historical/future)

        2. CONTENT ANALYSIS:
           - Primary subject matter
           - Key entities (companies, people, locations)
           - Main themes and topics
           - Critical information density

        3. COMPLIANCE INTELLIGENCE:
           - Standards and regulations referenced
           - Contractual obligations identified
           - Legal requirements mentioned
           - Compliance gaps or concerns

        4. RISK ASSESSMENT:
           - Risk indicators present
           - Safety concerns identified
           - Financial implications
           - Project timeline impacts

        5. RELATIONSHIP MAPPING:
           - Connections to other documents
           - Dependencies identified
           - Cross-references found
           - Integration requirements

        6. ACTIONABLE INSIGHTS:
           - Required follow-up actions
           - Decision points identified
           - Approval requirements
           - Monitoring needs

        Provide metadata that enables intelligent document management, compliance tracking, and project control.
        """

        # Create structured LLM for metadata generation
        class IntelligentMetadataResponse(BaseModel):
            metadata_cards: List[MetadataCard] = Field(description="Comprehensive metadata for each document")
            cross_doc_insights: List[str] = Field(description="Cross-document analysis insights")
            compliance_summary: Dict[str, List[str]] = Field(description="Compliance requirements by category")
            risk_assessment: Dict[str, str] = Field(description="Risk levels for key documents")
            knowledge_gaps: List[str] = Field(description="Identified knowledge gaps")
            action_recs: List[str] = Field(description="Recommended actions")

        structured_llm = llm.with_structured_output(IntelligentMetadataResponse)
        metadata_result = structured_llm.invoke(metadata_prompt)

        # Calculate completeness and confidence scores
        input_completeness = sum([
            1 if docs else 0,
            1 if project_details else 0,
            1 if jurisdiction else 0,
            1 if standards else 0
        ]) / 4.0

        metadata_completeness = min(0.95, len(metadata_result.metadata_cards) / max(1, len(docs)) * 0.9 + 0.1)
        confidence_score = min(0.9, input_completeness * 0.8 + metadata_completeness * 0.2)

        # Store LLM outputs for knowledge graph
        llm_outputs = {
            "intelligent_metadata_generation": {
                "metadata_cards": [m.model_dump() for m in metadata_result.metadata_cards],
                "cross_document_insights": metadata_result.cross_doc_insights,
                "compliance_summary": metadata_result.compliance_summary,
                "risk_assessment": metadata_result.risk_assessment,
                "knowledge_gaps": metadata_result.knowledge_gaps,
                "action_recommendations": metadata_result.action_recs,
                "metadata_completeness_score": metadata_completeness,
                "confidence_score": confidence_score,
                "input_documents": [d.get('id') for d in docs if d.get('id')],
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Create asset spec for intelligent metadata
        asset_spec = IdempotentAssetWriteSpec(
            asset_type="analysis",
            asset_subtype="intelligent_metadata_generation",
            name=f"Intelligent Metadata Generation - {len(metadata_result.metadata_cards)} Documents Analyzed",
            description=f"Comprehensive intelligent metadata generation for project {state.project_id}",
            project_id=state.project_id,
            metadata={
                "analysis_type": "intelligent_metadata_generation",
                "documents_analyzed": len(docs),
                "metadata_cards_generated": len(metadata_result.metadata_cards),
                "cross_document_insights": len(metadata_result.cross_doc_insights),
                "compliance_categories": len(metadata_result.compliance_summary),
                "knowledge_gaps_identified": len(metadata_result.knowledge_gaps),
                "action_recommendations": len(metadata_result.action_recs),
                "metadata_completeness_score": metadata_completeness,
                "confidence_score": confidence_score,
                "llm_outputs": llm_outputs
            },
            content={
                "intelligent_metadata": {
                    "metadata_cards": [m.model_dump() for m in metadata_result.metadata_cards],
                    "cross_document_insights": metadata_result.cross_doc_insights,
                    "compliance_summary": metadata_result.compliance_summary,
                    "risk_assessment": metadata_result.risk_assessment,
                    "knowledge_gaps": metadata_result.knowledge_gaps,
                    "action_recommendations": metadata_result.action_recs,
                    "metadata_completeness_score": metadata_completeness,
                    "confidence_score": confidence_score
                },
                "source_documents": [d.get('id') for d in docs if d.get('id')]
            },
            idempotency_key=f"intelligent_metadata_generation:{state.project_id}"
        )

        # Upsert to knowledge graph
        upsert_result = upsertAssetsAndEdges([asset_spec])

        return MetadataGeneratorState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            jurisdiction_analysis=state.jurisdiction_analysis,
            standards_resolution=state.standards_resolution,
            intelligent_metadata={
                "metadata_cards": [m.model_dump() for m in metadata_result.metadata_cards],
                "cross_document_insights": metadata_result.cross_doc_insights,
                "compliance_summary": metadata_result.compliance_summary,
                "risk_assessment": metadata_result.risk_assessment,
                "knowledge_gaps": metadata_result.knowledge_gaps,
                "action_recommendations": metadata_result.action_recs,
                "metadata_completeness_score": metadata_completeness,
                "confidence_score": confidence_score
            },
            asset_specs=[asset_spec.model_dump()],
            error=None
        )

    except Exception as e:
        logger.error(f"Intelligent metadata generation failed: {str(e)}")
        return MetadataGeneratorState(
            project_id=state.project_id,
            txt_project_documents=state.txt_project_documents,
            project_details=state.project_details,
            jurisdiction_analysis=state.jurisdiction_analysis,
            standards_resolution=state.standards_resolution,
            intelligent_metadata=None,
            asset_specs=[],
            error=f"Intelligent metadata generation failed: {str(e)}"
        )

def create_metadata_generator_graph():
    """Create the intelligent metadata generator graph with persistence"""
    workflow = StateGraph(MetadataGeneratorState, input=InputState, output=OutputState)

    workflow.add_node("generate_intelligent_metadata", generate_intelligent_metadata_node)

    workflow.add_edge(START, "generate_intelligent_metadata")
    workflow.add_edge("generate_intelligent_metadata", END)

    return workflow.compile(checkpointer=True)
