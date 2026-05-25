## Context

The CV editor uses `ManagedArraySection` and `ManagedBasicsSection` with paired `renderForm` and `renderView` callbacks in `cv-sections.tsx`. Edit forms expose the full JSON Resume field set from `@resumind/types`, but `renderView` implementations were written to mimic a sparse MIT sample layout and conditionally omit fields that were empty in that sample. Users who populate omitted fields (via import, API, or form save) see no evidence of those values until they click Edit.

Current implementation lives primarily in:

- `apps/web/src/components/cv/cv-sections.tsx` — all section tabs except Basics
- `apps/web/src/components/cv/managed-basics-section.tsx` — Basics tab

Related in-flight changes (`clickable-links-new-tab`, `markdown-view-rendering`, `basics-profile-photo`, `basics-address-contact-line`) improve presentation of subsets of fields; this change ensures **completeness** first, then defers link/markdown/photo polish to those changes where they overlap.

## Goals / Non-Goals

**Goals:**

- Produce a definitive field coverage matrix: every form-backed field in each tab must appear in view mode when non-empty.
- Update `renderView` (and Basics view JSX) for all gaps identified in the proposal audit.
- Keep resume-preview layout conventions: title (primary), meta (dates/locations/secondary scalars), body (prose, lists, URLs where appropriate).
- Add Vitest tests that fail if a known field is persisted but not rendered in view mode.

**Non-Goals:**

- Adding new editor tabs or form fields not already in `@resumind/types` (e.g. top-level `meta` section).
- Changing API payloads, JSON Schema, or CRUD endpoints.
- Redesigning overall tab layout or migrating to auto-generated UI from schema.
- Replacing plain-text markdown fields with rendered markdown (handled by `markdown-view-rendering`).

## Decisions

### 1. Source of truth for "all fields"

**Decision:** Use `@resumind/types` interfaces as the authoritative field list per section, cross-checked against `packages/schemas/resume.schema.json`.

**Rationale:** Types already mirror the editor's form bindings; schema confirms JSON Resume alignment. Avoid generating UI from schema in this pass.

**Alternative considered:** JSON Schema-driven field registry — rejected as over-engineering for a one-time audit plus targeted view fixes.

### 2. Field coverage matrix and view placement rules

**Decision:** Adopt consistent placement rules per field kind:

| Field kind                 | View slot           | Example                              |
| -------------------------- | ------------------- | ------------------------------------ |
| Primary identifier         | `title`             | Work position + company              |
| Dates                      | `meta`              | startDate – endDate                  |
| Location / org secondary   | `meta`              | Work location, Education score       |
| URL                        | `meta` or body line | Work url (prefer meta below dates)   |
| Short scalar label         | `meta`              | Project entity, type; Award awarder  |
| Markdown / multiline prose | `body`              | summary, description, reference text |
| String arrays              | `body`              | highlights, courses, keywords        |

**Rationale:** Matches existing `ResumeItemRow` patterns and keeps meta column for scannable secondary facts.

### 3. Section-specific view additions

**Decision:** Extend view output as follows (only when value is non-empty):

| Section      | Fields to add in view                                      |
| ------------ | ---------------------------------------------------------- |
| Work         | `url`, `description` (after summary, before highlights)    |
| Volunteer    | `url` in meta                                              |
| Education    | `url`, `score` in meta                                     |
| Projects     | `url`, `entity`, `type` (entity/type in meta or body line) |
| Awards       | `awarder` in meta (below date)                             |
| Certificates | `url` in body or meta                                      |
| Publications | `url`, `summary` in body                                   |

Basics, Social profiles, Skills, Languages, Interests, References: verify parity; fix only if audit finds gaps after related changes land.

**Rationale:** Directly addresses known omissions from code review; matrix becomes checklist for QA.

### 4. Shared view helpers (minimal)

**Decision:** Optionally extract tiny presentational helpers in `apps/web/src/components/cv/` (e.g. `ViewFieldLine`, `ViewUrlLine`) if the same labeled scalar pattern repeats ≥3 times. Otherwise inline in `renderView` to minimize diff scope.

**Rationale:** Follows project preference for minimal abstraction; helpers only if duplication becomes noisy during implementation.

### 5. Testing strategy

**Decision:** Colocated Vitest tests using `@testing-library/react` that mount `CvSections` (or isolated `renderView` fixtures) with fully populated sample items per section and assert each field's text (or link href when `ExternalLink` exists) appears in the document.

**Rationale:** Prevents regression to MIT-sample omissions; scenarios map to spec requirements.

## Risks / Trade-offs

- **[Risk] View rows become visually dense when many optional fields are filled** → Mitigation: Keep meta compact; use muted `text-sm` styling; omit empty fields only (never omit non-empty).
- **[Risk] Overlap with `clickable-links-new-tab` causes merge conflicts** → Mitigation: Implement plain text URLs first if needed; swap to `ExternalLink` when merging. Document in tasks.
- **[Risk] `description` vs `summary` on Work both shown feels redundant** → Mitigation: Show both when populated; they are distinct schema fields with different semantics.
- **[Risk] Incomplete audit misses a field** → Mitigation: Maintain explicit matrix in tasks.md; test uses object with every key set.

## Migration Plan

1. Land view updates in `apps/web` only; no data migration.
2. Deploy with next web release; existing CV JSON unchanged.
3. Rollback: revert component changes; no persisted data impact.

## Open Questions

- Should Education `score` appear in meta next to study type or on its own line? **Default:** own line in meta when present.
- Should Project `entity` and `type` be prefixed labels ("Entity: …", "Type: …")? **Default:** yes, for clarity in dense rows.
