# Neo4j Database Connection Details

## Overview

Three Neo4j databases are available for your task:

1. **Standards Database** - Reference specifications and standards (READ ONLY)
2. **Project Docs Database** - Project-specific documents (READ ONLY)
3. **Generated Database** - Your output destination (WRITE ACCESS)

## Database 1: Standards (Port 7687)

**Purpose:** Reference specifications & standards (MRTS, MRS, test methods, Australian Standards)

**Connection Details:**
- URI: `neo4j://localhost:7687`
- Username: `neo4j`
- Password: `5b01beec33ac195e1e75acb6d90b4944`
- HTTP Port: 7474
- Browser URL: http://localhost:7474
- Database Name: `neo4j` (default)

**Access:** READ ONLY

**Content:**
- Australian Standards (AS, AS/NZS)
- State road authority specifications (MRTS, MRS, QA Specs, etc.)
- Test method standards (AS 1012, AS 1289, AS 1141, etc.)
- International standards (ISO, ASTM)
- Jurisdiction-specific standards for all Australian states/territories

**Cypher-Shell Command:**
```bash
cypher-shell -a neo4j://localhost:7687 -u neo4j -p 5b01beec33ac195e1e75acb6d90b4944
```

**Python Connection Example:**
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "neo4j://localhost:7687",
    auth=("neo4j", "5b01beec33ac195e1e75acb6d90b4944")
)

with driver.session(database="neo4j") as session:
    result = session.run("MATCH (s:Standard) RETURN s LIMIT 5")
    for record in result:
        print(record["s"])

driver.close()
```

## Database 2: Project Docs (Port 7688)

**Purpose:** Project-specific construction documents (ITPs, plans, schedules, specifications, drawings)

**Connection Details:**
- URI: `neo4j://localhost:7688`
- Username: `neo4j`
- Password: `27184236e197d5f4c36c60f453ebafd9`
- HTTP Port: 7475
- Browser URL: http://localhost:7475
- Database Name: `neo4j` (default)

**Access:** READ ONLY

**Content:**
- Project documents (specifications, contracts, reports)
- Document content and metadata
- Project-specific requirements
- Document relationships and references
- Extracted project information

**Cypher-Shell Command:**
```bash
cypher-shell -a neo4j://localhost:7688 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

**Python Connection Example:**
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "neo4j://localhost:7688",
    auth=("neo4j", "27184236e197d5f4c36c60f453ebafd9")
)

with driver.session(database="neo4j") as session:
    result = session.run(
        "MATCH (d:Document {project_id: $projectId}) RETURN d LIMIT 10",
        projectId="your-project-id"
    )
    for record in result:
        print(record["d"])

driver.close()
```

## Database 3: Generated Content (Port 7690)

**Purpose:** AI-generated content, responses, and your output destination

**Connection Details:**
- URI: `neo4j://localhost:7690`
- Username: `neo4j`
- Password: `27184236e197d5f4c36c60f453ebafd9`
- HTTP Port: 7477
- Browser URL: http://localhost:7477
- Database Name: `neo4j` (default)

**Access:** READ and WRITE

**Content:**
- Your generated output (ITPs, WBS, LBS, project details, etc.)
- AI-generated responses
- Processed and structured data
- Output graphs and relationships

**Cypher-Shell Command:**
```bash
cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9
```

**Python Connection Example:**
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "neo4j://localhost:7690",
    auth=("neo4j", "27184236e197d5f4c36c60f453ebafd9")
)

with driver.session(database="neo4j") as session:
    # Write operation
    session.run("""
        CREATE (n:YourNodeType {
            id: $id,
            property1: $value1,
            createdAt: datetime()
        })
    """, id="unique-id", value1="some-value")
    
    # Read to verify
    result = session.run("MATCH (n:YourNodeType {id: $id}) RETURN n", id="unique-id")
    for record in result:
        print(record["n"])

driver.close()
```

## Connection Best Practices

### 1. Always Close Connections

```python
driver = GraphDatabase.driver(uri, auth=(user, password))
try:
    # Your operations
    pass
finally:
    driver.close()
```

### 2. Use Context Managers

```python
with driver.session(database="neo4j") as session:
    # Your operations
    pass
# Session automatically closed
```

### 3. Use Transactions for Writes

```python
with driver.session(database="neo4j") as session:
    with session.begin_transaction() as tx:
        tx.run("CREATE (n:Node {id: $id})", id="123")
        tx.run("CREATE (n:Node {id: $id})", id="124")
        tx.commit()
```

### 4. Handle Errors Gracefully

```python
from neo4j.exceptions import ServiceUnavailable, AuthError

try:
    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session() as session:
        result = session.run("MATCH (n) RETURN n LIMIT 1")
        print(result.single())
except ServiceUnavailable:
    print("Cannot connect to Neo4j database")
except AuthError:
    print("Authentication failed")
finally:
    driver.close()
```

### 5. Use Parameters

Always use parameterized queries to prevent injection:

```python
# Good
session.run("MATCH (n {id: $id}) RETURN n", id=user_input)

# Bad - vulnerable to injection
session.run(f"MATCH (n {{id: '{user_input}'}}) RETURN n")
```

## Testing Connections

### Test Standards Database

```cypher
// Connect to port 7687
MATCH (s:Standard)
RETURN count(s) AS totalStandards
```

### Test Project Docs Database

```cypher
// Connect to port 7688
MATCH (d:Document)
RETURN count(d) AS totalDocuments
```

### Test Generated Database (Write)

```cypher
// Connect to port 7690
CREATE (test:TestNode {id: 'test-123', createdAt: datetime()})
RETURN test
```

```cypher
// Verify and clean up
MATCH (test:TestNode {id: 'test-123'})
DELETE test
```

## Common Issues

### Connection Refused
- Check that Neo4j instance is running
- Verify port numbers are correct
- Check firewall settings

### Authentication Failed
- Verify username and password
- Check for typos in credentials
- Confirm database has been initialized with these credentials

### Database Not Found
- Ensure database name is correct (default is "neo4j")
- Check that database has been created
- Verify you have access to the database

### Timeout Errors
- Check network connectivity
- Verify Neo4j service is responsive
- Consider increasing timeout settings

## Security Notes

- **Standards Database** and **Project Docs Database** are READ ONLY - write attempts will fail
- **Generated Database** has write access - be careful with destructive operations
- Always validate your queries before executing
- Never delete data from source databases
- Keep credentials secure - don't commit to version control

## Summary

| Database | Port | Access | Purpose |
|----------|------|--------|---------|
| Standards | 7687 | READ ONLY | Reference standards & specifications |
| Project Docs | 7688 | READ ONLY | Project documents & requirements |
| Generated | 7690 | READ & WRITE | Your output destination |

All databases:
- Username: `neo4j`
- Passwords: See above for each database
- Default database name: `neo4j`

**Remember:** Read from ports 7687 and 7688, write to port 7690!

