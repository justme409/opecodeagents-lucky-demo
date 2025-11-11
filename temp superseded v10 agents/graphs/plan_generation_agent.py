import os
import json
import logging
from typing_extensions import TypedDict, NotRequired
from typing import List, Dict, Any, Optional, Literal, Tuple
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.prompts.pqp_prompt import PROMPT as PQP_PROMPT
from agent.prompts.emp_prompt import PROMPT as EMP_PROMPT
from agent.prompts.ohsmp_prompt import PROMPT as OHSMP_PROMPT
from agent.prompts.tmp_prompt import PROMPT as TMP_PROMPT
from agent.prompts.construction_program_prompt import PROMPT as CONSTR_PROMPT
from agent.tools.db_tools import (
    fetch_organization_id_for_project,
    fetch_qse_assets_for_org,
)
from agent.prompts.qse_system import QSE_SYSTEM_NODES, QSE_SYSTEM_SUMMARY
from agent.tools.action_graph_repo import (
    upsertAssetsAndEdges,
    IdempotentAssetWriteSpec,
)

logger = logging.getLogger(__name__)

llm = ChatGoogleGenerativeAI(
    model=os.getenv("GEMINI_MODEL_2"),
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.2,
    max_output_tokens=65536,
    include_thoughts=False,
    thinking_budget=-1,
)

VERBOSITY_DIRECTIVE = (
    "\n\nCRITICAL VERBOSITY & DETAIL REQUIREMENTS:"  # make outputs significantly longer and richer
    "\n- Be exhaustive and highly detailed across ALL sections. Target 2–4x the content of a concise plan."
    "\n- Expand every major section into multiple rich 'block' entries (paragraphs, lists, tables) wherever helpful."
    "\n- Prefer specificity grounded in PROJECT DOCUMENTS. Where absent, provide best-practice defaults and explicitly mark them as 'Assumption'."
    "\n- For each relevant topic include: purpose, scope, definitions, roles & responsibilities, step-by-step procedures, required resources, tools, competency requirements, references/standards/codes, acceptance criteria, inspections & test checkpoints, records & evidence to retain."
    "\n- Provide matrices/tables where suitable: RACI, risk register, environmental aspects & impacts, OHS hazard → control mapping (use hierarchy of controls), KPIs with targets and measurement methods, communication/escalation pathways, training/induction requirements."
    "\n- Provide explicit checklists (as list items) for field execution and verification."
    "\n- For traffic management (TMP), include delineation, staging, detours, signage schedules, hold points, emergency procedures."
    "\n- For construction program, include milestone breakdowns, dependencies, critical path notes, calendar/constraints, resource loading commentary (histograms described in text), contingency buffers, and reporting cadence."
    "\n- Use tables via headers/rows for registers and matrices; use items for enumerations; use paragraphs for narrative guidance."
    "\n- Structure deeply: create multiple levels of 'section' nodes with clear titles and populate each with several detailed 'block' nodes."
    "\n- Maintain the strict adjacency list schema; do NOT include children arrays; only use parentId relationships."
)

ENGINEERING_IMPLEMENTATION_DIRECTIVE = (
    "\n\nENGINEERING IMPLEMENTATION DIRECTIVE (Authoritative, Practitioner Grade):"
    "\n- You are acting as a senior civil engineer producing FINAL, IMPLEMENTABLE management plans for immediate use on the project."
    "\n- The plans must be tailored to the PROJECT DOCUMENTS (drawings, specifications, schedules, contract conditions). Use them as primary sources; use QSE context only to fill gaps."
    "\n- Where exact values or project-specific rules exist in documents, APPLY them. If absent, state 'Assumption' and provide best-practice value."
    "\n- Include fully workable method statements: detailed sequence, responsibilities, resources, plant & equipment, production rates, hold/witness points, acceptance criteria, inspection & test checkpoints, records to be captured, and close-out requirements."
    "\n- Provide explicit, field-usable checklists and registers (tables) for: risks (with controls following hierarchy), environmental aspects/impacts with mitigations and monitoring, OHS hazards with controls, training/competency, permits/approvals, calibration & equipment checks, materials conformance, NCR/CAR escalation, and communication/escalation pathways."
    "\n- For Quality (PQP): align each activity with ITP references and acceptance criteria; include document control, revisioning, and evidence capture requirements."
    "\n- For Environmental (EMP): include monitoring methods, frequencies, locations, limits/thresholds, reporting lines, and contingency actions when thresholds are exceeded."
    "\n- For OHSMP: include SWMS/JSA linkage, isolation/LOTO, access/egress, emergency response, inductions, toolbox talk content prompts, and PPE matrices."
    "\n- For TMP: include staging, delineation, detours, signage schedules, VMS messages, traffic counts assumptions, speed management, access management, emergency/incident procedures, and hold points for switchovers."
    "\n- For Construction Program: include milestones, dependencies, critical path commentary, calendars/constraints, weather allowances, resource loading commentary, buffers, reporting cadence, and progress measurement."
    "\n- Reference sources in the 'label' field within blocks when possible (e.g., 'Ref: SPEC 03300 §3.2; Drawing C-101; Contract Cl.14'). Use 'url' if a precise link exists; otherwise leave null."
    "\n- IDs must be unique strings. Titles must be clear and professional."
    "\n- Output must be sufficiently detailed that a competent engineer/site team could execute without further drafting."
)

