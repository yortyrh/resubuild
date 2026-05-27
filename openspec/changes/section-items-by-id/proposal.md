## Why

CV section item update and delete operations currently identify rows by numeric array index in URL paths. Both the Nest service and the web client must know (or re-fetch) the full ordered section list to resolve an index to a database row. Normalized storage already assigns stable UUID primary keys to every section row and returns them on list/create responses, so index-based routing adds latency, complexity, and fragility when list order changes.

## What Changes

- **BREAKING**: Replace `:index` path parameters with `:itemId` (row UUID) on all CV array-item PATCH/DELETE routes (profiles, work, volunteer, education, skills, projects, awards, certificates, publications, languages, interests, references).
- **BREAKING**: Replace `:parentIndex` with `:parentId` on nested string routes (work/volunteer/project highlights, education courses) for API consistency, even though the editor normally persists nested strings on parent save.
- Nest `CvItemService` and `CvNormalizedRepository` SHALL resolve rows by primary key (`getSectionRowById`) instead of listing the section and indexing.
- Mutation responses SHALL return the affected item (with `id`) and updated `meta.version`; `index` in responses becomes optional or removed — clients update local state by matching `id`.
- Web `cv-item-api.ts`, `ManagedArraySection`, and related components SHALL track and pass item `id` for update/delete instead of array position.
- Remove or simplify client helpers that re-sort local arrays by returned `index` (`replaceAtSortedIndex`, `insertAtIndex` usage for CRUD) where identity-based merge suffices.
- Update unit, e2e, and spec requirements that mandate index-based URLs.

## Capabilities

### New Capabilities

_None — this is a refactor of existing item CRUD identity, not a new product capability._

### Modified Capabilities

- `cv-item-crud`: Replace the requirement that array item identity in URLs maps to section list order with UUID-based identity; update client state merge scenarios accordingly.
- `cv-rest-api`: Update route shapes, service lookup behavior, and mutation response contract for id-based item operations.
- `web-application`: Update client API helpers and section editor flows to use item ids instead of indices.

## Impact

- **API**: `apps/api/src/cv/cv-items.controller.ts`, `cv-item.service.ts`, `cv-normalized.repository.ts`, related specs and e2e tests.
- **Web**: `apps/web/src/lib/cv-item-api.ts`, `managed-array-section.tsx`, `managed-basics-section.tsx` (profiles), `cv-section-order.ts` helpers, section components.
- **Specs**: Delta updates under this change for `cv-item-crud`, `cv-rest-api`, and `web-application`.
- **Breaking**: Any external consumer of index-based item URLs must switch to UUID paths; no database migration required (ids already exist).
