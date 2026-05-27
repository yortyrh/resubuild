## Why

CV data is stored in normalized Postgres tables with item-scoped mutations. Nested string lists (`highlights`, `keywords`, etc.) live as `jsonb` columns and are updated atomically with their parent row—clients send the full array on each save. Despite that model, the codebase still carries monolithic-document patterns: optimistic `meta.version` threading (partially removed), full `assembleResume` on read paths, embedding `profiles` into basics responses, and serving full-resolution cropped bytes in the Basics thumbnail. Dashboard and editor APIs only need the `cv` header row for list/detail/bootstrap; section data loads via granular GET routes. Export (future) is the only place that needs a full JSON Resume document with `basics.profiles` merged in. Profile photos in the editor should show a small preview (≤150×150, same aspect ratio), not the full crop served at display size.

## What Changes

- **Complete version-management removal**: delete remaining web dead code (`onVersionChange`, `onMetaVersionChange`, reorder version handling); ensure API/types/e2e never expect `data.meta` or mutation `version`. Align with or supersede the in-progress `remove-cv-version-management` change.
- **Slim CV reads (verify & lock)**: `GET /cv`, `GET /cv/:id`, and CV mutation responses return header-only `data` (`basics` from the `cv` row via `headerToSlimCvData`)—no `fetchSections`, no `assembleResume` on these paths.
- **Basics without profiles on read/write**: `GET /cv/:cvId/basics` and `PATCH` basics responses use header fields only; profiles stay on `GET /cv/:cvId/profiles`. Merging profiles into `basics` is reserved for a future export endpoint.
- **Simplify item service patterns**: keep parent-row atomic updates for jsonb arrays; remove redundant merge/fetch logic that assumed monolithic documents (e.g. no profile fetch on basics update, no version checks on mutate). Nested-string list updates remain “replace whole array in PATCH body”—no per-line sub-routes.
- **Profile photo thumbnail derivative**: on basics save (when `basics.image` references owned API media), generate and store a thumbnail (max width 150px, max height 150px, preserve aspect ratio). Basics UI `ProfilePhotoThumbnail` uses the thumbnail URL; full image remains for crop dialog and future export.
- **BREAKING (media)**: optional new `thumbnail_storage_path` on `public.media` and `GET /media/:id/thumbnail` (or variant) for editor preview—`basics.image` continues to point at the full display URL.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cv-rest-api`: Confirm slim list/detail/mutation `data` is basics-only; no section assembly on read.
- `cv-item-crud`: Basics GET/PATCH responses exclude embedded profiles; item mutations have no version field.
- `cv-normalized-schema`: Document optional `media.thumbnail_storage_path`; `meta_*` columns unused by management APIs.
- `resume-media-uploads`: Generate and serve ≤150×150 thumbnail derivative when basics image is set/updated; crop flow refreshes thumbnail.
- `cv-editor-ui`: `ProfilePhotoThumbnail` loads thumbnail URL; remove obsolete version props from section components.
- `web-application`: Editor bootstrap from slim `GET /cv/:id` without expecting full resume or `data.meta`.

## Impact

- `apps/api/src/cv/cv.service.ts`, `cv-item.service.ts`, `cv-normalized.repository.ts` (read/write simplification, basics thumbnail hook)
- `apps/api/src/media/media.service.ts`, `media.controller.ts`, Supabase migration for thumbnail path
- `packages/types/src/resume-normalized.ts` (slim data helpers; no meta on management paths)
- `apps/web/src/components/cv/profile-photo-thumbnail.tsx`, `managed-basics-section.tsx`, `managed-array-section.tsx`, `cv-editor-provider.tsx`
- `apps/api/test/e2e/local-supabase.e2e-spec.ts`, unit tests across api/web/types
- Related open change `remove-cv-version-management` may be archived or merged into this implementation batch
