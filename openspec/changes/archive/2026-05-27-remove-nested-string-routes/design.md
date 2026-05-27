## Context

Normalized CV storage keeps `highlights` and `courses` as jsonb string arrays on parent rows (`cv_work`, `cv_volunteer`, `cv_education`, `cv_project`). Since the `inline-nested-string-lists` change, the web editor edits these arrays inline on the parent form and persists them via `POST|PATCH /cv/:cvId/{section}` with the full array in the payload.

The Nest layer still carries legacy granular nested routes (`/work/:parentId/highlights/:index`, etc.) and a dedicated `mutateNestedString` code path that:

1. Loads the parent row
2. Copies the jsonb array in memory
3. Mutates one index
4. Writes the entire parent row back

This is functionally identical to `updateArrayItem` with `{ highlights: [...] }` in the body, but adds ~130 lines of service code, twelve controller handlers, and response fields (`parentId`, `childIndex`, `value`) unused by the first-party client.

The `cv-item-crud` spec already states the editor SHALL NOT call nested highlight/course APIs. This change aligns the API implementation with that contract.

## Goals / Non-Goals

**Goals:**

- Delete nested highlight/course HTTP routes and service methods.
- Keep parent create/update as the single mutation surface for jsonb string arrays.
- Trim `CvItemMutationResponse` to fields still used by array-item CRUD.
- Update specs and tests to reflect the slimmer API.

**Non-Goals:**

- Changing database schema or jsonb column shapes.
- Changing editor UX (already parent-save).
- Removing `StringValueDto` or other DTOs shared elsewhere unless they become unused.
- Adding a deprecation period or 410 responses for removed routes (no known external consumers).

## Decisions

### 1. Hard remove routes (no deprecation shim)

**Choice:** Delete routes outright; return 404 for former paths via Nest's default unknown-route handling.

**Alternatives considered:**

- _Keep routes as thin wrappers calling parent update_ — still maintains dead surface area and misleading API docs.
- _Return 410 Gone with migration message_ — unnecessary without known third-party callers.

**Rationale:** First-party web client never calls these routes; specs already treat them as legacy. Hard removal is the simplest correct state.

### 2. Parent `updateArrayItem` / `createArrayItem` remain unchanged

**Choice:** No new service methods; existing `sanitizeResumeItemPayload` + `updateSectionRow` already persist full `highlights`/`courses` arrays atomically.

**Rationale:** The user's observation is correct — every parent save replaces the jsonb column from the request body. No incremental nested logic is needed server-side.

### 3. Simplify `CvItemMutationResponse`

**Choice:** Remove `parentId`, `childIndex`, and `value`. Keep `{ version, item? }` for create/update and `{ version }` for delete.

**Rationale:** Those fields existed solely for nested string responses per archived `section-items-by-id` design.

### 4. Spec deltas over silent implementation-only cleanup

**Choice:** Update `cv-rest-api`, `web-application`, and `cv-item-crud` specs so archived requirements match runtime behavior.

**Rationale:** Prevents future agents from reintroducing nested routes to satisfy stale spec text.

## Risks / Trade-offs

- **[Breaking external API consumers]** → Acceptable; document in proposal as **BREAKING**. No in-repo consumers beyond tests.
- **[E2E tests referencing nested routes]** → Grep and remove any e2e cases during implementation; parent-save e2e paths already cover highlights/courses.
- **[Accidental removal of parent array CRUD]** → Out of scope; only nested sub-routes and their service helpers are deleted.

## Migration Plan

1. Remove controller handlers and service methods.
2. Update types and unit tests.
3. Grep monorepo for `/highlights/` and `/courses/` path references.
4. Run `pnpm test` and API e2e if applicable.
5. Archive change to merge spec deltas into `openspec/specs/`.

No data migration. Existing jsonb content is unaffected.

## Open Questions

None — user intent and current architecture are aligned.
