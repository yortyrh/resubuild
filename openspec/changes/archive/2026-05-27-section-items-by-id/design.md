## Context

Normalized CV storage assigns a UUID primary key to every section row (`cv_work.id`, `cv_skill.id`, etc.). List and create responses already expose this as `item.id` via `rowToItem`. Despite that, item mutation routes use numeric indices in paths (`PATCH /cv/:cvId/work/:index`), and `CvItemService.updateArrayItem` / `deleteArrayItem` call `listSectionRows` on every mutation to resolve `rows[index]`.

The web editor mirrors this: `ManagedArraySection` tracks `editingIndex` / `deleteIndex`, passes indices to `cv-item-api.ts`, and reorders local arrays using `result.index` from mutation responses.

The current `cv-item-crud` spec explicitly requires index-based URLs. Reorder endpoints already use UUID arrays in request bodies, so id-based item routes align with existing patterns.

## Goals / Non-Goals

**Goals:**

- Resolve update/delete mutations with a single row lookup by `(cv_id, id)` — no full section list on the hot path.
- Use stable row UUIDs in API paths and web client helpers for all array-item PATCH/DELETE operations.
- Merge local editor state by item `id` after update/delete instead of positional index gymnastics.
- Keep optimistic concurrency (`meta.version`) and schema validation unchanged.
- Update specs, unit tests, and e2e tests to reflect the new contract.

**Non-Goals:**

- Database schema or migration changes (ids already exist).
- Changing section list ordering rules (date DESC vs `sort ASC, id ASC`).
- Replacing nested highlight/course APIs with parent-only save (already the editor default; nested routes updated for consistency only).
- Backward compatibility shims for index-based URLs (breaking change acceptable — no external API consumers documented).

## Decisions

### 1. Path parameter: `:itemId` (UUID), not `:index`

**Choice:** `PATCH|DELETE /cv/:cvId/{section}/:itemId` where `itemId` is the row UUID.

**Rationale:** Matches normalized storage primary keys and reorder API (`order: string[]` of uuids). Eliminates ambiguous index drift when list order changes between read and write.

**Alternatives considered:**

- Keep index in URL, add optional `id` in body — still requires list fetch on server to validate consistency.
- Dual support (index OR id) — doubles route surface and test matrix; rejected.

**Validation:** Use `ParseUUIDPipe` (or equivalent) on `:itemId`. Invalid UUID → 400; valid UUID not found for CV → 404.

### 2. Repository: add `getSectionRowById`, stop using index resolution in service

**Choice:** Add `CvNormalizedRepository.getSectionRowById(supabase, cvId, section, rowId)` querying `.eq('id', rowId).eq('cv_id', cvId).single()`. Remove `getSectionRowByIndex` usage from mutation paths (method may remain for tests or be deleted if unused).

**Rationale:** One indexed primary-key lookup vs fetch-all + array index. `updateSectionRow` and `deleteSectionRow` already accept `rowId`.

### 3. Mutation response shape: id-centric, drop required `index`

**Choice:** `CvItemMutationResponse` returns `{ version, item? }` on create/update; delete returns `{ version }`. Remove `index`, `parentIndex`, `childIndex` from the primary contract. Create responses MUST include `item` with `id`.

**Rationale:** Clients no longer need positional hints for update/delete. For create, the new row's position in the ordered list may differ from append order (date-primary sections); the client SHALL merge by refetching the section (`GET /cv/:cvId/{section}`) or applying the same sort comparator client-side.

**Alternatives considered:**

- Keep returning `index` on create only — rejected to keep one response contract; refetch is clearer for date ordering.

### 4. Web state: track `editingId` / `deleteId`, merge by id

**Choice:**

- Extend section item types to require optional `id?: string` (present on loaded rows).
- `ArraySectionApi.update/delete(cvId, itemId, ...)` instead of index.
- Replace `replaceAtSortedIndex` / index-based splice with `mergeItemById(items, item)` and `removeItemById(items, id)`.
- After create: refetch section or insert item then sort locally (prefer refetch for correctness on date sections).

**Rationale:** UI list order remains driven by section GET ordering; CRUD identity decouples from array position.

### 5. Nested string routes: `:parentId` instead of `:parentIndex`

**Choice:** `POST|PATCH|DELETE /cv/:cvId/work/:parentId/highlights/:childIndex` (child index retained for jsonb array position).

**Rationale:** Parent lookup benefits the same way. Child index remains necessary because nested strings have no row ids. Editor flows still prefer parent save; these routes stay for API completeness.

### 6. Profiles use the same pattern

**Choice:** `PATCH|DELETE /cv/:cvId/profiles/:itemId` — profiles are rows in `cv_profile` with UUID ids.

## Risks / Trade-offs

| Risk                                            | Mitigation                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Create flow needs correct list position         | Refetch section after create (one GET) or shared client sort helper               |
| Items without `id` in local state (stale cache) | Section GET always includes id; block save/delete if id missing and prompt reload |
| Breaking change for bookmarked index URLs       | Acceptable per scope; document in PR                                              |
| E2e tests hard-code index paths                 | Update e2e to capture id from create/list responses                               |

## Migration Plan

1. Implement API routes + service + repository lookup by id.
2. Update shared response types in API and web.
3. Update web client and `ManagedArraySection` / profile section.
4. Update unit and e2e tests.
5. Deploy API and web together (no DB migration). Rollback: revert both apps in tandem.

## Open Questions

- None blocking — create merge strategy defaults to section refetch for date-primary sections.
