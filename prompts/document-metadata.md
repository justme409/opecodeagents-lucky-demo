# Document Metadata Task

Use this quick brief when extracting the document register. The aim is clean, evidence-backed metadata—no guesses, no filler.

## What You Produce
- **Node:** `Document`
- **Relationship:** `(:Document)-[:BELONGS_TO_PROJECT]->(:Project {projectId})`

## Required Fields
- `projectId` — Provided in the agent prompt.
- `documentNumber` — Identifier from title block or header.
- `revisionCode` — Latest revision marker (default to `A` if missing).
- `docKind` — `drawing` or `document`, proven by the file.
- `title` — Exact document title.
- `type` — `specification | drawing | report | procedure | plan | correspondence | other`.
- `status` — `draft | in_review | approved | superseded | archived` (default `draft` unless evidence says otherwise).

## Optional Field
- `discipline` — `civil | structural | electrical | mechanical | architectural | other`. Only set when the document shows it or you can confidently infer it.

## Working Steps
1. Pull the `projectId`.
2. Review the source file (filename + contents).
3. Capture every required field with direct evidence.
4. Add `discipline` only when justified.
5. Create the `Document` node with timestamps and the project relationship.

## Classification Pointers
- Drawings show title blocks, scales, sheet numbers.
- Documents read like specifications, reports, letters, etc.
- When unsure, stay conservative and leave `discipline` unset.

## Discipline Cheatsheet
- `civil` — roads, drainage, earthworks.
- `structural` — frames, footings, reinforcement.
- `architectural` — layouts, elevations, finishes.
- `electrical` — power, lighting, cabling.
- `mechanical` — HVAC, plumbing, fire services.
- `other` — hydraulics, geotech, surveying, anything outside the above.

## Validation Before You Finish
- Required fields are populated and evidence-backed.
- `documentNumber` stays unique for the project.
- Enums use the exact lowercase values above.
- Timestamps set on create/update calls.
- Output matches the `Document` schema in `master-schema.ts`.

