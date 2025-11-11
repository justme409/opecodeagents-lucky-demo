from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional
import asyncio

class EmailIngestState(TypedDict):
    email_content: str
    attachments: list[dict]
    project_id: Optional[str]
    parsed_entities: dict
    created_assets: list[dict]
    status: str

async def parse_email_content(state: EmailIngestState) -> EmailIngestState:
    """Parse email content and extract entities"""
    content = state['email_content']

    # Placeholder email parsing logic
    parsed_entities = {
        'subject': 'Sample Email Subject',
        'sender': 'sender@example.com',
        'recipients': ['recipient@example.com'],
        'body': content,
        'entities': {
            'documents': [],
            'rfis': [],
            'correspondence': []
        }
    }

    return {
        **state,
        'parsed_entities': parsed_entities,
        'status': 'parsed'
    }

async def extract_attachments(state: EmailIngestState) -> EmailIngestState:
    """Process email attachments"""
    attachments = state.get('attachments', [])
    processed_attachments = []

    for attachment in attachments:
        processed_attachments.append({
            **attachment,
            'processed': True,
            'content_type': attachment.get('content_type', 'application/octet-stream')
        })

    return {
        **state,
        'attachments': processed_attachments,
        'status': 'attachments_extracted'
    }

async def create_correspondence_asset(state: EmailIngestState) -> EmailIngestState:
    """Create correspondence asset from parsed email"""
    parsed = state.get('parsed_entities', {})

    asset = {
        'type': 'correspondence',
        'name': parsed.get('subject', 'Email Correspondence'),
        'content': {
            'subject': parsed.get('subject'),
            'sender': parsed.get('sender'),
            'recipients': parsed.get('recipients'),
            'body': parsed.get('body'),
            'attachments': state.get('attachments', [])
        },
        'status': 'draft'
    }

    return {
        **state,
        'created_assets': [asset],
        'status': 'asset_created'
    }

def create_email_ingest_graph():
    workflow = StateGraph(EmailIngestState)

    workflow.add_node("parse_content", parse_email_content)
    workflow.add_node("extract_attachments", extract_attachments)
    workflow.add_node("create_asset", create_correspondence_asset)

    workflow.set_entry_point("parse_content")
    workflow.add_edge("parse_content", "extract_attachments")
    workflow.add_edge("extract_attachments", "create_asset")
    workflow.add_edge("create_asset", END)

    return workflow.compile()
