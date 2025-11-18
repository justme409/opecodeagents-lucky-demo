# IMS/QSE System Integration Guide

## Overview

The IMS (Integrated Management System) database contains your corporate QSE (Quality, Safety, Environmental) procedures, policies, templates, and registers. When generating management plans (PQP, EMP, OHSMP, TMP), agents should **reference existing corporate content** rather than duplicating it.

## Connection Details

```
URI:      neo4j://localhost:7689
Username: neo4j
Password: ims_qse_2024_secure
Database: neo4j
```

## Integration Workflow

### 1. Query for Relevant Corporate Content

Before writing project-specific content for any section, search the IMS for relevant corporate procedures:

```cypher
// Example: Find quality-related procedures
MATCH (item:QSEItem)
WHERE item.type = 'Procedure'
  AND (item.category CONTAINS 'Quality' 
       OR 'quality' IN item.keywords
       OR item.isoClause STARTS WITH '8.')
RETURN item.id, item.title, item.path, item.type
ORDER BY item.title
```

### 2. Search by Keywords

```cypher
// Find items related to specific topics
MATCH (item:QSEItem)
WHERE ANY(keyword IN item.keywords WHERE keyword IN ['ncr', 'non-conformance', 'corrective'])
  AND item.status = 'approved'
RETURN item.id, item.title, item.path, item.type
```

### 3. Search by ISO Clause

```cypher
// Find items for a specific ISO clause
MATCH (item:QSEItem {isoClause: '8.1'})
WHERE item.status = 'approved'
RETURN item.id, item.title, item.path, item.type
```

### 4. Find Templates

```cypher
// Find relevant templates
MATCH (item:QSEItem {type: 'Template'})
WHERE item.title CONTAINS $searchTerm
RETURN item.id, item.title, item.path
```

## Content Integration Patterns

### Pattern 1: Reference Existing Procedure

When a corporate procedure exists, reference it in your DocumentSection body:

```markdown
## Non-Conformance Management

All non-conformances shall be managed in accordance with the corporate 
[Non-Conformance Report Procedure](https://projectpro.pro/ims/ncr/ncr-procedure) 
(QSE-10.2-PROC-01).

### Project-Specific Requirements

In addition to the corporate procedure, the following project requirements apply:
- Notify Superintendent within 24 hours for minor NCRs
- Stop work immediately for critical NCRs
```

### Pattern 2: No Corporate Procedure Exists

When no corporate procedure exists, write project-specific content and note it:

```markdown
## Contaminated Land Management

**Note:** This is a project-specific procedure developed for this contract. 
No corporate equivalent is available.

[Full project-specific content here...]
```

### Pattern 3: Supplement Corporate Procedure

When corporate procedure needs project-specific additions:

```markdown
## Materials Approval

Follow the corporate [Materials Approval Procedure](https://projectpro.pro/ims/materials/materials-approval) 
(QSE-QA-025) with the following project-specific requirements:

### Additional Project Requirements
1. All materials must be approved 14 days before delivery
2. Certificates must be uploaded to ProjectPro portal
3. Principal approval required for substitutions
```

## Available QSE Items

### By Type

- **Procedures (20):** Core process procedures
- **Registers (11):** Risk, NCR, Compliance, Training, etc.
- **Templates (8):** PQP, EMP, SWMS, ITP, TMP, etc.
- **Forms (1):** HSC Meeting Minutes
- **Policies (1):** QSE Policy Statement
- **Plans (1):** Annual QSE Objectives
- **Schedules (1):** Internal Audit Schedule

### By Category

- **Quality:** Document control, NCR, materials approval, ITP procedures
- **Safety:** WHS management, incident reporting, SWMS, fatigue management
- **Environmental:** Environmental management, spill response
- **Risk Management:** Risk procedures and registers
- **Training:** Competence procedures, training matrix, induction templates
- **Audit:** Audit procedures and schedules
- **Communication:** Communication procedures and matrices
- **Compliance:** Legal obligations register and procedures

### Key ISO Clauses Covered

- **4.1-4.2:** Context and interested parties
- **5.2-5.4:** Leadership, policy, consultation
- **6.1-6.2:** Risk management, objectives
- **7.2-7.5:** Competence, communication, documentation
- **8.1:** Operational control (construction, design, procurement, WHS, environmental)
- **9.1-9.3:** Monitoring, audit, management review
- **10.2-10.3:** NCR and continual improvement

## Example Queries for Plan Generation

