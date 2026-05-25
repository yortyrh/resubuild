## Context

`ManagedBasicsSection` renders Basics view mode via `ResumeItemRow`:

- **Title (left)**: name + label
- **Meta (right)**: formatted location + street address
- **Body**: contact line (`email • phone • url`), summary, and `Photo: {url}` text

Edit mode already supports file upload via `POST /media/upload` (no crop) and manual URL paste. The `public.media` table stores one storage object per row with no crop fields and no delete API. `GET /media/:id` always serves the original upload.

## Goals / Non-Goals

**Goals:**

- Group location and address with email/phone/website in one contact line under the name.
- Show profile photo left of name + contact in view mode with load-error indication.
- Support upload-with-crop, edit-crop, and delete (CV field + owned media cleanup).
- Persist crop rectangle on the media row; store original + cropped blobs; serve cropped bytes at the display URL when available.

**Non-Goals:**

- Cropping or media lifecycle for non-Basics images (Wysimark remains image-free).
- Cropping external (non-API) URLs pasted into `basics.image` — display only; edit-crop applies to owned media uploads.
- PDF/export rendering changes (may consume `basics.image` URL as today).
- Replacing JSON Resume `basics.image` with a structured object — remain a single URL string pointing at the display (cropped) asset.

## Decisions

### 1. Contact line includes location segments

**Decision:** Join `[email, phone, url, formatBasicsLocation(basics), basics.location?.address]` with `•`; omit `meta` on Basics view rows.

**Rationale:** Matches author expectation and the sibling `basics-address-contact-line` proposal; single scan line for contact info.

### 2. View layout: horizontal photo + identity block

**Decision:** Wrap the title area in a flex row: fixed-size square thumbnail (e.g. 80×80, `rounded-md`, `object-cover`) on the left; name/label/contact stack on the right. Photo controls (upload, edit crop, delete) sit on or adjacent to the thumbnail.

**Rationale:** Matches user DOM target (left of `div.text-xl` and contact `<p>`). Keeps `ResumeItemRow` generic—Basics passes a composed `title` node.

### 3. Display URL vs original

**Decision:** `basics.image` stores `{PUBLIC_API_URL}/media/{id}` (unchanged shape). `GET /media/:id` serves the **cropped** object when `cropped_storage_path` is set; otherwise the original. Original remains at `storage_path`.

**Rationale:** No JSON Resume schema change; templates and `<img src={basics.image}>` automatically show the cropped result.

**Alternatives considered:**

- _Separate `/media/:id/cropped` URL_ — rejected; would require consumers to know about two URLs.
- _Overwrite original on crop_ — rejected; loses ability to re-edit crop from source.

### 4. Crop params stored as JSONB on `media`

**Decision:** Add columns to `public.media`:

- `crop jsonb null` — `{ x, y, width, height }` in **original image pixel coordinates** (integers, origin top-left)
- `cropped_storage_path text null` — e.g. `{user_id}/{media_id}_cropped.webp`

**Rationale:** Single source of truth for re-opening the crop editor; queryable without parsing storage layout.

### 5. Two-phase upload flow

**Decision:**

1. `POST /media/upload` — unchanged; stores original, returns `{ id, url, contentType }`.
2. `PATCH /media/:id/crop` (authenticated) — body: crop rect; server uses `sharp` to generate cropped WebP/JPEG, uploads to `cropped_storage_path`, updates `crop` + path, returns updated `{ id, url }`.
3. Client sets `basics.image` to returned `url` after crop confirm.

**Rationale:** Separates binary upload from crop computation; edit-crop reuses step 2 only.

**Alternatives considered:**

- _Client sends cropped blob only_ — rejected; user requires original retained server-side.
- _Single multipart with crop in upload_ — acceptable shortcut but harder to re-edit; two-step is clearer.

### 6. Client crop UI with `react-image-crop`

**Decision:** Modal/dialog with aspect ratio 1:1 (profile square), drag/resize crop area, preview. On confirm, call `PATCH /media/:id/crop`. Load existing crop from `GET /media/:id/meta` (authenticated) when editing.

**Rationale:** Lightweight, widely used; no canvas upload of full cropped file from browser (server authoritative).

### 7. Delete owned media

**Decision:** `DELETE /media/:id` (authenticated, owner-only):

- Remove `storage_path` and `cropped_storage_path` from bucket
- Delete `media` row
- Client clears `basics.image` via existing `patchCvBasics` when URL matches `/media/{id}`

**Rationale:** Centralized cleanup; avoids orphaned storage when user removes photo from CV.

**Helper:** `parseMediaIdFromBasicsImage(url)` in shared util — extract UUID when URL matches API media pattern.

### 8. Image load error in view mode

**Decision:** `<img onError>` toggles error state: muted placeholder with icon + “Photo unavailable” and actions to upload replacement or delete reference.

**Rationale:** User asked to indicate errors explicitly rather than broken-image icon alone.

## Risks / Trade-offs

- **[Server CPU on crop]** → Acceptable for profile photos (single image, async PATCH); cap input dimensions via upload limits already in place.
- **[External URLs cannot edit-crop]** → Show edit-crop only when URL resolves to owned media id; external URLs get display + delete-from-CV only.
- **[Stale basics.image after manual DB delete]** → Error state + re-upload path mitigates.
- **[Migration on existing media rows]** → Nullable new columns; existing rows serve original until user crops.

## Migration Plan

1. Deploy Supabase migration adding `crop`, `cropped_storage_path`.
2. Deploy API with new endpoints and updated `GET /media/:id` selection logic.
3. Deploy web UI; no data backfill required.
4. Rollback: revert API/web; cropped column ignored; originals still served.

## Open Questions

- None blocking — aspect ratio fixed at 1:1 for profile photos unless product requests freeform later.
