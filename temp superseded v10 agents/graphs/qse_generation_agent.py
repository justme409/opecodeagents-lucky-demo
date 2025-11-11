import os
import json
import importlib.util
from typing import Any, Dict, List, Optional, Annotated
from operator import add
from typing_extensions import TypedDict

from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.tools.db_tools import upsert_qse_asset


def _qse_items_dir() -> str:
    here = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(here, "..", "prompts", "QSE_items"))


def _load_item(filename: str) -> Dict[str, Any]:
    """Load a QSE item prompt module by filename and return dict with item_id, title, html."""
    directory = _qse_items_dir()
    fpath = os.path.join(directory, filename)
    spec = importlib.util.spec_from_file_location(
        f"qse_item_{os.path.splitext(filename)[0].replace('-', '_').replace('.', '_')}",
        fpath,
    )
    if not spec or not spec.loader:
        raise RuntimeError(f"Unable to load QSE item: {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[arg-type]
    item_id = getattr(module, "ITEM_ID", None)
    title = getattr(module, "TITLE", None)
    html = getattr(module, "HTML", None)
    if not isinstance(item_id, str) or not isinstance(title, str) or not isinstance(html, str):
        raise ValueError(f"Invalid QSE item module (missing ITEM_ID/TITLE/HTML): {filename}")
    return {"item_id": item_id, "title": title, "html": html}


llm = ChatGoogleGenerativeAI(
    model=os.getenv("GEMINI_MODEL_2"),
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.1,
    max_output_tokens=65536,
    include_thoughts=False,
    thinking_budget=-1,
)


def _load_default_company_profile() -> Dict[str, Any]:
    """Load the example company profile JSON bundled with QSE items.
    Returns an empty dict if unavailable (agent will still run, but less tailored).
    """
    try:
        path = os.path.join(_qse_items_dir(), "QSE_company_profile.example.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


DEFAULT_COMPANY_PROFILE: Dict[str, Any] = _load_default_company_profile()


STRICT_OUTPUT_RULES = (
    "\n\nSTRICT OUTPUT CONTRACT:"
    "\n- Return a SINGLE JSON object that conforms to the schema."
    "\n- Do not include extra commentary."
    "\n- The html must be complete, semantic HTML fragments for the DOCUMENT BODY ONLY (do not include <html> or <body> tags)."
    "\n- Preserve EXACT section titles and exemplar wording unless replacing bracketed placeholders (e.g., [Company Name])."
    "\n- Keep all body-level formatting: headings (h1–h6), paragraphs, lists, blockquotes, tables, bold/italic/underline, and inline links."
    "\n- Remove any React/TSX-specific syntax (e.g., className, onClick, JSX). Output clean HTML attributes only."
    "\n- Do NOT include page-level UI wrappers or decorations: no outer <section> blocks, layout containers, accordions/toggles, icons, colored panels, borders, or grid cards."
    "\n- Do NOT include document metadata panels that belong to the page chrome (e.g., 'Document ID:', 'Revision:', 'Effective Date:', 'Approver:' blocks) unless they are an explicit part of the canonical document body."
    "\n- Exclude any interactive elements or script-dependent behaviors."
)

PRESERVATION_RULES = (
    "\n\nPRESERVATION & TAILORING RULES:"
    "\n- Treat the provided exemplar as authoritative for structure, headings, and baseline wording."
    "\n- Substitute company-specific details from COMPANY_PROFILE where placeholders appear (e.g., [Company Name], [CEO Name])."
    "\n- If a detail is missing, leave the placeholder or use '—' (em dash) rather than inventing facts."
    "\n- Do NOT add new sections or rename existing ones."
    "\n- Maintain ISO 9001/14001/45001 conformance implied by the exemplar. It is already ISO compliant so that is why no modifications to the structure is allowed."
    "\n- When the exemplar contains page-level headings or metadata wrappers in addition to the internal document title, OUTPUT ONLY the internal document title and body content."
)


class QseDocument(BaseModel):
    title: str
    document_number: str
    revision: Optional[str] = None
    html: str = Field(description="HTML fragment representing ONLY the document body (no page wrappers, no metadata panels)")
    metadata: Optional[Dict[str, Any]] = None


class GenerationState(TypedDict):
    project_id: str
    company_profile: Dict[str, Any]
    target_docs: List[str]
    results: Annotated[List[Dict[str, Any]], add]
    error: Optional[str]


class GenerationInput(TypedDict):
    project_id: str
    company_profile: Dict[str, Any]
    target_docs: Optional[List[str]]


class GenerationOutput(TypedDict):
    results: List[Dict[str, Any]]


def _compose_prompt(document_number: str, title: str, exemplar_html: str, company_profile: Dict[str, Any]) -> str:
    output_schema = (
        "\n\nOUTPUT SCHEMA (STRICT JSON): Return an object with keys:"
        "\n{"
        "\n  \"title\": string,"
        "\n  \"document_number\": string (must equal the requested document number),"
        "\n  \"revision\": string | null,"
        "\n  \"html\": string (complete semantic HTML for the document body),"
        "\n  \"metadata\": object | null"
        "\n}"
    )
    return (
        f"You are generating a corporate QSE document for publication in an IMS portal."
        f"\nTarget document: {document_number} — {title}"
        f"\n\nCOMPANY_PROFILE (JSON):\n{json.dumps(company_profile, ensure_ascii=False)}"
        f"\n\nEXEMPLAR (authoritative content extracted from a page; may include UI wrappers, metadata panels, or TSX classes):\n{exemplar_html}"
        f"\n\nIMPORTANT: The EXEMPLAR may contain page-level headings (e.g., clickable section headers), metadata grids (Document ID/Revision/etc.), icons, borders, and layout wrappers."
        f"\nYour output MUST contain ONLY the clean document body content suitable for direct rendering inside a page body container."
        f"{PRESERVATION_RULES}"
        f"{STRICT_OUTPUT_RULES}"
        f"{output_schema}"
    )


def _determine_asset_type(document_number: str) -> str:
    """Map QSE document number patterns to valid asset types."""
    if not document_number:
        return "document"
    upper_id = document_number.upper()
    if "-PROC-" in upper_id:
        return "procedure"
    if "-POL-" in upper_id:
        return "policy"
    if "-REG-" in upper_id:
        return "record"
    if "-FORM-" in upper_id:
        return "form"
    if "-PLN-" in upper_id:
        return "plan"
    if "-MAN-" in upper_id or "-STMT-" in upper_id:
        return "document"
    # Fallback for corporate overview style IDs, treat as documents
    return "document"


def _generate_and_save_loaded(item: Dict[str, Any], state: GenerationState) -> Dict[str, Any]:
    doc_id = item["item_id"]
    title = item["title"]
    exemplar_html = item["html"]
    company_profile: Dict[str, Any] = state.get("company_profile") or DEFAULT_COMPANY_PROFILE or {}
    prompt = _compose_prompt(doc_id, title, exemplar_html, company_profile)
    structured = llm.with_structured_output(QseDocument, method="json_mode")
    doc: QseDocument = structured.invoke(prompt)

    if doc.document_number != doc_id:
        doc = QseDocument(**{**doc.model_dump(), "document_number": doc_id})

    classification = _determine_asset_type(doc_id)
    asset_type = classification
    upsert_qse_asset.invoke(
        {
            "project_id": state["project_id"],
            "asset_type": asset_type,
            "subtype": "qse_doc",
            "name": f"{doc.document_number} - {doc.title}",
            "document_number": doc.document_number,
            "content": {"html": doc.html, "title": doc.title, "revision": doc.revision, "metadata": doc.metadata},
            "metadata": {
                "category": "qse",
                "document_number": doc.document_number,
                "title": doc.title,
                "classification": classification,
                "asset_type": "qse_doc",
            },
        }
    )

    return {"document_number": doc.document_number, "title": doc.title}


def init_node(state: GenerationState) -> GenerationState:
    # Ensure defaults when invoked without explicit inputs (e.g., via API runner)
    normalized: GenerationState = {**state}  # type: ignore[assignment]
    if not normalized.get("company_profile"):
        normalized["company_profile"] = DEFAULT_COMPANY_PROFILE or {}
    normalized["results"] = []
    return normalized


def _maybe_skip(state: GenerationState, current_doc_id: str) -> bool:
    target = state.get("target_docs")
    return bool(target) and (current_doc_id not in target)


def _load_and_generate(filename: str, state: GenerationState) -> Optional[Dict[str, Any]]:
    item = _load_item(filename)
    if _maybe_skip(state, item["item_id"]):
        return None
    return _generate_and_save_loaded(item, state)


_FILES = [
    "corp-improvement__overview__0001.py",
    "corp-performance__overview__0001.py",
    "corp-leadership__overview__0001.py",
    "corp-planning__overview__0001.py",
    "corp-support__overview__0001.py",
    "corp-operation__overview__0001.py",
    "corporate-tier-1__ims-scope__0002__QSE-4.3-STMT-01.py",
    "corporate-tier-1__ims-manual__0001__QSE-1-MAN-01.py",
    "corp-risk-management__opportunity-register__0003__QSE-6.1-REG-02.py",
    "corp-risk-management__risk-register__0002__QSE-6.1-REG-01.py",
    "corp-risk-management__risk-procedure__0001__QSE-6.1-PROC-01.py",
    "corp-review__review-procedure__0001__QSE-9.3-PROC-01.py",
    "corp-policy-roles__qse-policy__0001__QSE-5.2-POL-01.py",
    "corp-policy-roles__roles-matrix__0002__QSE-5.3-REG-01.py",
    "corp-op-procedures-templates__construction-control__0016__QSE-8.1-PROC-05.py",
    "corp-op-procedures-templates__design-control__0017__QSE-8.1-PROC-06.py",
    "corp-op-procedures-templates__environmental-mgmt__0015__QSE-8.1-PROC-04.py",
    "corp-op-procedures-templates__procurement__0018__QSE-8.1-PROC-07.py",
    "corp-op-procedures-templates__whs-mgmt__0014__QSE-8.1-PROC-03.py",
    "corp-op-procedures-templates__incident-report__0012__QSE-8.1-PROC-02.py",
    "corp-op-procedures-templates__pqp-template__0002__QSE-8.1-TEMP-PQP.py",
    "corp-op-procedures-templates__proj-mgmt__0001__QSE-8.1-PROC-01.py",
    "corp-objectives__objectives-plan__0002__QSE-6.2-PLN-01.py",
    "corp-objectives__objectives-procedure__0001__QSE-6.2-PROC-01.py",
    "corp-ncr__ncr-procedure__0001__QSE-10.2-PROC-01.py",
    "corp-ncr__ncr-register__0002__QSE-10.2-REG-01.py",
    "corp-monitoring__monitoring-procedure__0001__QSE-9.1-PROC-01.py",
    "corp-legal__legal-procedure__0001__QSE-6.1-PROC-02.py",
    "corp-legal__legal-register__0002__QSE-6.1-REG-03.py",
    "corp-documentation__documentation-procedure__0001__QSE-7.5-PROC-01.py",
    "corp-documentation__master-register__0002__QSE-7.5-REG-01.py",
    "corp-continual-improvement__improvement-register__0002__QSE-10.3-REG-01.py",
    "corp-continual-improvement__improvement-procedure__0001__QSE-10.3-PROC-01.py",
    "corp-context__context-procedure__0001__QSE-4.1-PROC-01.py",
    "corp-context__issues-register__0002__QSE-4.1-REG-01.py",
    "corp-context__stakeholders-register__0003__QSE-4.2-REG-01.py",
    "corp-consultation__hsc-minutes__0002__QSE-5.4-FORM-01.py",
    "corp-consultation__consult-procedure__0001__QSE-5.4-PROC-01.py",
    "corp-competence__competence-procedure__0001__QSE-7.2-PROC-01.py",
    "corp-competence__training-matrix__0002__QSE-7.2-REG-01.py",
    "corp-communication__communication-matrix__0002__QSE-7.4-REG-01.py",
    "corp-communication__communication-procedure__0001__QSE-7.4-PROC-01.py",
    "corp-audit__audit-procedure__0001__QSE-9.2-PROC-01.py",
    "corp-audit__audit-schedule__0002__QSE-9.2-SCHED-01.py",
]


# Explicit node functions (hard-coded). Each loads its specific file and generates one asset.

def gen_corp_improvement__overview__0001(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-improvement__overview__0001.py", state)
    return {"results": [res] if res else []}


def gen_corp_performance__overview__0001(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-performance__overview__0001.py", state)
    return {"results": [res] if res else []}


def gen_corp_leadership__overview__0001(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-leadership__overview__0001.py", state)
    return {"results": [res] if res else []}


def gen_corp_planning__overview__0001(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-planning__overview__0001.py", state)
    return {"results": [res] if res else []}


def gen_corp_support__overview__0001(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-support__overview__0001.py", state)
    return {"results": [res] if res else []}


def gen_corp_operation__overview__0001(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-operation__overview__0001.py", state)
    return {"results": [res] if res else []}


def gen_corporate_tier_1__ims_scope__0002__QSE_4_3_STMT_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corporate-tier-1__ims-scope__0002__QSE-4.3-STMT-01.py", state)
    return {"results": [res] if res else []}


def gen_corporate_tier_1__ims_manual__0001__QSE_1_MAN_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corporate-tier-1__ims-manual__0001__QSE-1-MAN-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_risk_management__opportunity_register__0003__QSE_6_1_REG_02(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-risk-management__opportunity-register__0003__QSE-6.1-REG-02.py", state)
    return {"results": [res] if res else []}


def gen_corp_risk_management__risk_register__0002__QSE_6_1_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-risk-management__risk-register__0002__QSE-6.1-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_risk_management__risk_procedure__0001__QSE_6_1_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-risk-management__risk-procedure__0001__QSE-6.1-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_review__review_procedure__0001__QSE_9_3_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-review__review-procedure__0001__QSE-9.3-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_policy_roles__qse_policy__0001__QSE_5_2_POL_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-policy-roles__qse-policy__0001__QSE-5.2-POL-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_policy_roles__roles_matrix__0002__QSE_5_3_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-policy-roles__roles-matrix__0002__QSE-5.3-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__construction_control__0016__QSE_8_1_PROC_05(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__construction-control__0016__QSE-8.1-PROC-05.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__design_control__0017__QSE_8_1_PROC_06(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__design-control__0017__QSE-8.1-PROC-06.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__environmental_mgmt__0015__QSE_8_1_PROC_04(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__environmental-mgmt__0015__QSE-8.1-PROC-04.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__procurement__0018__QSE_8_1_PROC_07(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__procurement__0018__QSE-8.1-PROC-07.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__whs_mgmt__0014__QSE_8_1_PROC_03(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__whs-mgmt__0014__QSE-8.1-PROC-03.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__incident_report__0012__QSE_8_1_PROC_02(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__incident-report__0012__QSE-8.1-PROC-02.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__pqp_template__0002__QSE_8_1_TEMP_PQP(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__pqp-template__0002__QSE-8.1-TEMP-PQP.py", state)
    return {"results": [res] if res else []}


def gen_corp_op_procedures_templates__proj_mgmt__0001__QSE_8_1_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-op-procedures-templates__proj-mgmt__0001__QSE-8.1-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_objectives__objectives_plan__0002__QSE_6_2_PLN_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-objectives__objectives-plan__0002__QSE-6.2-PLN-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_objectives__objectives_procedure__0001__QSE_6_2_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-objectives__objectives-procedure__0001__QSE-6.2-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_ncr__ncr_procedure__0001__QSE_10_2_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-ncr__ncr-procedure__0001__QSE-10.2-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_ncr__ncr_register__0002__QSE_10_2_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-ncr__ncr-register__0002__QSE-10.2-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_monitoring__monitoring_procedure__0001__QSE_9_1_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-monitoring__monitoring-procedure__0001__QSE-9.1-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_legal__legal_procedure__0001__QSE_6_1_PROC_02(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-legal__legal-procedure__0001__QSE-6.1-PROC-02.py", state)
    return {"results": [res] if res else []}


def gen_corp_legal__legal_register__0002__QSE_6_1_REG_03(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-legal__legal-register__0002__QSE-6.1-REG-03.py", state)
    return {"results": [res] if res else []}


def gen_corp_documentation__documentation_procedure__0001__QSE_7_5_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-documentation__documentation-procedure__0001__QSE-7.5-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_documentation__master_register__0002__QSE_7_5_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-documentation__master-register__0002__QSE-7.5-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_continual_improvement__improvement_register__0002__QSE_10_3_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-continual-improvement__improvement-register__0002__QSE-10.3-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_continual_improvement__improvement_procedure__0001__QSE_10_3_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-continual-improvement__improvement-procedure__0001__QSE-10.3-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_context__context_procedure__0001__QSE_4_1_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-context__context-procedure__0001__QSE-4.1-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_context__issues_register__0002__QSE_4_1_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-context__issues-register__0002__QSE-4.1-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_context__stakeholders_register__0003__QSE_4_2_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-context__stakeholders-register__0003__QSE-4.2-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_consultation__hsc_minutes__0002__QSE_5_4_FORM_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-consultation__hsc-minutes__0002__QSE-5.4-FORM-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_consultation__consult_procedure__0001__QSE_5_4_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-consultation__consult-procedure__0001__QSE-5.4-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_competence__competence_procedure__0001__QSE_7_2_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-competence__competence-procedure__0001__QSE-7.2-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_competence__training_matrix__0002__QSE_7_2_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-competence__training-matrix__0002__QSE-7.2-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_communication__communication_matrix__0002__QSE_7_4_REG_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-communication__communication-matrix__0002__QSE-7.4-REG-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_communication__communication_procedure__0001__QSE_7_4_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-communication__communication-procedure__0001__QSE-7.4-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_audit__audit_procedure__0001__QSE_9_2_PROC_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-audit__audit-procedure__0001__QSE-9.2-PROC-01.py", state)
    return {"results": [res] if res else []}


def gen_corp_audit__audit_schedule__0002__QSE_9_2_SCHED_01(state: GenerationState) -> GenerationState:
    res = _load_and_generate("corp-audit__audit-schedule__0002__QSE-9.2-SCHED-01.py", state)
    return {"results": [res] if res else []}


builder = StateGraph(GenerationState, input=GenerationInput, output=GenerationOutput)
builder.add_node("init", init_node)

builder.add_node("gen_corp_improvement__overview__0001", gen_corp_improvement__overview__0001)
builder.add_node("gen_corp_performance__overview__0001", gen_corp_performance__overview__0001)
builder.add_node("gen_corp_leadership__overview__0001", gen_corp_leadership__overview__0001)
builder.add_node("gen_corp_planning__overview__0001", gen_corp_planning__overview__0001)
builder.add_node("gen_corp_support__overview__0001", gen_corp_support__overview__0001)
builder.add_node("gen_corp_operation__overview__0001", gen_corp_operation__overview__0001)
builder.add_node("gen_corporate_tier_1__ims_scope__0002__QSE_4_3_STMT_01", gen_corporate_tier_1__ims_scope__0002__QSE_4_3_STMT_01)
builder.add_node("gen_corporate_tier_1__ims_manual__0001__QSE_1_MAN_01", gen_corporate_tier_1__ims_manual__0001__QSE_1_MAN_01)
builder.add_node("gen_corp_risk_management__opportunity_register__0003__QSE_6_1_REG_02", gen_corp_risk_management__opportunity_register__0003__QSE_6_1_REG_02)
builder.add_node("gen_corp_risk_management__risk_register__0002__QSE_6_1_REG_01", gen_corp_risk_management__risk_register__0002__QSE_6_1_REG_01)
builder.add_node("gen_corp_risk_management__risk_procedure__0001__QSE_6_1_PROC_01", gen_corp_risk_management__risk_procedure__0001__QSE_6_1_PROC_01)
builder.add_node("gen_corp_review__review_procedure__0001__QSE_9_3_PROC_01", gen_corp_review__review_procedure__0001__QSE_9_3_PROC_01)
builder.add_node("gen_corp_policy_roles__qse_policy__0001__QSE_5_2_POL_01", gen_corp_policy_roles__qse_policy__0001__QSE_5_2_POL_01)
builder.add_node("gen_corp_policy_roles__roles_matrix__0002__QSE_5_3_REG_01", gen_corp_policy_roles__roles_matrix__0002__QSE_5_3_REG_01)
builder.add_node("gen_corp_op_procedures_templates__construction_control__0016__QSE_8_1_PROC_05", gen_corp_op_procedures_templates__construction_control__0016__QSE_8_1_PROC_05)
builder.add_node("gen_corp_op_procedures_templates__design_control__0017__QSE_8_1_PROC_06", gen_corp_op_procedures_templates__design_control__0017__QSE_8_1_PROC_06)
builder.add_node("gen_corp_op_procedures_templates__environmental_mgmt__0015__QSE_8_1_PROC_04", gen_corp_op_procedures_templates__environmental_mgmt__0015__QSE_8_1_PROC_04)
builder.add_node("gen_corp_op_procedures_templates__procurement__0018__QSE_8_1_PROC_07", gen_corp_op_procedures_templates__procurement__0018__QSE_8_1_PROC_07)
builder.add_node("gen_corp_op_procedures_templates__whs_mgmt__0014__QSE_8_1_PROC_03", gen_corp_op_procedures_templates__whs_mgmt__0014__QSE_8_1_PROC_03)
builder.add_node("gen_corp_op_procedures_templates__incident_report__0012__QSE_8_1_PROC_02", gen_corp_op_procedures_templates__incident_report__0012__QSE_8_1_PROC_02)
builder.add_node("gen_corp_op_procedures_templates__pqp_template__0002__QSE_8_1_TEMP_PQP", gen_corp_op_procedures_templates__pqp_template__0002__QSE_8_1_TEMP_PQP)
builder.add_node("gen_corp_op_procedures_templates__proj_mgmt__0001__QSE_8_1_PROC_01", gen_corp_op_procedures_templates__proj_mgmt__0001__QSE_8_1_PROC_01)
builder.add_node("gen_corp_objectives__objectives_plan__0002__QSE_6_2_PLN_01", gen_corp_objectives__objectives_plan__0002__QSE_6_2_PLN_01)
builder.add_node("gen_corp_objectives__objectives_procedure__0001__QSE_6_2_PROC_01", gen_corp_objectives__objectives_procedure__0001__QSE_6_2_PROC_01)
builder.add_node("gen_corp_ncr__ncr_procedure__0001__QSE_10_2_PROC_01", gen_corp_ncr__ncr_procedure__0001__QSE_10_2_PROC_01)
builder.add_node("gen_corp_ncr__ncr_register__0002__QSE_10_2_REG_01", gen_corp_ncr__ncr_register__0002__QSE_10_2_REG_01)
builder.add_node("gen_corp_monitoring__monitoring_procedure__0001__QSE_9_1_PROC_01", gen_corp_monitoring__monitoring_procedure__0001__QSE_9_1_PROC_01)
builder.add_node("gen_corp_legal__legal_procedure__0001__QSE_6_1_PROC_02", gen_corp_legal__legal_procedure__0001__QSE_6_1_PROC_02)
builder.add_node("gen_corp_legal__legal_register__0002__QSE_6_1_REG_03", gen_corp_legal__legal_register__0002__QSE_6_1_REG_03)
builder.add_node("gen_corp_documentation__documentation_procedure__0001__QSE_7_5_PROC_01", gen_corp_documentation__documentation_procedure__0001__QSE_7_5_PROC_01)
builder.add_node("gen_corp_documentation__master_register__0002__QSE_7_5_REG_01", gen_corp_documentation__master_register__0002__QSE_7_5_REG_01)
builder.add_node("gen_corp_continual_improvement__improvement_register__0002__QSE_10_3_REG_01", gen_corp_continual_improvement__improvement_register__0002__QSE_10_3_REG_01)
builder.add_node("gen_corp_continual_improvement__improvement_procedure__0001__QSE_10_3_PROC_01", gen_corp_continual_improvement__improvement_procedure__0001__QSE_10_3_PROC_01)
builder.add_node("gen_corp_context__context_procedure__0001__QSE_4_1_PROC_01", gen_corp_context__context_procedure__0001__QSE_4_1_PROC_01)
builder.add_node("gen_corp_context__issues_register__0002__QSE_4_1_REG_01", gen_corp_context__issues_register__0002__QSE_4_1_REG_01)
builder.add_node("gen_corp_context__stakeholders_register__0003__QSE_4_2_REG_01", gen_corp_context__stakeholders_register__0003__QSE_4_2_REG_01)
builder.add_node("gen_corp_consultation__hsc_minutes__0002__QSE_5_4_FORM_01", gen_corp_consultation__hsc_minutes__0002__QSE_5_4_FORM_01)
builder.add_node("gen_corp_consultation__consult_procedure__0001__QSE_5_4_PROC_01", gen_corp_consultation__consult_procedure__0001__QSE_5_4_PROC_01)
builder.add_node("gen_corp_competence__competence_procedure__0001__QSE_7_2_PROC_01", gen_corp_competence__competence_procedure__0001__QSE_7_2_PROC_01)
builder.add_node("gen_corp_competence__training_matrix__0002__QSE_7_2_REG_01", gen_corp_competence__training_matrix__0002__QSE_7_2_REG_01)
builder.add_node("gen_corp_communication__communication_matrix__0002__QSE_7_4_REG_01", gen_corp_communication__communication_matrix__0002__QSE_7_4_REG_01)
builder.add_node("gen_corp_communication__communication_procedure__0001__QSE_7_4_PROC_01", gen_corp_communication__communication_procedure__0001__QSE_7_4_PROC_01)
builder.add_node("gen_corp_audit__audit_procedure__0001__QSE_9_2_PROC_01", gen_corp_audit__audit_procedure__0001__QSE_9_2_PROC_01)
builder.add_node("gen_corp_audit__audit_schedule__0002__QSE_9_2_SCHED_01", gen_corp_audit__audit_schedule__0002__QSE_9_2_SCHED_01)

_GENERATION_NODES = [
    "gen_corp_improvement__overview__0001",
    "gen_corp_performance__overview__0001",
    "gen_corp_leadership__overview__0001",
    "gen_corp_planning__overview__0001",
    "gen_corp_support__overview__0001",
    "gen_corp_operation__overview__0001",
    "gen_corporate_tier_1__ims_scope__0002__QSE_4_3_STMT_01",
    "gen_corporate_tier_1__ims_manual__0001__QSE_1_MAN_01",
    "gen_corp_risk_management__opportunity_register__0003__QSE_6_1_REG_02",
    "gen_corp_risk_management__risk_register__0002__QSE_6_1_REG_01",
    "gen_corp_risk_management__risk_procedure__0001__QSE_6_1_PROC_01",
    "gen_corp_review__review_procedure__0001__QSE_9_3_PROC_01",
    "gen_corp_policy_roles__qse_policy__0001__QSE_5_2_POL_01",
    "gen_corp_policy_roles__roles_matrix__0002__QSE_5_3_REG_01",
    "gen_corp_op_procedures_templates__construction_control__0016__QSE_8_1_PROC_05",
    "gen_corp_op_procedures_templates__design_control__0017__QSE_8_1_PROC_06",
    "gen_corp_op_procedures_templates__environmental_mgmt__0015__QSE_8_1_PROC_04",
    "gen_corp_op_procedures_templates__procurement__0018__QSE_8_1_PROC_07",
    "gen_corp_op_procedures_templates__whs_mgmt__0014__QSE_8_1_PROC_03",
    "gen_corp_op_procedures_templates__incident_report__0012__QSE_8_1_PROC_02",
    "gen_corp_op_procedures_templates__pqp_template__0002__QSE_8_1_TEMP_PQP",
    "gen_corp_op_procedures_templates__proj_mgmt__0001__QSE_8_1_PROC_01",
    "gen_corp_objectives__objectives_plan__0002__QSE_6_2_PLN_01",
    "gen_corp_objectives__objectives_procedure__0001__QSE_6_2_PROC_01",
    "gen_corp_ncr__ncr_procedure__0001__QSE_10_2_PROC_01",
    "gen_corp_ncr__ncr_register__0002__QSE_10_2_REG_01",
    "gen_corp_monitoring__monitoring_procedure__0001__QSE_9_1_PROC_01",
    "gen_corp_legal__legal_procedure__0001__QSE_6_1_PROC_02",
    "gen_corp_legal__legal_register__0002__QSE_6_1_REG_03",
    "gen_corp_documentation__documentation_procedure__0001__QSE_7_5_PROC_01",
    "gen_corp_documentation__master_register__0002__QSE_7_5_REG_01",
    "gen_corp_continual_improvement__improvement_register__0002__QSE_10_3_REG_01",
    "gen_corp_continual_improvement__improvement_procedure__0001__QSE_10_3_PROC_01",
    "gen_corp_context__context_procedure__0001__QSE_4_1_PROC_01",
    "gen_corp_context__issues_register__0002__QSE_4_1_REG_01",
    "gen_corp_context__stakeholders_register__0003__QSE_4_2_REG_01",
    "gen_corp_consultation__hsc_minutes__0002__QSE_5_4_FORM_01",
    "gen_corp_consultation__consult_procedure__0001__QSE_5_4_PROC_01",
    "gen_corp_competence__competence_procedure__0001__QSE_7_2_PROC_01",
    "gen_corp_competence__training_matrix__0002__QSE_7_2_REG_01",
    "gen_corp_communication__communication_matrix__0002__QSE_7_4_REG_01",
    "gen_corp_communication__communication_procedure__0001__QSE_7_4_PROC_01",
    "gen_corp_audit__audit_procedure__0001__QSE_9_2_PROC_01",
    "gen_corp_audit__audit_schedule__0002__QSE_9_2_SCHED_01",
]

builder.set_entry_point("init")

for node_name in _GENERATION_NODES:
    builder.add_edge("init", node_name)
    builder.add_edge(node_name, END)


def create_qse_generation_graph():
    """Factory function exposing the compiled QSE generation graph."""
    return builder.compile()


def run_qse_docs(project_id: str, company_profile: Dict[str, Any], target_docs: Optional[List[str]] = None) -> Dict[str, Any]:
    effective_profile: Dict[str, Any] = company_profile if (company_profile and len(company_profile) > 0) else DEFAULT_COMPANY_PROFILE
    inputs: GenerationInput = {
        "project_id": project_id,
        "company_profile": effective_profile,
        "target_docs": target_docs or [],
    }
    graph = create_qse_generation_graph()
    return graph.invoke(inputs)