QSE_REFERENCING_DIRECTIVE = (
    "\n\nQSE REFERENCING RULES (Corporate System Citations):"
    "\n- Use the IMS DOCUMENTS block provided (sourced from the organisation's asset registry) to ground every corporate reference."
    "\n- Cite documents by their exact 'document_number' and hyperlink the document title to the supplied URL (e.g., <a class=\"qse-link\" href=\"https://projectpro.pro/qse/corp-documentation\">Procedure for Control of Documented Information</a>)."
    "\n- Reference these documents in context (e.g., 'Controlled via the <a class=\"qse-link\" href=\"...\">QSE-7.5-PROC-01 Procedure for Control of Documented Information</a>'). Do NOT copy or restate the full content of the IMS documents."
    "\n- Provide inline citations near relevant paragraphs like (Ref: QSE-7.5-PROC-01) in addition to hyperlinks."
    "\n- Include a final <h2 id=\"sec-references\">References</h2> section listing all cited QSE items as a bulleted list:"
    "\n  • Format: <li><b>QSE-7.5-PROC-01</b> — Procedure for Control of Documented Information (path: /qse/corp-documentation)</li>"
    "\n- If any IMS items are missing from the organisation's assets, explicitly note the gap and recommend sourcing the controlled copy from the corporate IMS."
    "\n- Do NOT invent document numbers. Only use values that exist in QSE_SYSTEM_NODES or the IMS DOCUMENTS block."
)

NUMBERING_AND_ARTIFACTS_DIRECTIVE = (
    "\n\nPRESENTATION & OUTPUT RULES (Numbered Sections + Contents):"
    "\n- INCLUDE a 'Contents' section at the very top that lists all major sections with anchor links."
    "\n  • Render as an unordered list under an <h2>Contents</h2> heading."
    "\n  • Each list item must link to the corresponding section via #anchors (e.g., <a href=\"#sec-1\">1. General</a>)."
    "\n- USE DECIMAL SECTION NUMBERING for headings:"
    "\n  • <h1 class=\"plan-heading\"> for the document title (unnumbered)."
    "\n  • <h2 class=\"plan-heading\"> for top-level sections numbered 1, 2, 3, ... (e.g., '1. General')."
    "\n  • <h3 class=\"plan-subheading\"> for subsections numbered 1.1, 1.2, 2.1, ... according to their parent section."
    "\n- Add stable id attributes to each numbered heading to support anchor links (e.g., <h2 id=\"sec-1\">1. General</h2>, <h3 id=\"sec-1-1\">1.1 Purpose</h3>)."
    "\n- Strip any numbering found in source documents BEFORE applying the new consistent numbering scheme."
    "\n- Do NOT include page numbers or pagination artifacts."
    "\n- Only include actual plan content. Exclude redundant layout metadata from source documents."
    "\n- Wrap the entire generated body inside a single <article class=\"plan plan-quality\" style=\"font-family:'Inter',sans-serif;font-size:15px;line-height:1.7;color:#111827;\"> container: open it before the title and close it at the very end."
    "\n- Insert a <style> block immediately after opening <article> defining shared classes (.plan-heading, .plan-subheading, .plan-section, .plan-subsection, .plan-table, .qse-link) consistent with the typography guidance (e.g., .plan-heading {font-weight:600;font-size:1.35rem; margin-top:2rem;}, .plan-table {border-collapse:collapse;width:100%;}, .qse-link {color:#2563eb;text-decoration:underline;})."
    "\n- Enclose each top-level numbered section within matching <section class=\"plan-section\">...</section> tags and nest each <h3> block (and its content) inside <section class=\"plan-subsection\">...</section> to keep markup tidy."
    "\n- Render QSE references as clickable anchors (e.g., <a class=\"qse-link\" href=\"https://projectpro.pro/qse/corp-documentation\">Procedure for Control of Documented Information</a>) and never emit raw JSON objects such as {\"type\":\"link\"}."
    "\n- Add class=\"lead\" to the first paragraph within each top-level section and class=\"plan-table\" to every <table> for improved readability without heavy styling."
)

