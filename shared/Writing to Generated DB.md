# Writing to the Generated Database

Agents always write through a `.cypher` script that is executed with `cypher-shell`. Keep the schema (`schemas/neo4j/master-schema.ts`) as the single source of truth for labels and property names.

## 1. Minimal Workflow (Using APOC)

1. Create a Cypher file (for example `insert_data.cypher`) in your workspace.
2. Wrap all your statements in `CALL apoc.cypher.runMany()` - see examples below.
3. Run it in one go:
   ```bash
   cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 < insert_data.cypher
   ```
4. Run spot-check queries to confirm the writes.

> **Tip:** when calling the `bash` tool, prefer `cd /workspace; cypher-shell ...` or `bash -lc "cd /workspace && cypher-shell ..."` instead of `cd ... && ...` to avoid `/bin/sh: Syntax error: "&" unexpected`.

**Why APOC?** Using `apoc.cypher.runMany` eliminates variable scoping issues. Each statement inside the string can independently MATCH nodes, so you don't need to worry about variables going out of scope.

## 2. Core Rules

### Use `MERGE` for Idempotency
- `MERGE` any node that should only exist once (Project, ManagementPlan, Lot, etc.).
- `CREATE` is only acceptable for unique child records created within the same run (e.g., individual `DocumentSection` nodes under a plan) after you have already matched the parent.

### Obey the Schema
- Property names and types must match `master-schema.ts`. Do not invent alternates.
- Example for `DocumentSection`:
  - Use `headingNumber`, `heading`, `level`, `orderIndex`, `body`, `summary`.
  - Do **not** write `title`, `sectionNumber`, `order`, or `content`.
- Example for `ManagementPlan`:
  - Key is `(projectId, type)`.
  - If you need complex arrays (e.g., `requiredItps`), serialize them to JSON strings even though the schema shows them as arrays. This is the only sanctioned deviation due to Neo4j property limitations.

### APOC Pattern - RECOMMENDED

**Use `apoc.cypher.runMany` to avoid variable scoping issues entirely.** This wraps multiple independent Cypher statements in a single transaction, where each statement can MATCH nodes independently.

#### ✅ CORRECT - APOC Pattern (RECOMMENDED)

```cypher
CALL apoc.cypher.runMany('
// Step 1: Create/update project
MERGE (p:Project {projectId: "b168e975-2531-527f-9abd-19cb8f502fe0"})
SET p.projectName = "Jervois Street Road Reconstruction",
    p.updatedAt = datetime();

// Step 2: Create/update management plan
MATCH (p:Project {projectId: "b168e975-2531-527f-9abd-19cb8f502fe0"})
MERGE (mp:ManagementPlan {projectId: p.projectId, type: "PQP"})
SET mp.title = "Project Quality Plan",
    mp.version = "1.0",
    mp.approvalStatus = "draft",
    mp.requiredItps = "[{\"docNo\":\"ITP-01\",\"workType\":\"Earthworks\",\"mandatory\":true}]",
    mp.updatedAt = datetime()
MERGE (mp)-[:BELONGS_TO_PROJECT]->(p);

// Step 3: Create section 1
MATCH (mp:ManagementPlan {projectId: "b168e975-2531-527f-9abd-19cb8f502fe0", type: "PQP"})
CREATE (sec1:DocumentSection {
  projectId: mp.projectId,
  sectionId: "PQP-SEC-1",
  headingNumber: "1.0",
  heading: "Introduction",
  level: 0,
  orderIndex: 1,
  body: "Section content here...",
  summary: "Optional synopsis",
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (mp)-[:HAS_SECTION]->(sec1);

// Step 4: Create section 2
MATCH (mp:ManagementPlan {projectId: "b168e975-2531-527f-9abd-19cb8f502fe0", type: "PQP"})
CREATE (sec2:DocumentSection {
  projectId: mp.projectId,
  sectionId: "PQP-SEC-2",
  headingNumber: "2.0",
  heading: "Quality System",
  level: 0,
  orderIndex: 2,
  body: "Section 2 content...",
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (mp)-[:HAS_SECTION]->(sec2);
', {});
```

**KEY BENEFITS:**
1. **No variable scoping issues** - each statement independently MATCHes what it needs
2. **Each step is independent** - can be understood and debugged separately
3. **Semicolons are fine** - they separate statements within the string
4. **Easy to add/remove sections** - just add another MATCH-CREATE block
5. **All executes in one transaction** - either all succeeds or all fails

