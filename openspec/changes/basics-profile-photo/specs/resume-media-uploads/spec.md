## ADDED Requirements

### Requirement: Media rows MUST store crop metadata and cropped derivative path

The `public.media` table SHALL include nullable `crop jsonb` (rectangle `{ x, y, width, height }` in original-image pixel coordinates) and nullable `cropped_storage_path text` pointing at a second Storage object holding the server-generated cropped image.

#### Scenario: Crop applied after upload

- **WHEN** an authenticated client applies a crop to a media id
- **THEN** the media row SHALL persist the crop rectangle and cropped storage path
- **AND** the original `storage_path` object SHALL remain unchanged

### Requirement: GET media by id MUST serve cropped bytes when available

`GET /media/:id` SHALL stream bytes from `cropped_storage_path` when set; otherwise SHALL stream from `storage_path`. Content-Type SHALL reflect the served object.

#### Scenario: Display cropped profile photo

- **WHEN** a browser requests `GET /media/{id}` for a row with `cropped_storage_path` populated
- **THEN** the response body SHALL be the cropped derivative
- **AND** `Content-Type` SHALL match the cropped object

#### Scenario: Uncropped media fallback

- **WHEN** a browser requests `GET /media/{id}` for a row without `cropped_storage_path`
- **THEN** the response SHALL serve the original upload from `storage_path`

### Requirement: The API MUST expose authenticated crop update for media

Nest SHALL provide **`PATCH /media/:id/crop`** (Bearer required) accepting a validated crop rectangle, generating a cropped image server-side (e.g. via `sharp`), uploading it to Storage, updating `crop` and `cropped_storage_path`, and returning `{ id, url, contentType }` where `url` is the viewer URL for the id.

#### Scenario: Owner updates crop

- **WHEN** the media owner POSTs a valid crop rectangle for their media id
- **THEN** the server SHALL persist crop metadata and cropped object
- **AND** subsequent `GET /media/:id` SHALL return the new cropped bytes

#### Scenario: Non-owner crop rejected

- **WHEN** a user attempts to crop media they do not own
- **THEN** the handler SHALL respond with HTTP 403 or 404 and SHALL NOT mutate storage

### Requirement: The API MUST expose authenticated media delete

Nest SHALL provide **`DELETE /media/:id`** (Bearer required, owner-only) that removes both `storage_path` and `cropped_storage_path` objects from Storage (when present) and deletes the `media` registry row.

#### Scenario: Delete owned media

- **WHEN** the owner calls `DELETE /media/{id}`
- **THEN** both original and cropped storage objects SHALL be removed when present
- **AND** the registry row SHALL be deleted
- **AND** subsequent `GET /media/{id}` SHALL return 404

#### Scenario: Delete without bearer

- **WHEN** a client calls `DELETE /media/{id}` without authorization
- **THEN** the handler SHALL respond with HTTP 401

### Requirement: The API SHOULD expose authenticated media metadata for crop editing

Nest SHOULD provide **`GET /media/:id/meta`** (Bearer required, owner-only) returning `{ id, contentType, crop, hasCropped }` so the SPA can initialize the crop editor without downloading processing hints from Storage.

#### Scenario: Load crop params for edit

- **WHEN** the owner requests metadata for their media id with saved crop
- **THEN** the response SHALL include the stored crop rectangle

## MODIFIED Requirements

### Requirement: Uploads MUST register media rows and return API viewer URLs

Each successful upload SHALL:

1. Write the object to Supabase Storage under `{user_id}/{media_uuid}.{ext}` with MIME allow-list (PNG, JPEG, WebP, GIF) and size ceiling (`MEDIA_MAX_BYTES`, default 10 MiB).
2. Insert a row into **`public.media`** (`id`, `user_id`, `storage_path`, `content_type`, `size_bytes`, optional `crop`, optional `cropped_storage_path`).
3. Respond with **`{ id, url, contentType }`** where **`url`** is `{PUBLIC_API_URL}/media/{id}` (or `http://localhost:{PORT}/media/{id}` when `PUBLIC_API_URL` is unset).

On database insert failure after Storage write, the service SHALL attempt to remove the orphaned Storage object. Crop fields MAY be null until the client calls the crop endpoint.

#### Scenario: Successful profile photo upload

- **WHEN** an authenticated client POSTs a valid PNG under the size limit
- **THEN** the response SHALL include a UUID `id` and HTTPS-capable `url` suitable for assigning `resume.basics.image` after crop confirmation

### Requirement: SPA uploads MUST use Nest helpers only

The web client SHALL upload via `uploadResumeMedia(file)` in `apps/web/src/lib/api.ts` (multipart POST with bearer token), apply crop via a typed `patchMediaCrop(id, crop)` helper, delete via `deleteMedia(id)`, and load crop metadata via `getMediaMeta(id)` when editing. The browser MUST NOT use Supabase client libraries for Storage uploads or deletes.

#### Scenario: Basics profile photo picker with crop

- **WHEN** a signed-in user confirms crop after selecting a file in the Basics photo control
- **THEN** the client SHALL POST to `/media/upload`, PATCH `/media/:id/crop`, and assign the returned `url` to `basics.image`

#### Scenario: Basics profile photo delete

- **WHEN** a signed-in user deletes an owned profile photo from Basics view mode
- **THEN** the client SHALL DELETE `/media/:id` and patch basics to clear `image`
