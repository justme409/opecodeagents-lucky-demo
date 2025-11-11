"""Document Metadata Extraction Prompts (Document Management Only)
These prompts are consumed by the metadata graph to extract only the
fields required for a document register. Do NOT extract domain content
such as standards, materials, equipment, hazards, requirements, etc.
"""

# Legacy prompts removed; use UNIFIED_DOCUMENT_METADATA_PROMPT exclusively

DOCUMENT_METADATA_DRAWING_PROMPT = None

DOCUMENT_METADATA_DOCUMENT_PROMPT = None

# Unified prompt to classify and extract in a single LLM call
UNIFIED_DOCUMENT_METADATA_PROMPT = """
You are extracting register metadata for a construction project in a SINGLE step using only the provided file name and content.

Task:
- Classify the file as either a drawing or a non-drawing document using only evidence present.
- Extract ONLY document-management metadata needed for a register. Do not extract domain content like standards, requirements, risks, equipment, quantities, or narrative.

Output contract (single unified schema; leave fields null when not present):
- doc_kind: "drawing" or "document" (REQUIRED)
- document_number: string or null
- revision_code: string or null
- title: string or null
- discipline: string or null (e.g., Civil, Structural, Electrical, Mechanical, Architectural)
- classification_level: string or null (default to internal if unstated)
- category: string or null (documents only; e.g., specification, report, contract, correspondence, schedule, manual, procedure, other)
- subtype: string or null (for BOTH documents and drawings, non-prescriptive label inferred from evidence; e.g., for documents: general_spec, contract_conditions; for drawings: general_arrangement, section, elevation, detail, plan, schedule, diagram, layout)
- sheet_number: string or null (typically drawings)
- total_sheets: integer or null (typically drawings)
- scale: string or null (typically drawings; e.g., 1:100 @A1)
- additional_fields: JSON string or null. Must be a valid JSON object encoded as a string (e.g., "{{\"edition\":\"3rd\",\"issuing_body\":\"TfNSW\"}}"). Do not return structured objects here; return a string.

Guidance (non-prescriptive):
- For documents, if a broad subtype naturally fits (e.g., general_spec, technical_spec, method_statement), include it; otherwise keep null.
- Never invent values; rely only on content/title signals. If unsure, prefer null.
-- If multiple distinct items are present (e.g., multiple drawings or appended documents), ONLY extract the dominant item. Do not emit subdocuments.
- Return a single structured response adhering to the schema; no prose.

FILENAME: {file_name}
CONTENT:
{content}
"""
