## Why

After normalizing CV storage, read handlers still assemble full JSON Resume documents and join section tables even though current clients only need header metadata (dashboard list/detail) or load sections through granular `GET /cv/:cvId/{section}` routes. That adds N+1 queries on list, redundant profile fetches on basics reads, and complexity that belongs on a future export endpoint—not on every dashboard or editor bootstrap call.

## What Changes

- **`GET /cv` and `GET /cv/:id`** return a slim CV envelope: id, user_id, computed `title`, timestamps, and a minimal `data` object (meta + basics columns from the `cv` row only)—no `fetchSections`, no `assembleResume` for all sections.
- **`GET /cv/:cvId/basics`** returns basics fields from the `cv` header row only; it does **not** query or embed `profiles` (profiles remain on `GET /cv/:cvId/profiles`).
- **`PATCH /cv/:cvId/basics`** response returns the updated basics object without loading profiles.
- **Create/update/delete CV responses** that today call `toCvRecord` use the same slim mapping (header-only `data`).
- **Reserve full assembly** for a future dedicated export/download route (not implemented in this change).
- **BREAKING (response shape)**: `data` on list/detail/mutation CV responses no longer includes `work`, `skills`, `education`, etc. Clients that relied on embedded sections must use section GET routes (the web editor already does for section UIs).

## Capabilities

### New Capabilities

_None — behavior change only._

### Modified Capabilities

- `cv-rest-api`: Slim read responses for `GET /cv`, `GET /cv/:id`, and CV mutation responses; defer full JSON Resume assembly to a future export endpoint.
- `cv-item-crud`: `GET /cv/:cvId/basics` and basics mutation item payloads exclude embedded profiles.

## Impact

- `apps/api/src/cv/cv.service.ts` — replace `toCvRecord` assembly with header-to-slim-payload helper.
- `apps/api/src/cv/cv-item.service.ts` — remove profile queries from `getBasics` and `updateBasics`.
- `apps/api/src/cv/cv.service.spec.ts`, `cv-item.service.spec.ts`, e2e tests — update expectations.
- `apps/web/src/components/cv/cv-editor-provider.tsx` — load optimistic-concurrency `meta.version` from slim `data.meta` (or dedicated field) without expecting full resume in `GET /cv/:id`.
- `packages/types` — optional helper `headerToSlimCvData` / reuse `metaFromCvHeader` + basics fields.
- Main spec deltas: `openspec/specs/cv-rest-api/spec.md`, `openspec/specs/cv-item-crud/spec.md` (via change deltas).
