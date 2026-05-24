## Why

The CV editor today keeps the entire resume in local React state and persists only when the user clicks **Save CV**, which feels like a document editor rather than a management tool. Authors cannot trust that individual edits are saved, nested items (highlights, courses, profiles) are edited inside dense card forms instead of resume-like views, and string lists (keywords, project roles) use inconsistent controls. We need immediate, item-scoped persistence and a view/edit/delete/create UX aligned with how the finished CV reads.

## What Changes

- **BREAKING**: Remove the monolithic **Save CV** button as the primary persistence path; each create, update, and delete operation SHALL call the API immediately and reflect server state on success.
- Introduce **granular CV item operations** for: Basics, Profile, Work, Work Highlight, Volunteer, Volunteer Highlight, Education, Education Course, Skill, Project, Project Highlight, Award, Certificate, Publication, Language, Interest, and Reference.
- Replace section UIs with a **resume-style view** (bold titles left, dates/locations right, bullet highlights) as the default; switching to **inline edit** replaces that row/card with a form until save or cancel.
- **Create** flows append a form at the **bottom** of the section; **Delete** flows require an explicit confirmation dialog before calling the service.
- Unify **keywords** (Skills, Interests, Projects) and **project roles** into one **`TagsInput`** string-list editor component; treat them as ordered lists of strings, not separate field types.
- Nest API SHALL expose authenticated sub-resource routes (or equivalent item-scoped mutations) that patch the stored JSON Resume document, run schema validation, and honor existing optimistic concurrency (`meta.version`).
- Client API helpers in `apps/web/src/lib/api.ts` SHALL mirror each item type; the editor SHALL stop bulk `onChange` resume mutations for persisted sections.

## Capabilities

### New Capabilities

- `cv-item-crud`: Item-scoped create/update/delete semantics for all listed resume entities (including nested highlights and courses), shared tags-input for string lists, and resume-layout view/edit/delete/create interaction patterns in the dashboard editor.

### Modified Capabilities

- `cv-rest-api`: Add granular authenticated routes under `/cv/:id/...` for item-level mutations while preserving validation, RLS, and version conflict behavior.
- `cv-editor-ui`: Replace card-based `ArraySection` editing with resume-preview rows, per-item save/cancel, bottom create forms, delete confirmation, and immediate persistence.
- `web-application`: Dashboard CV editor SHALL use typed item CRUD client functions instead of a single deferred `updateCv` save; loading and error handling SHALL be per operation.

## Impact

- **Backend**: `CvController` / `CvService` (or dedicated item controllers), new DTOs per entity, shared mutation helper for JSONB paths, tests beside existing CV specs.
- **Frontend**: `cv-editor.tsx`, `cv-sections.tsx`, new view-row and item-form components, `TagsInput`, `apps/web/src/lib/api.ts` item methods; removal or demotion of global save UX.
- **Types**: `@resumind/types` may gain stable item identifiers or index contracts if the API uses explicit ids (see design).
- **Specs**: Delta updates to `cv-rest-api`, `cv-editor-ui`, `web-application`; new `cv-item-crud` capability spec.
- **Out of scope**: PDF/export rendering changes; migrating away from JSONB whole-document storage.
