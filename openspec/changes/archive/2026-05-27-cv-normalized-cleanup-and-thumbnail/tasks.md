## 1. Database

- [x] 1.1 Add migration `supabase/migrations/*_media_thumbnail_path.sql` with `thumbnail_storage_path text null` on `public.media`

## 2. API — media thumbnail

- [x] 2.1 Implement `MediaService.ensureThumbnail(mediaId)` using sharp (`fit: inside`, 150×150 max, WebP)
- [x] 2.2 Call `ensureThumbnail` from `cropMedia` after cropped derivative upload
- [x] 2.3 Add `GET /media/:id/thumbnail` in `media.controller.ts` streaming `thumbnail_storage_path`
- [x] 2.4 Include `thumbnail_storage_path` in `deleteMedia` storage cleanup
- [x] 2.5 Add `media.service.spec.ts` / controller tests for thumbnail generation and GET

## 3. API — CV basics hook

- [x] 3.1 After `updateBasicsHeader` when `basics.image` is owned media URL, call `ensureThumbnail` for that media id
- [x] 3.2 Verify `CvService.findAll` / `findOne` / `toCvRecord` use `headerToSlimCvData` only (no `assembleFullResume`)
- [x] 3.3 Audit `CvItemService` for dead merge/version/profile-fetch logic; remove if any remains
- [x] 3.4 Update `cv-item.service.spec.ts` and `cv.service.spec.ts` for slim reads and basics thumbnail hook (mock media)

## 4. Web — thumbnail preview and version cleanup

- [x] 4.1 Add `thumbnailUrlForMediaId` (or extend `parseMediaIdFromImageUrl`) in `apps/web/src/lib/api.ts`
- [x] 4.2 `ProfilePhotoThumbnail` / `managed-basics-section.tsx`: use thumbnail URL for owned media preview; keep full URL for crop dialog
- [x] 4.3 Remove `onVersionChange`, `onMetaVersionChange`, and 409 reorder handling from `managed-array-section.tsx`, `sortable-managed-array-section.tsx`, and callers
- [x] 4.4 Update `managed-basics-section.test.tsx` and related component tests

## 5. Seed script

- [x] 5.1 `scripts/lib/media-thumbnail.mjs`: `ensureMediaThumbnail` (sharp, ≤150×150 WebP, `thumbnail_storage_path`)
- [x] 5.2 `scripts/seed-e2e-fixture.mjs`: after each `assignProfilePhoto`, call `ensureMediaThumbnail` for the assigned media id
- [x] 5.3 `scripts/lib/seed-supabase.mjs`: include `thumbnail_storage_path` in `clearUserSeedData` storage cleanup
- [x] 5.4 Root `package.json`: `sharp` devDependency for seed (no Nest required)

## 6. Verification

- [x] 6.1 Run API unit tests: `pnpm --filter api test -- --run`
- [x] 6.2 Run web unit tests: `pnpm --filter web test -- --run`
- [x] 6.3 Run types tests: `pnpm --filter @resumind/types test -- --run`
- [x] 6.4 Re-run `pnpm samples:seed` after migration so sample media rows have thumbnails

## E2E test impact

**Update required.** `apps/api/test/e2e/local-supabase.e2e-spec.ts`: add scenario for `GET /media/:id/thumbnail` after basics save with profile photo; confirm slim `GET /cv/:id` has no section arrays. Re-run `pnpm test:e2e` after changes. Archive duplicate change `remove-cv-version-management` if fully superseded.
