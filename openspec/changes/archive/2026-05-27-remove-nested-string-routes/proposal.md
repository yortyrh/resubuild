## Why

Highlights and courses are stored as jsonb string arrays on parent rows (`cv_work.highlights`, `cv_education.courses`, etc.) and the editor already persists them atomically via parent create/update payloads. The Nest API still exposes twelve nested CRUD routes plus `mutateNestedString` service logic that read-modify-write the same jsonb column one string at a time. That code duplicates what `updateArrayItem` already does, is unused by the web client, and contradicts the `cv-item-crud` spec which forbids nested CRUD during normal authoring.

## What Changes

- **BREAKING**: Remove nested highlight/course routes from `CvItemsController` (`POST|PATCH|DELETE` under work, volunteer, education, and projects for highlights/courses).
- Remove `mutateNestedString`, `createNestedString`, `updateNestedString`, `deleteNestedString`, and `parseChildIndex` from `CvItemService`.
- Simplify `CvItemMutationResponse` by dropping `parentId`, `childIndex`, and `value` fields used only by nested string mutations.
- Remove controller/service unit tests for nested string routes.
- Update `cv-rest-api` and `web-application` specs to stop requiring nested highlight/course client helpers and API routes.
- No database or schema changes; parent payloads continue to accept full `highlights` / `courses` arrays.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-rest-api`: Remove nested string route requirements and legacy response scenarios; parent array CRUD remains the sole mutation surface for highlights and courses.
- `web-application`: Stop requiring typed nested highlight/course API helpers in `cv-item-api.ts`.
- `cv-item-crud`: Clarify that nested string items are not exposed as separate API resources (aligns spec with implementation).

## Impact

- **API**: `apps/api/src/cv/cv-items.controller.ts`, `cv-item.service.ts`, `cv-item.types.ts`, related specs.
- **Web**: No runtime change expected (editor already uses parent save); remove any dead nested helpers if present.
- **Tests**: `cv-items.controller.spec.ts`, `cv-item.service.spec.ts` nested-route cases removed.
- **Breaking for external API consumers** only; first-party editor unaffected.