PLAN_TO_COLUMN = {
    "pqp": "pqp_plan_json",
    "emp": "emp_plan_json",
    "ohsmp": "ohsmp_plan_json",
    "tmp": "tmp_plan_json",
    # "construction_program": "construction_program_json",  # temporarily disabled
}

PLAN_TO_PROMPT = {
    "pqp": PQP_PROMPT,
    "emp": EMP_PROMPT,
    "ohsmp": OHSMP_PROMPT,
    "tmp": TMP_PROMPT,
    # "construction_program": CONSTR_PROMPT,  # temporarily disabled
}

PLAN_QSE_DOCUMENTS: Dict[str, List[str]] = {
    "pqp": [
        "QSE-1-MAN-01",
        "QSE-5.2-POL-01",
        "QSE-7.2-PROC-01",
        "QSE-7.2-REG-01",
        "QSE-7.5-PROC-01",
        "QSE-7.5-REG-01",
        "QSE-8.1-PROC-06",
        "QSE-8.1-PROC-07",
        "QSE-8.1-TEMP-ITP",
        "QSE-9.2-PROC-01",
        "QSE-10.2-PROC-01",
        "QSE-10.2-REG-01",
        "QSE-10.3-PROC-01",
    ],
    "emp": [
        "QSE-1-MAN-01",
        "QSE-5.2-POL-01",
        "QSE-5.3-REG-01",
        "QSE-6.1-PROC-01",
        "QSE-6.1-PROC-02",
        "QSE-6.1-REG-03",
        "QSE-7.2-PROC-01",
        "QSE-7.2-TEMP-01",
        "QSE-7.5-PROC-01",
        "QSE-8.1-PROC-02",
        "QSE-8.1-TEMP-01",
        "QSE-8.1-TEMP-03",
        "QSE-8.1-TEMP-04",
        "QSE-8.1-TEMP-EMP",
        "QSE-9.2-PROC-01",
        "QSE-10.3-PROC-01",
    ],
    "ohsmp": [
        "QSE-1-MAN-01",
        "QSE-5.3-REG-01",
        "QSE-5.4-PROC-01",
        "QSE-5.4-FORM-01",
        "QSE-6.1-PROC-01",
        "QSE-6.1-PROC-02",
        "QSE-6.1-REG-03",
        "QSE-7.2-PROC-01",
        "QSE-7.2-REG-01",
        "QSE-7.5-PROC-01",
        "QSE-8.1-PROC-02",
        "QSE-8.1-PROC-03",
        "QSE-8.1-PROC-07",
        "QSE-8.1-TEMP-01",
        "QSE-8.1-TEMP-03",
        "QSE-8.1-TEMP-04",
        "QSE-8.1-TEMP-SWMS",
        "QSE-8.1-TEMP-TMP",
        "QSE-9.2-PROC-01",
        "QSE-9.2-SCHED-01",
        "QSE-10.2-PROC-01",
        "QSE-10.2-REG-01",
    ],
    "tmp": [
        "QSE-5.3-REG-01",
        "QSE-6.1-PROC-01",
        "QSE-7.2-PROC-01",
        "QSE-7.4-PROC-01",
        "QSE-7.5-PROC-01",
        "QSE-8.1-PROC-02",
        "QSE-8.1-TEMP-01",
        "QSE-9.2-PROC-01",
        "QSE-10.2-PROC-01",
    ],
}

QSE_DOC_NODE_INDEX: Dict[str, Dict[str, Any]] = {
    node.get("document_number"): node
    for node in QSE_SYSTEM_NODES
    if node.get("document_number")
}

QSE_BASE_URL = "https://projectpro.pro"


