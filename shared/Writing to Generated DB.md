# Writing to the Generated Database

Keep commands short, execute them in `cypher-shell`, and verify results after every logical step.

## 1. Command Pattern
```cypher
// Merge or update a project node
MERGE (p:Project {projectId: $projectId})
SET p += $properties,
    p.updatedAt = datetime();
```

## 2. Relationship Pattern
```cypher
// Merge a related node and connect it
MERGE (party:Party {projectId: $projectId, code: $code})
ON CREATE SET party.createdAt = datetime()
SET party += $partyProps,
    party.updatedAt = datetime();

MERGE (p:Project {projectId: $projectId})
MERGE (party)-[:BELONGS_TO_PROJECT]->(p);
```

## 3. Execution Checklist
- Use credentials from `connection details.md`.
- Run one logical group per command (e.g., all parties, then all relationships).
- Parameterise `$projectId`, `$properties`, `$code`, `$partyProps` from `prompt.md`.
- Capture command output to confirm success or errors.
- Record any retries or manual adjustments.

## 4. Verification Queries
```cypher
// Confirm project node content
MATCH (p:Project {projectId: $projectId}) RETURN p;

// Count related nodes
MATCH (n:Party {projectId: $projectId}) RETURN count(n);

// Ensure relationships exist
MATCH (:Party {projectId: $projectId})-[:BELONGS_TO_PROJECT]->(:Project {projectId: $projectId})
RETURN count(*) AS relCount;
```

## 5. Troubleshooting
```cypher
// Check for missing required values
MATCH (n:LabelName)
WHERE n.requiredProperty IS NULL
RETURN count(n);

// Explain why a pattern failed
MATCH (a:LabelA {id: $id})
OPTIONAL MATCH (a)-[r:REL_TYPE]->(b:LabelB)
RETURN a, count(r) AS relCount, collect(b.id)[0..5] AS neighbours;
```

If a command fails, fix it, rerun, and re-verify before moving on.

