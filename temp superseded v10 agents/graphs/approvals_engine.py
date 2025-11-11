from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional
import asyncio

class ApprovalsState(TypedDict):
    workflow_id: str
    asset_id: str
    current_step: str
    approvers: list[dict]
    approvals: list[dict]
    status: str
    notifications: list[dict]

async def load_workflow_definition(state: ApprovalsState) -> ApprovalsState:
    """Load approval workflow definition"""
    workflow_id = state['workflow_id']

    # Placeholder workflow loading
    workflow = {
        'steps': [
            {'name': 'review', 'approvers': ['reviewer@example.com']},
            {'name': 'approval', 'approvers': ['approver@example.com']}
        ]
    }

    return {
        **state,
        'workflow_definition': workflow,
        'current_step': workflow['steps'][0]['name'],
        'approvers': workflow['steps'][0]['approvers'],
        'status': 'workflow_loaded'
    }

async def check_approvals(state: ApprovalsState) -> ApprovalsState:
    """Check if current step approvals are complete"""
    current_approvals = [a for a in state.get('approvals', [])
                        if a['step'] == state['current_step']]

    required_approvers = state.get('approvers', [])
    approved_count = len([a for a in current_approvals if a['decision'] == 'approved'])

    if approved_count >= len(required_approvers):
        return {
            **state,
            'status': 'step_approved'
        }
    else:
        return {
            **state,
            'status': 'waiting_approvals'
        }

async def send_notifications(state: ApprovalsState) -> ApprovalsState:
    """Send notifications to approvers"""
    notifications = state.get('notifications', [])

    for approver in state.get('approvers', []):
        notifications.append({
            'type': 'approval_request',
            'recipient': approver,
            'asset_id': state['asset_id'],
            'step': state['current_step'],
            'message': f"Please review and approve {state['asset_id']}"
        })

    return {
        **state,
        'notifications': notifications,
        'status': 'notifications_sent'
    }

def create_approvals_engine_graph():
    workflow = StateGraph(ApprovalsState)

    workflow.add_node("load_workflow", load_workflow_definition)
    workflow.add_node("check_approvals", check_approvals)
    workflow.add_node("send_notifications", send_notifications)

    workflow.set_entry_point("load_workflow")
    workflow.add_edge("load_workflow", "check_approvals")
    workflow.add_edge("check_approvals", "send_notifications")
    workflow.add_edge("send_notifications", END)

    return workflow.compile()
