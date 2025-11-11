# Node Schema For Other Agents

Label: project-specific constant (matches the `projectId`)

Properties:
- `docId` (string) unique per document
- `projectId` (string) provided project scope
- `sourceProjectId` (string) original `project_documents.project_id`
- `objectKey` (string) storage key / path
- `title` (string) document name from `sections_cleaned.document_name`
- `index` (string) newline list of section headings
- `text` (string) full markdown body

Relationships: none (documents are standalone nodes)

Instructions (Full Text Sweep) — zero tolerance for truncation:
1) enumerate every document `title` belonging to the `projectId`
2) pull the complete `text` for each document; partial captures are unacceptable
3) never clip, trim, sample, or skip — if any output cuts off, rerun or adjust until you have 100% of the content
4) absolutely no preview helpers (`head`, `tail`, `cut`, `less`, `more`, `sed`, `awk`, substring limits, etc.); only full-output queries are allowed
5) do not advance to the next task until you are certain the entire document body has been captured end-to-end

Special Processing Instructions (Document Aggregation Workflow):
1) Read the first document completely from Neo4j
2) Immediately create a new file and write all pertinent details from that document as notes
3) Read the next document from Neo4j
4) Immediately append all pertinent details from that document to the same file
5) Repeat steps 3-4 for each remaining document in sequence
6) Only after all documents have been read and their details compiled into the single file, write everything back to the database
7) The database write must be done in ONE SINGLE COMMAND — no incremental writes, no multiple transactions
8) Think of the file as a running collection of big notes capturing all the key details from each document in order

Example Cypher (no truncation, replace `<PROJECT_ID>` with the actual value before running):
```bash
cypher-shell -a neo4j://localhost:7688 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 --format plain "
MATCH (d:`<PROJECT_ID>`)
RETURN d.docId AS docId, d.title AS title, d.text AS text
ORDER BY d.title;
"
```