### For PQP Generation

```cypher
// Find quality procedures and templates
MATCH (item:QSEItem)
WHERE item.type IN ['Procedure', 'Template', 'Register']
  AND (item.category CONTAINS 'Quality' 
       OR item.category CONTAINS 'Op Procedures Templates'
       OR item.isoClause IN ['8.1', '9.1', '9.2', '10.2'])
  AND item.status = 'approved'
RETURN item.id, item.title, item.path, item.type, item.category
ORDER BY item.isoClause, item.title
```

### For OHSMP Generation

```cypher
// Find safety procedures and templates
MATCH (item:QSEItem)
WHERE item.type IN ['Procedure', 'Template', 'Register']
  AND (item.title CONTAINS 'WHS' 
       OR item.title CONTAINS 'Safety'
       OR item.title CONTAINS 'SWMS'
       OR item.title CONTAINS 'Incident'
       OR 'safety' IN item.keywords)
  AND item.status = 'approved'
RETURN item.id, item.title, item.path, item.type
ORDER BY item.title
```

### For EMP Generation

```cypher
// Find environmental procedures and templates
MATCH (item:QSEItem)
WHERE item.type IN ['Procedure', 'Template']
  AND (item.title CONTAINS 'Environmental'
       OR item.title CONTAINS 'EMP'
       OR 'environmental' IN item.keywords)
  AND item.status = 'approved'
RETURN item.id, item.title, item.path, item.type
ORDER BY item.title
```

## Storing IMS References

When creating DocumentSection nodes, optionally store IMS references:

```cypher
CREATE (section:DocumentSection {
  projectId: $projectId,
  containerType: 'ManagementPlan',
  containerId: $planId,
  heading: 'Non-Conformance Management',
  body: $markdownContent,
  imsReferences: [
    {
      id: 'QSE-10.2-PROC-01',
      title: 'Non-Conformance Report Procedure',
      path: '/ims/ncr/ncr-procedure',
      type: 'Procedure'
    }
  ],
  createdAt: datetime(),
  updatedAt: datetime()
})
```

## URL Construction

All IMS items have a `path` property. To create clickable links:

```
https://projectpro.pro{item.path}
```

Example:
```
https://projectpro.pro/ims/ncr/ncr-procedure
```

## Best Practices

1. **Always search IMS first** before writing project-specific content
2. **Reference, don't duplicate** - Link to corporate procedures
3. **Be explicit** - Clearly separate corporate vs project-specific requirements
4. **Maintain traceability** - Store IMS references in section metadata
5. **Use consistent linking** - Always use the full URL format
6. **Check status** - Only reference items with `status = 'approved'`
7. **Follow the hierarchy** - Respect ISO clause structure when organizing content

## Common IMS Items by Plan Type

### PQP (Project Quality Plan)
- QSE-7.5-PROC-01: Document Control
- QSE-10.2-PROC-01: NCR Procedure
- QSE-8.1-PROC-05: Construction Control
- QSE-8.1-PROC-07: Procurement
- QSE-8.1-TEMP-ITP: ITP Template
- QSE-8.1-TEMP-PQP: PQP Template

### OHSMP (OHS Management Plan)
- QSE-8.1-PROC-03: WHS Management
- QSE-8.1-PROC-02: Incident Reporting
- QSE-8.1-TEMP-SWMS: SWMS Template
- QSE-5.4-PROC-01: Consultation
- QSE-7.2-PROC-01: Training & Competence
- QSE-8.1-TEMP-01: Emergency Plan Template

### EMP (Environmental Management Plan)
- QSE-8.1-PROC-04: Environmental Management
- QSE-8.1-PROC-02: Incident Reporting
- QSE-6.1-REG-03: Compliance Obligations
- QSE-9.1-PROC-01: Monitoring & Measurement

### TMP (Traffic Management Plan)
- QSE-8.1-TEMP-TMP: TMP Template
- QSE-8.1-PROC-03: WHS Management
- QSE-7.2-PROC-01: Training & Competence

## Troubleshooting

### No Results Found
- Check your keywords are lowercase
- Try broader search terms
- Search by ISO clause instead of keywords
- Check if the item type is correct

### Multiple Matches
- Filter by `isoClause` for more specific results
- Use `category` to narrow down results
- Check `orderIndex` to find the primary item

### Outdated Content
- Always filter by `status = 'approved'`
- Check `updatedAt` timestamp if needed
- Prefer items with higher `version` numbers

