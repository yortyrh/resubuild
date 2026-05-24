# resume-media-uploads Specification

## Purpose
TBD - created by archiving change cv-editor-ui-simplification. Update Purpose after archive.
## Requirements
### Requirement: The API MUST expose authenticated multipart upload guarded like CV mutations

Nest SHALL provide **`POST /media/upload`** accepting multipart field **`file`**, scoped to bearer-authenticated callers via the same Supabase auth guard as `/cv`. Unauthorized requests SHALL receive `401`; invalid MIME, empty body, or oversize files SHALL yield `400` before persisting registry rows.

#### Scenario: Missing bearer token on upload

- **WHEN** a client calls `POST /media/upload` without `Authorization: Bearer`
- **THEN** the handler SHALL terminate with HTTP 401 and SHALL NOT mutate storage state

### Requirement: Uploads MUST register media rows and return API viewer URLs

Each successful upload SHALL:

1. Write the object to Supabase Storage under `{user_id}/{media_uuid}.{ext}` with MIME allow-list (PNG, JPEG, WebP, GIF) and size ceiling (`MEDIA_MAX_BYTES`, default 10 MiB).
2. Insert a row into **`public.media`** (`id`, `user_id`, `storage_path`, `content_type`, `size_bytes`).
3. Respond with **`{ id, url, contentType }`** where **`url`** is `{PUBLIC_API_URL}/media/{id}` (or `http://localhost:{PORT}/media/{id}` when `PUBLIC_API_URL` is unset).

On database insert failure after Storage write, the service SHALL attempt to remove the orphaned Storage object.

#### Scenario: Successful profile photo upload

- **WHEN** an authenticated client POSTs a valid PNG under the size limit
- **THEN** the response SHALL include a UUID `id` and HTTPS-capable `url` suitable for assigning `resume.basics.image`

### Requirement: Media MUST be retrievable via public GET by opaque id

Nest SHALL expose **`GET /media/:id`** (UUID v4) **without** Bearer auth, streaming bytes with `Content-Type` from the registry and `Cache-Control: public`. Clients treat the UUID as an unguessable capability token.

#### Scenario: Embedding image in saved resume JSON

- **WHEN** a browser loads `<img src="{PUBLIC_API_URL}/media/{uuid}">` from saved resume data
- **THEN** the API SHALL return the stored image bytes with appropriate `Content-Type`

### Requirement: Supabase Storage SHALL be the configured backend

Deployments SHALL configure `SUPABASE_URL`, **`SUPABASE_SERVICE_ROLE_KEY`** (server-only), and **`MEDIA_BUCKET`**. In **production**, missing required vars SHALL fail API startup (`MediaService.onModuleInit`). In non-production, uploads MAY be disabled with a logged warning until configured.

#### Scenario: Production boot without bucket

- **WHEN** the API starts in production without `MEDIA_BUCKET`
- **THEN** startup SHALL fail with an explicit configuration error

### Requirement: SPA uploads MUST use Nest helpers only

The web client SHALL upload via `uploadResumeMedia(file)` in `apps/web/src/lib/api.ts` (multipart POST with bearer token). The browser MUST NOT use Supabase client libraries for Storage uploads.

#### Scenario: Basics profile photo picker

- **WHEN** a signed-in user selects a file in the Basics photo control
- **THEN** the client SHALL POST to `/media/upload` through the typed API helper and assign the returned `url` to `basics.image`

