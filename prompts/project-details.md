# Project Details Task

Research the project documents to gather each data point below, then persist the results using the shared writing workflow.

## Project
**Node:** `Project`
**Properties:**
- `projectId` — Use the UUID supplied in the agent prompt.
- `projectName` — Official project title. Source: cover pages, title blocks, executive summaries.
- `projectCode` — Client or contractor code when stated. Source: contract headers, registers.
- `projectDescription` — One-sentence overview. Source: executive summaries, introductions.
- `scopeSummary` — Concise scope outline. Source: scope sections, statements of work.
- `projectAddress` — Street, suburb, state, postcode. Source: title blocks, locality maps, contact sections.
- `stateTerritory` — Australian state or territory. Source: address lines, jurisdiction statements.
- `jurisdiction` — Canonical jurisdiction string (use approved list). Source: same as `stateTerritory`, compliance statements.
- `agency` — Road authority for the jurisdiction. Source: client/authority listings, tender briefs.
- `localCouncil` — Local government area. Source: planning references, environmental statements.
- `commencementDate` — Project start date. Source: programme summaries, milestone tables, contract clauses.
- `practicalCompletionDate` — Target completion date. Source: same as commencement.
- `defectsLiabilityPeriod` — Duration of defects period. Source: contract conditions, warranty sections, schedules.
**Relationships:**
- `(:SupportNode)-[:BELONGS_TO_PROJECT]->(:Project {projectId})` for every supporting entity you create.

## Contact Directory
Every individual named anywhere in the supplied project documents must appear in the contact output. If a field other than the person’s name cannot be sourced, include the contact with that field set to null instead of skipping the person.

**Node:** `ContactList`
**Properties:**
- `projectId` — From `prompt.md`.
- `code` — Deterministic slug (e.g. `primary-contact-list`).
- `name` — Display label (e.g. “Project Contact Directory”).
- `description` — Optional summary of coverage.
- `notes` — Optional context or revision info.
**Relationships:**
- `(:ContactList)-[:BELONGS_TO_PROJECT]->(:Project {projectId})`
- `(:ContactList {projectId, code})-[:HAS_CONTACT]->(:PartyContact {projectId, slug})`
- `(:PartyContact {projectId, slug})-[:LISTED_IN]->(:ContactList {projectId, code})`

## Party Contacts
**Node:** `Party`
**Properties:**
- `code` — Deterministic slug for the organisation. Source: derive from name + role.
- `name` — Organisation or individual. Source: party tables, signature blocks.
- `role` — Contract role (Client, Principal, Superintendent, Consultant, etc.). Source: party listings, responsibility matrices.
- `organization` — Legal entity (keep corporate suffixes).
- `contactPerson` — Primary representative. Source: contact directories, signature lines.
- `email` — Email address. Source: contact tables, signatures.
- `phone` — Phone number. Source: same sections.
- `address` — Postal or physical address. Source: correspondence blocks.
- `abn` — Australian Business Number when present. Source: compliance statements, footers.
- `additionalDetails` — JSON of verifiable extras (licences, accreditation). Source: footnotes, accreditation tables.
**Relationships:**
- `(:Party)-[:BELONGS_TO_PROJECT]->(:Project {projectId})`
- `(:Party {projectId, code})-[:LISTED_IN]->(:ContactList {code})`
- **Note:** Every single name you encounter must result in a corresponding node—skip nothing, merge nothing together.

**Node:** `PartyContact`
**Properties:**
- `slug` — Deterministic ID (e.g. `jane-smith-dit`).
- `name` — Full name. Source: signature blocks, contact lists.
- `roleTitle` — Job title. Source: same.
- `organization` — Organisation represented.
- `category` — Client, Principal Contractor, Consultants/Engineers, Subcontractors, Authorities/Others.
- `partyCode` — Slug of the owning party.
- `email` — Email address.
- `phone` — Landline or primary phone.
- `mobile` — Mobile number, when listed.
- `address` — Street or postal address.
- `notes` — Optional context (e.g. “Primary superintendent contact”).
**Relationships:**
- `(:PartyContact)-[:BELONGS_TO_PROJECT]->(:Project {projectId})`
- `(:PartyContact {slug})-[:CONTACT_FOR]->(:Party {projectId, code})`
- `(:PartyContact {slug})-[:LISTED_IN]->(:ContactList {code})`
- **Note:** Absolutely every human name identified becomes its own `PartyContact` node—no aggregating, no omissions.