def _normalize_doc_number(doc_id: str) -> str:
    return doc_id.strip().upper()


def _required_docs_for_plan(plan_type: str) -> List[str]:
    docs = PLAN_QSE_DOCUMENTS.get(plan_type, [])
    return [_normalize_doc_number(d) for d in docs]


def _build_asset_index_by_doc_number(assets: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    index: Dict[str, Dict[str, Any]] = {}
    for asset in assets:
        candidates = [
            asset.get("document_number"),
        ]
        metadata = asset.get("metadata") or {}
        if isinstance(metadata, dict):
            candidates.append(metadata.get("document_number"))
            qse_doc_meta = metadata.get("qse_doc")
            if isinstance(qse_doc_meta, dict):
                candidates.append(qse_doc_meta.get("code"))
        candidates.append(asset.get("name"))
        for candidate in candidates:
            if isinstance(candidate, str) and candidate.strip():
                normalized = _normalize_doc_number(candidate)
                if normalized not in index:
                    index[normalized] = asset
                break
    return index


def _resolve_qse_url(doc_number: str) -> Optional[str]:
    node = QSE_DOC_NODE_INDEX.get(doc_number)
    if node and node.get("path"):
        return f"{QSE_BASE_URL}{node['path']}"
    return None


def _resolve_qse_title(doc_number: str, asset: Optional[Dict[str, Any]]) -> str:
    if asset and isinstance(asset.get("name"), str) and asset["name"].strip():
        return asset["name"].strip()
    node = QSE_DOC_NODE_INDEX.get(doc_number)
    if node and isinstance(node.get("title"), str):
        return node["title"]
    return doc_number


def _format_qse_reference_block(plan_type: str, organization_id: Optional[str], references: List[Dict[str, Any]]) -> str:
    if not references:
        org_label = organization_id or "unknown"
        return (
            f"- No IMS assets located for organisation {org_label}. Cite the corporate QSE documents using the QSE system adjacency list."
        )

    lines: List[str] = []
    for ref in references:
        url = ref.get("url") or "(no path provided)"
        status = "" if ref.get("asset_present") else " [MISSING IN ASSETS — reference corporate IMS repository]"
        title = ref.get("title") or ref["document_number"]
        lines.append(f"- {ref['document_number']} — {title} (url: {url}){status}")
    return "\n".join(lines)


def _format_qse_content_block(plan_type: str, organization_id: Optional[str], assets: List[Dict[str, Any]]) -> str:
    """Include the actual HTML content of QSE documents in the prompt."""
    if not assets:
        org_label = organization_id or "unknown"
        return (
            f"- No QSE document content available for organisation {org_label}. "
            "Use QSE system adjacency list descriptions as guidance."
        )

    content_blocks: List[str] = []
    for asset in assets:
        doc_number = asset.get("document_number", "Unknown")
        title = asset.get("name", doc_number)
        content = asset.get("content", {})

        # Extract HTML content
        html_content = ""
        if isinstance(content, dict):
            html_content = content.get("html", "")
        elif isinstance(content, str):
            try:
                import json
                content_dict = json.loads(content)
                html_content = content_dict.get("html", "")
            except:
                html_content = content

        if html_content:
            content_blocks.append(f"## {doc_number}: {title}\n\n{html_content}")
        else:
            content_blocks.append(f"## {doc_number}: {title}\n\n[No HTML content available]")

    return "\n\n".join(content_blocks)


def _build_qse_references_for_plan(organization_id: Optional[str], plan_type: str) -> List[Dict[str, Any]]:
    if not organization_id:
        raise ValueError("organization_id required for QSE reference building (no fallback)")

    required_docs = _required_docs_for_plan(plan_type)
    if not required_docs:
        raise ValueError(f"No required QSE documents defined for plan type: {plan_type}")

    assets = fetch_qse_assets_for_org(organization_id, required_docs)

    assets_by_doc = _build_asset_index_by_doc_number(assets)
    references: List[Dict[str, Any]] = []
    for doc in required_docs:
        asset = assets_by_doc.get(doc)
        title = _resolve_qse_title(doc, asset)
        url = _resolve_qse_url(doc)
        references.append(
            {
                "document_number": doc,
                "title": title,
                "url": url,
                "asset_present": asset is not None,
                "asset_id": asset.get("id") if asset else None,
                "asset_name": asset.get("name") if asset else None,
                "organization_id": organization_id,
            }
        )
    return references


def _prepare_qse_context(state: Dict[str, Any], plan_type: str) -> Tuple[Dict[str, Any], str, str]:
    organization_id = state.get("organization_id")
    if not organization_id:
        try:
            organization_id = fetch_organization_id_for_project(state["project_id"])
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning(
                "Unable to resolve organisation for project %s: %s", state["project_id"], exc
            )
            organization_id = None

    reference_cache = dict(state.get("qse_references") or {})
    if plan_type in reference_cache:
        references = reference_cache[plan_type]
    else:
        references = _build_qse_references_for_plan(organization_id, plan_type)
        reference_cache[plan_type] = references

    # Get the assets for content inclusion
    required_docs = _required_docs_for_plan(plan_type)
    assets = []
    if organization_id and required_docs:
        try:
            assets = fetch_qse_assets_for_org(organization_id, required_docs)
        except Exception as exc:
            logger.warning("Failed to fetch QSE assets for content: %s", exc)
            assets = []

    reference_block = _format_qse_reference_block(plan_type, organization_id, references)
    content_block = _format_qse_content_block(plan_type, organization_id, assets)

    updated_state = {
        **state,
        "organization_id": organization_id,
        "qse_references": reference_cache,
    }
    return updated_state, reference_block, content_block


def _default_category_and_tags_for_plan_type(plan_type: str) -> Dict[str, Any]:
    mapping: Dict[str, Dict[str, Any]] = {
        "pqp": {"category": "management_plan", "tags": ["plan", "pqp", "quality"]},
        "emp": {"category": "management_plan", "tags": ["plan", "emp", "environment"]},
        "ohsmp": {"category": "management_plan", "tags": ["plan", "ohs", "safety"]},
        "tmp": {"category": "management_plan", "tags": ["plan", "tmp", "traffic"]},
        "construction_program": {"category": "program", "tags": ["plan", "program", "schedule"]},
    }
    return mapping.get(plan_type, {"category": "plan", "tags": ["plan", plan_type]})

class PlanHtml(BaseModel):
    """Simple model for HTML plan body content.

    We store the HTML body only (no <html>, <head>, or <body> tags) to render directly in the app editor/viewer.
    """
    html: str

class PlanGenerationState(TypedDict):
    project_id: str
    plan_type: str
    txt_project_documents: List[Dict[str, Any]]
    plan_html: Optional[str]
    error: Optional[str]
    generated_plans: List[Dict[str, Any]]
    organization_id: NotRequired[Optional[str]]
    qse_references: NotRequired[Dict[str, List[Dict[str, Any]]]]

class InputState(TypedDict):
    project_id: str
    # plan_type is optional for the single-plan graph; if omitted, default to 'pqp'
    plan_type: Optional[str]
    # documents must be provided upstream; this graph does not fetch
    txt_project_documents: List[Dict[str, Any]]
    organization_id: NotRequired[Optional[str]]
    qse_references: NotRequired[Dict[str, List[Dict[str, Any]]]]

class OutputState(TypedDict):
    generated_plans: List[Dict[str, Any]]
    plan_html: Optional[str]
    organization_id: NotRequired[Optional[str]]
    qse_references: NotRequired[Dict[str, List[Dict[str, Any]]]]


def fetch_docs_node(state: PlanGenerationState) -> PlanGenerationState:
    # Use the txt_project_documents that were already extracted by document_extraction.py
    # Fail fast: do NOT fetch from database here
    if state.get("txt_project_documents"):
        # Already have extracted documents from document_extraction.py
        return state
    raise ValueError("txt_project_documents missing; provide extracted documents upstream (no DB fallback)")

def generate_plan_node(state: PlanGenerationState) -> PlanGenerationState:
    plan_type = state.get("plan_type") or "pqp"
    state, ims_block, qse_content_block = _prepare_qse_context(state, plan_type)
    docs_text = "\n\n".join(
        [f"Document: {d['file_name']} (ID: {d['id']})\n{d['content']}" for d in state["txt_project_documents"]]
    )
    system_prompt = PLAN_TO_PROMPT[plan_type]
    qse_context = json.dumps(QSE_SYSTEM_NODES)
    qse_summary = QSE_SYSTEM_SUMMARY
    output_instructions = (
        "\n\nOUTPUT FORMAT (STRICT): Return JSON with a single field 'html' that contains the FINAL HTML BODY ONLY. "
        "Do NOT include <html>, <head>, or <body> tags. Use semantic HTML elements (h1-h3, p, ul/ol, table, a). "
        "Render a complete, professional management plan suitable for direct display and TinyMCE editing."
    )
    prompt = (
        f"{system_prompt}\n\n"
        f"QSE SYSTEM SUMMARY:\n{qse_summary}\n\n"
        f"QSE SYSTEM REFERENCE (adjacency list):\n{qse_context}\n\n"
        f"IMS DOCUMENTS ({plan_type.upper()} PLAN FOCUS):\n{ims_block}\n\n"
        f"QSE DOCUMENT CONTENT ({plan_type.upper()} PLAN):\n{qse_content_block}\n\n"
        f"PROJECT DOCUMENTS:\n{docs_text}"
        f"{VERBOSITY_DIRECTIVE}"
        f"{ENGINEERING_IMPLEMENTATION_DIRECTIVE}"
        f"{QSE_REFERENCING_DIRECTIVE}"
        f"{NUMBERING_AND_ARTIFACTS_DIRECTIVE}"
        f"{output_instructions}"
    )
    structured_llm = llm.with_structured_output(PlanHtml, method="json_mode")
    response = structured_llm.invoke(prompt)
    html = response.html or ""
    return {**state, "plan_html": html, "plan_type": plan_type}

def _generate_plan_for_type(plan_type: str, state: PlanGenerationState) -> PlanGenerationState:
    state, ims_block, qse_content_block = _prepare_qse_context(state, plan_type)
    docs_text = "\n\n".join(
        [f"Document: {d['file_name']} (ID: {d['id']})\n{d['content']}" for d in state["txt_project_documents"]]
    )
    system_prompt = PLAN_TO_PROMPT[plan_type]
    qse_context = json.dumps(QSE_SYSTEM_NODES)
    qse_summary = QSE_SYSTEM_SUMMARY
    output_instructions = (
        "\n\nOUTPUT FORMAT (STRICT): Return JSON with a single field 'html' that contains the FINAL HTML BODY ONLY. "
        "Do NOT include <html>, <head>, or <body> tags. Use semantic HTML elements (h1-h3, p, ul/ol, table, a). "
        "Render a complete, professional management plan suitable for direct display and TinyMCE editing."
    )
    prompt = (
        f"{system_prompt}\n\n"
        f"QSE SYSTEM SUMMARY:\n{qse_summary}\n\n"
        f"QSE SYSTEM REFERENCE (adjacency list):\n{qse_context}\n\n"
        f"IMS DOCUMENTS ({plan_type.upper()} PLAN FOCUS):\n{ims_block}\n\n"
        f"QSE DOCUMENT CONTENT ({plan_type.upper()} PLAN):\n{qse_content_block}\n\n"
        f"PROJECT DOCUMENTS:\n{docs_text}"
        f"{VERBOSITY_DIRECTIVE}"
        f"{ENGINEERING_IMPLEMENTATION_DIRECTIVE}"
        f"{QSE_REFERENCING_DIRECTIVE}"
        f"{NUMBERING_AND_ARTIFACTS_DIRECTIVE}"
        f"{output_instructions}"
    )
    structured_llm = llm.with_structured_output(PlanHtml, method="json_mode")
    response = structured_llm.invoke(prompt)
    html = response.html or ""
    return {**state, "plan_html": html, "plan_type": plan_type}

def generate_pqp_node(state: PlanGenerationState) -> PlanGenerationState:
    return _generate_plan_for_type("pqp", state)

def generate_emp_node(state: PlanGenerationState) -> PlanGenerationState:
    return _generate_plan_for_type("emp", state)

def generate_ohsmp_node(state: PlanGenerationState) -> PlanGenerationState:
    return _generate_plan_for_type("ohsmp", state)

def generate_tmp_node(state: PlanGenerationState) -> PlanGenerationState:
    return _generate_plan_for_type("tmp", state)

def save_plan_node(state: PlanGenerationState) -> PlanGenerationState:
    # Persist the plan exclusively into the assets table (idempotent, versioned)
    plan_type = state.get("plan_type") or "plan"
    title = f"{plan_type.upper()} Plan"
    source_document_ids = [d.get("id") for d in state.get("txt_project_documents", []) if d.get("id")]
    defaults = _default_category_and_tags_for_plan_type(plan_type)
    metadata: Dict[str, Any] = {
        "plan_type": plan_type,
        "category": defaults.get("category"),
        "tags": defaults.get("tags"),
        "source_document_ids": source_document_ids,
    }
    # Persist to knowledge graph via action_graph_repo (idempotent, versioned)
    asset_spec = IdempotentAssetWriteSpec(
        asset_type="plan",
        asset_subtype=plan_type,
        name=title,
        description=f"{title} generated from project documents",
        project_id=state["project_id"],
        metadata=metadata,
        content={"html": state.get("plan_html") or ""},
        idempotency_key=f"plan:{state['project_id']}:{plan_type}",
        edges=[],
    )
    upsertAssetsAndEdges([asset_spec])
    # Append to generated_plans summary in state
    existing = state.get("generated_plans") or []
    summary_entry = {"plan_type": plan_type, "title": title}
    return {**state, "generated_plans": [*existing, summary_entry]}

builder = StateGraph(PlanGenerationState, input=InputState, output=OutputState)
builder.add_node("fetch_docs", fetch_docs_node)
builder.add_node("generate_pqp", generate_pqp_node)
builder.add_node("save_pqp", save_plan_node)
builder.add_node("generate_emp", generate_emp_node)
builder.add_node("save_emp", save_plan_node)
builder.add_node("generate_ohsmp", generate_ohsmp_node)
builder.add_node("save_ohsmp", save_plan_node)
builder.add_node("generate_tmp", generate_tmp_node)
builder.add_node("save_tmp", save_plan_node)

builder.add_edge(START, "fetch_docs")
builder.add_edge("fetch_docs", "generate_pqp")
builder.add_edge("generate_pqp", "save_pqp")
builder.add_edge("save_pqp", "generate_emp")
builder.add_edge("generate_emp", "save_emp")
builder.add_edge("save_emp", "generate_ohsmp")
builder.add_edge("generate_ohsmp", "save_ohsmp")
builder.add_edge("save_ohsmp", "generate_tmp")
builder.add_edge("generate_tmp", "save_tmp")
builder.add_edge("save_tmp", END)

plan_generation_graph = builder.compile()

# Description: Subgraph that generates a project management plan JSON using Gemini structured output and saves it to projects table.

# --------------------
# Sequencer: generate ALL plans in sequence (separate LLM call per plan)
# --------------------

class SeqState(TypedDict):
    project_id: str
    txt_project_documents: List[Dict[str, Any]]
    # results: append minimal summaries per plan
    results: List[Dict[str, Any]]
    organization_id: NotRequired[Optional[str]]
    qse_references: NotRequired[Dict[str, List[Dict[str, Any]]]]

class SeqInput(TypedDict):
    project_id: str
    organization_id: NotRequired[Optional[str]]

class SeqOutput(TypedDict):
    results: List[Dict[str, Any]]
    organization_id: NotRequired[Optional[str]]
    qse_references: NotRequired[Dict[str, List[Dict[str, Any]]]]

def seq_fetch_docs_node(state: SeqState) -> SeqState:
    # Use the txt_project_documents that were already extracted by document_extraction.py
    # Fail fast: do NOT fetch from database here
    if state.get("txt_project_documents"):
        # Already have extracted documents from document_extraction.py
        return {**state, "results": state.get("results", [])}
    raise ValueError("txt_project_documents missing; sequencer requires upstream extraction (no DB fallback)")

def _gen_and_save(plan_type: str, state: SeqState) -> SeqState:
    state, ims_block, qse_content_block = _prepare_qse_context(state, plan_type)
    docs_text = "\n\n".join(
        [f"Document: {d['file_name']} (ID: {d['id']})\n{d['content']}" for d in state["txt_project_documents"]]
    )
    system_prompt = PLAN_TO_PROMPT[plan_type]
    qse_context = json.dumps(QSE_SYSTEM_NODES)
    qse_summary = QSE_SYSTEM_SUMMARY
    output_instructions = (
        "\n\nOUTPUT FORMAT (STRICT): Return JSON with a single field 'html' that contains the FINAL HTML BODY ONLY. "
        "Do NOT include <html>, <head>, or <body> tags. Use semantic HTML elements (h1-h3, p, ul/ol, table, a). "
        "Render a complete, professional management plan suitable for direct display and TinyMCE editing."
    )
    prompt = (
        f"{system_prompt}\n\n"
        f"QSE SYSTEM SUMMARY:\n{qse_summary}\n\n"
        f"QSE SYSTEM REFERENCE (adjacency list):\n{qse_context}\n\n"
        f"IMS DOCUMENTS ({plan_type.upper()} PLAN FOCUS):\n{ims_block}\n\n"
        f"QSE DOCUMENT CONTENT ({plan_type.upper()} PLAN):\n{qse_content_block}\n\n"
        f"PROJECT DOCUMENTS:\n{docs_text}"
        f"{VERBOSITY_DIRECTIVE}"
        f"{ENGINEERING_IMPLEMENTATION_DIRECTIVE}"
        f"{QSE_REFERENCING_DIRECTIVE}"
        f"{NUMBERING_AND_ARTIFACTS_DIRECTIVE}"
        f"{output_instructions}"
    )
    structured_llm = llm.with_structured_output(PlanHtml, method="json_mode")
    response = structured_llm.invoke(prompt)
    html = response.html
    # Persist to knowledge graph via action_graph_repo (assets only)
    defaults = _default_category_and_tags_for_plan_type(plan_type)
    source_document_ids = [d.get("id") for d in state.get("txt_project_documents", []) if d.get("id")]
    metadata = {
        "plan_type": plan_type,
        "category": defaults.get("category"),
        "tags": defaults.get("tags"),
        "source_document_ids": source_document_ids,
    }
    spec = IdempotentAssetWriteSpec(
        asset_type="plan",
        asset_subtype=plan_type,
        name=f"{plan_type.upper()} Plan",
        description=f"{plan_type.upper()} Plan generated from project documents",
        project_id=state["project_id"],
        metadata=metadata,
        content={"html": html},
        idempotency_key=f"plan:{state['project_id']}:{plan_type}",
        edges=[],
    )
    upsertAssetsAndEdges([spec])
    summary = {"plan_type": plan_type, "title": f"{plan_type.upper()} Plan"}
    results = [*(state.get("results") or []), summary]
    return {**state, "results": results}

def seq_generate_pqp_node(state: SeqState) -> SeqState:
    return _gen_and_save("pqp", state)


def seq_generate_emp_node(state: SeqState) -> SeqState:
    return _gen_and_save("emp", state)


def seq_generate_ohsmp_node(state: SeqState) -> SeqState:
    return _gen_and_save("ohsmp", state)


def seq_generate_tmp_node(state: SeqState) -> SeqState:
    return _gen_and_save("tmp", state)

def seq_generate_constr_node(state: SeqState) -> SeqState:
    # Temporarily skip construction program generation
    return state

seq_builder = StateGraph(SeqState, input=SeqInput, output=SeqOutput)
seq_builder.add_node("fetch_docs", seq_fetch_docs_node)
seq_builder.add_node("gen_pqp", seq_generate_pqp_node)
seq_builder.add_node("gen_emp", seq_generate_emp_node)
seq_builder.add_node("gen_ohsmp", seq_generate_ohsmp_node)
seq_builder.add_node("gen_tmp", seq_generate_tmp_node)
seq_builder.add_node("gen_constr", seq_generate_constr_node)

seq_builder.add_edge(START, "fetch_docs")
seq_builder.add_edge("fetch_docs", "gen_pqp")
seq_builder.add_edge("gen_pqp", "gen_emp")
seq_builder.add_edge("gen_emp", "gen_ohsmp")
seq_builder.add_edge("gen_ohsmp", "gen_tmp")
seq_builder.add_edge("gen_tmp", END)

plan_generation_sequencer_graph = seq_builder.compile()

# Convenience wrappers to run with only project_id
def run_single_plan(project_id: str, plan_type: Optional[str] = None) -> Dict[str, Any]:
    """Run the single-plan graph using only a project_id (plan_type optional, defaults to 'pqp')."""
    inputs: InputState = {"project_id": project_id, "plan_type": plan_type}
    return plan_generation_graph.invoke(inputs)

def run_all_plans(project_id: str) -> Dict[str, Any]:
    """Run the sequencer to generate all plans using only a project_id."""
    seq_inputs: SeqInput = {"project_id": project_id}
    return plan_generation_sequencer_graph.invoke(seq_inputs)





def create_plan_generation_graph():
    """Factory exported for orchestrator integration (v10). Returns single-plan subgraph (no checkpointer)."""
    return builder.compile()
