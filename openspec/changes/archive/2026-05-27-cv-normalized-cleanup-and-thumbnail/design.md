## Context

CV storage is normalized: `cv` holds basics scalars and `location` jsonb; each section has its own table. Item routes update one row at a time; nested string lists (`highlights`, `keywords`, `courses`, `roles`) are `jsonb` columns updated atomically with the parent row body—clients send the full array on PATCH, which is correct and should stay.

Recent refactors already slimmed `CvService.findOne` / `findAll` to `headerToSlimCvData` and removed most version logic from `CvItemService`. Remaining gaps: dead web props (`onVersionChange`, 409 reorder handling in specs/UI), `assembleFullResume` still used only on create/replace paths, and profile photos served at full cropped resolution in an 80×80 UI slot.

The user’s DOM target (`ProfilePhotoThumbnail`) loads `basics.image` (`GET /media/:id`), which streams the full cropped derivative—wasteful and can look soft when CSS-downscaled.

## Goals / Non-Goals

**Goals:**

- Finish version-management removal (API, web, specs, e2e).
- Lock slim read contract: no section joins on `GET /cv` / `GET /cv/:id`; basics routes never embed profiles.
- Generate a ≤150×150 thumbnail (preserve aspect ratio) when basics image is set to owned media; serve it for editor preview.
- Remove dead concurrency UI paths (409, version callbacks).

**Non-Goals:**

- JSON Resume export or merging `profiles` into `basics` at export time.
- Per-line nested-string sub-routes (highlights/keywords stay parent-row jsonb).
- Dropping `meta_*` DB columns (legacy, unused).
- Changing `basics.image` URL shape (still `/media/{id}` for full display and future export).

## Decisions

### 1. Thumbnail stored as third Storage object + column

**Choice:** Add `thumbnail_storage_path` on `public.media`. Generate with `sharp` using `fit: 'inside'`, `width: 150`, `height: 150`, `withoutEnlargement: true`, output WebP.

**Alternatives:** Client-only CSS resize (rejected—user asked for generation on save); query param on `GET /media/:id` (rejected—caching/CDN simpler with separate path).

**Rationale:** Matches existing `cropped_storage_path` pattern; public `GET /media/:id/thumbnail` can cache aggressively.

### 2. Regenerate thumbnail on crop and on basics PATCH with owned image

**Choice:** `MediaService.ensureThumbnail(mediaId)` called from `cropMedia` after cropped derivative is written, and from `CvItemService.updateBasics` / `updateBasicsHeader` path when `basics.image` parses to owned media id.

**Alternatives:** Only on crop (misses external→media flows that only PATCH basics); only on basics PATCH (misses crop-only updates). Both hooks cover upload+crop+save and edit-crop flows.

### 3. Editor uses thumbnail URL for `ProfilePhotoThumbnail` only

**Choice:** Helper `thumbnailUrlForMediaId(id)` → `{api}/media/{id}/thumbnail`. Crop dialog and `basics.image` keep full `/media/{id}`.

**Rationale:** User requirement is preview size; export and crop need full pixels.

### 4. Last-write-wins; no 409 on reorder or item mutations

**Choice:** Remove stale-version scenarios from specs and web; reorder failures revert on any non-2xx except treat all errors uniformly.

**Rationale:** Aligns with completed `remove-cv-version-management` intent.

### 5. Slim reads already implemented—verify and delete dead assembly on read paths

**Choice:** Audit `CvNormalizedRepository.assembleFullResume` usage; keep for `POST /cv` / full replace only. No new read-path assembly.

### 6. Nested jsonb arrays: no extra merge logic in service

**Choice:** `updateArrayItem` continues `{ ...current, ...item }` + `sanitizeResumeItemPayload`; no separate list-diff or nested routes. Document in tasks only if redundant code is found (e.g. unused helpers).

## Risks / Trade-offs

| Risk                                          | Mitigation                                                       |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Thumbnail stale after manual Storage edits    | Regenerate on basics PATCH and crop                              |
| Extra Storage objects per media               | Delete thumbnail path in `deleteMedia`; replace on regen         |
| Basics save triggers thumbnail on every PATCH | Only run when `image` field present and parses to owned media id |
| External image URLs unchanged                 | Thumbnail endpoint only for owned media rows                     |

## Migration Plan

1. Supabase migration: `thumbnail_storage_path text null` on `media`.
2. API: MediaService thumbnail generation + `GET :id/thumbnail`; hook basics/crop.
3. Web: `ProfilePhotoThumbnail` src from thumbnail helper; remove version props.
4. Specs/tests: update e2e and unit expectations.
5. Archive or close duplicate change `remove-cv-version-management` after merge.

## Open Questions

_None._
