## 1. Database and shared types

- [x] 1.1 Add Supabase migration extending `public.media` with nullable `crop jsonb` and `cropped_storage_path text`
- [x] 1.2 Add shared crop DTO/types in `apps/api/src/media/` (and export from packages if needed for web client crop payload)

## 2. API — media crop and delete

- [x] 2.1 Add `sharp` dependency to `apps/api` and implement crop generation in `MediaService` (extract rect, write `{user_id}/{id}_cropped.{ext}`, update row)
- [x] 2.2 Update `loadMediaPayload` to prefer `cropped_storage_path` when set
- [x] 2.3 Add `PATCH /media/:id/crop` with DTO validation and owner check in `MediaController`
- [x] 2.4 Add `DELETE /media/:id` with owner check; remove original + cropped storage objects and registry row
- [x] 2.5 Add `GET /media/:id/meta` (owner-only) returning crop metadata for edit-crop UI
- [x] 2.6 Add colocated Jest tests for crop, delete, and GET serving cropped vs original

## 3. Web — API helpers and utilities

- [x] 3.1 Add `patchMediaCrop`, `deleteMedia`, `getMediaMeta` to `apps/web/src/lib/api.ts`
- [x] 3.2 Add `parseMediaIdFromImageUrl(url)` helper to detect owned `/media/{uuid}` URLs

## 4. Web — profile photo crop component

- [x] 4.1 Add `react-image-crop` (or chosen library) to `apps/web`
- [x] 4.2 Create `ProfilePhotoCropDialog` component: 1:1 crop, preview, confirm/cancel; accepts existing crop for edit mode
- [x] 4.3 Create `ProfilePhotoThumbnail` component: image with `onError` error state, overlay actions (upload, edit crop, delete)

## 5. Web — Basics section layout and wiring

- [x] 5.1 In `managed-basics-section.tsx` view mode, build contact line from `[email, phone, url, formatBasicsLocation, address]`; remove `meta` prop
- [x] 5.2 Compose `title` as flex row: `ProfilePhotoThumbnail` left, name/label/contact stack right; remove `Photo: {url}` body text
- [x] 5.3 Wire upload flow: file pick → crop dialog → upload → patch crop → `saveBasics` with returned URL
- [x] 5.4 Wire edit-crop: load meta → crop dialog → `patchMediaCrop` (no basics URL change)
- [x] 5.5 Wire delete: confirm → `deleteMedia` when owned URL → patch basics to clear `image`
- [x] 5.6 Mirror upload-with-crop in edit-mode photo control (replace direct upload without crop)

## 6. Verification

- [ ] 6.1 Manually verify Basics view: address in contact line, photo left of name, error state on bad URL, delete/upload/edit-crop
- [x] 6.2 Run `pnpm --filter api test -- --run` and `pnpm --filter web typecheck`; add component tests if practical