**CRITICAL RULES:**
1. **Wrap everything in `CALL apoc.cypher.runMany('...', {})`**
2. **Use semicolons (`;`) to separate statements INSIDE the string**
3. **Each statement should MATCH what it needs** - don't rely on variables from previous statements
4. **Use double quotes for strings INSIDE the Cypher** - the outer string uses single quotes
5. **Escape double quotes in JSON strings** - use `\"` for JSON property values

## 3. Handling Property Types

- **Primitive types** (Neo4j-supported): strings, numbers, booleans, dates.
- **Primitive arrays** (Neo4j-supported): strings, numbers, booleans (e.g., `tags: ['quality','safety']`).
- **Nested data** (NOT Neo4j-supported): serialize to JSON strings (e.g., `requiredItps`, `itpCatalogue`).
  ```cypher
  SET mp.requiredItps = '[{"docNo":"ITP-01","workType":"Earthworks","mandatory":true}]'
  ```

**CRITICAL:** Neo4j does NOT support nested objects as node properties. Always flatten your schema:
- ❌ BAD: `keyDates: {commencementDate: "2024-01-01", ...}`
- ✅ GOOD: `commencementDate: "2024-01-01", practicalCompletionDate: "2024-12-31", ...`
- If you absolutely must store complex nested data, serialize it to a JSON string first.

## 4. Execution & Verification

- Credentials are in `shared/connection details.md`.
- Execute the file with `cypher-shell` as shown above.
- Keep the `.cypher` file so it can be re-run if necessary.
- Typical verification:
  ```bash
  echo "MATCH (mp:ManagementPlan {projectId: 'b168e975-2531-527f-9abd-19cb8f502fe0'}) RETURN mp;" \
  | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
  ```

## 5. Troubleshooting

- **Neo4j error "Property values can only be of primitive types"** → you tried to store a map/array of maps; convert it to JSON.
- **Duplicate nodes** → switch `CREATE` to `MERGE` for entities that should be unique.
- **Neo4j error "Variable `x` not defined"** → you're referencing a variable that's out of scope. Use `WITH x` to pass it forward.
- **Relationships connecting to empty unlabeled nodes** → you used `MERGE (var)-[:REL]->(other)` where `var` was out of scope, so Cypher created a new empty node. Use `WITH var` before the relationship statement.
- **Missing relationships** → check that parent variables are in scope when creating relationships. Always use `WITH` between statement blocks.

If you find yourself unsure about a field name or type, re-open `master-schema.ts`. The schema is canonical; this guide only explains how to upload data safely without contradicting it.

After executing your `.cypher` file, run verification queries:

```bash
# Confirm project node
echo "MATCH (p:Project {projectId: 'YOUR_PROJECT_ID'}) RETURN p;" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9

# Count related nodes
echo "MATCH (n:Party {projectId: 'YOUR_PROJECT_ID'}) RETURN count(n);" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9

# Verify relationships
echo "MATCH (:Party {projectId: 'YOUR_PROJECT_ID'})-[:BELONGS_TO_PROJECT]->(:Project {projectId: 'YOUR_PROJECT_ID'}) RETURN count(*) AS relCount;" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

## 6. Troubleshooting

If execution fails:

1. Check the error message from `cypher-shell`
2. Fix the problematic statement in your `.cypher` file
3. Re-execute the entire file (use `MERGE` to avoid duplicates)
4. Verify the fix with targeted queries

Example troubleshooting query:

```bash
echo "MATCH (n:LabelName) WHERE n.requiredProperty IS NULL RETURN count(n);" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

Common errors:
- **"Variable not defined"**: Check that you're using `WITH` or re-matching nodes in separate statements
- **"Property must be a map"**: You're trying to set a complex object - use Cypher map syntax
- **Duplicate nodes**: You used `CREATE` instead of `MERGE` for a unique entity

## 7. Best Practices

- Use `MERGE` for idempotency (safe to re-run)
- Group related operations (all nodes of one type, then relationships)
- Add comments to explain complex logic
- Keep the file organized and readable
- Test with a small subset first if dealing with large datasets
- Always verify your output matches the schema property names exactly

