# Neo4j Standards Schema (Essentials)

**Database:** Standards (read-only, port 7687)

This database stores jurisdictional reference specs and standards. Use it to anchor project outputs to official requirements.

## 1. Core Shape
- `Document` → `DocumentSection` (`HAS_SECTION`) is the entire hierarchy. All real content lives in `DocumentSection.text`; there are no Clause nodes.
- Sections are ordered with `order`, nested with `PARENT_OF`, and may carry tables/figures via `HAS_TABLE` / `HAS_FIGURE`.
- Some deployments expose `Chunk` nodes for vector search (`Chunk` → `Document` via `FROM_DOCUMENT`), but treat them as optional—fall back to section text search if absent.

## 2. Must-Know Fields
- `Document` nodes include `document_number`, `document_name`, `jurisdiction`, `state_road_agency`, `type`, `revision`.
- `DocumentSection` nodes mirror those properties plus hierarchy info (`parent_id`, `heading_number`, `level`). `text` is the only reliable content field; `heading` may be empty on leaf nodes.
- Jurisdiction strings use the full format: e.g. `'QLD, Queensland'`, `'SA, South Australia'`, `'National'`. Always include national results alongside the state you care about.

## 3. Query Shortcuts
- List available material quickly: `CALL db.labels()` / `CALL db.relationshipTypes()`.
- Filter by jurisdiction: `(node.jurisdiction = $jurisdiction OR node.jurisdiction = 'National')`.
- To navigate the hierarchy, grab top sections with `parent_id IS NULL` (or no incoming `PARENT_OF`) and collect descendants.
- Content search = section text search. Example mental pattern: `MATCH (d:Document)-[:HAS_SECTION]->(sec)` + jurisdiction filter + `sec.text CONTAINS 'test method'`.
- When `Chunk` nodes exist, query their vector/full-text index, then jump back to `Document` for context.

## 4. Typical Lookups
- Catalogue standards by jurisdiction: list `Document.document_number`/`document_name` filtered as above.
- Pull specific clauses: `MATCH (d)-[:HAS_SECTION]->(sec) WHERE sec.text CONTAINS $keyword` and return snippets.
- Extract tables/figures: `MATCH (sec)-[:HAS_TABLE]->(t)` or `HAS_FIGURE` for the relevant document.
- When semantic nodes like `Material`, `TestRequirement`, `TestMethod` exist, treat them as conveniences; otherwise rely on section text.

## 5. Best Practices
- Respect READ-ONLY: never attempt writes here.
- Use LIMIT while exploring; standards can be large.
- Always return the document number/title with any section to keep citations clear.
- National standards frequently complement state specs—surface both when mapping compliance.
- Ignore generic labels (`__Entity__`, `__KGBuilder__`); stick to `Document`/`DocumentSection` unless you confirm richer entities exist.

Armed with these hints plus your master/agent schema, you can quickly locate jurisdictional requirements without the full-length reference doc.
