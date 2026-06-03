## ADDED Requirements

### Requirement: The system SHALL persist MCP exports to a dedicated Supabase Storage bucket

When an MCP `export_cv_*` tool succeeds, the system SHALL upload the rendered artifact to a dedicated Supabase Storage bucket (`MCP_EXPORT_BUCKET`, must be configured) under the path `${user_id}/${cv_id}/${kind}/${export_id}.${ext}` where `kind ∈ {html, pdf, screenshot, jsonresume}` and `ext ∈ {html, pdf, png, json}`. The upload SHALL be recorded as a row in `public.mcp_export` with `id`, `user_id`, `cv_id`, `kind`, `storage_path`, `content_type`, `size_bytes`, `filename`, `template_id`, `mode` (nullable, only set for `kind = 'screenshot'`), `created_at`, and `expires_at`. The row's `id` is the export id returned in the MCP tool envelope. Storage uploads SHALL occur before the DB insert; if the DB insert fails, the system SHALL best-effort remove the uploaded object to avoid orphans.

#### Scenario: Successful upload registers a row

- **WHEN** an MCP `export_cv_html` tool call succeeds for `cvId = c1` and `template = classic`
- **THEN** an object is uploaded to `MCP_EXPORT_BUCKET` at `${userId}/c1/html/${exportId}.html`
- **AND** a row is inserted in `public.mcp_export` with `kind = 'html'`, `content_type = 'text/html; charset=utf-8'`, `filename` ending in `.html`, `template_id = 'classic'`, and `size_bytes` equal to the byte length of the rendered HTML

#### Scenario: Storage upload first, DB insert second

- **WHEN** the storage upload succeeds but the `mcp_export` row insert fails
- **THEN** the system SHALL call `storage.remove([storage_path])` (best-effort) to delete the orphaned object
- **AND** the tool SHALL return an error equivalent to 500

#### Scenario: Missing bucket fails fast

- **WHEN** `MCP_EXPORT_BUCKET` is not set
- **THEN** the four `export_cv_*` tools SHALL fail with 503 and a message naming the missing env var

### Requirement: The system SHALL issue short-lived signed URLs for MCP exports

For every successful `export_cv_*` MCP tool call, the system SHALL return an envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind, templateId, mode? }`. The `url` SHALL be a Supabase Storage signed URL created via `createSignedUrl(storage_path, ttlSeconds)` with `ttlSeconds = MCP_EXPORT_TTL_SECONDS` (default 3600), and SHALL carry a `?token=…` query parameter that authenticates the request at the storage layer. The signed URL SHALL be usable from any HTTP client (browser, curl, MCP client) to download or display the artifact without any API-host auth header. `expiresAt` is the absolute ISO timestamp; `expiresInSeconds` is the relative value for clients that prefer not to parse timestamps.

The signed URL is the **entire transport**: there is no API-host download surface. The url is the canonical handoff for both the MCP tool envelope and the underlying HTTP resource; agents that need a browser-friendly or curl-friendly link paste this URL directly.

#### Scenario: Envelope includes a usable signed URL

- **WHEN** an MCP client invokes `export_cv_pdf` for an owned `cvId`
- **THEN** the result includes a `url` whose host is the Supabase Storage host
- **AND** the `url` includes a `?token=…` query parameter
- **AND** the `url`, when fetched with `GET` and no other headers, returns the PDF with `Content-Type: application/pdf`
- **AND** the envelope's `kind = 'pdf'`, `contentType = 'application/pdf'`, `filename` ends in `.pdf`, and `expiresAt` is in the future

#### Scenario: HTML URL is openable in a browser

- **WHEN** an MCP client invokes `export_cv_html` for an owned `cvId` and opens the returned `url` in a browser
- **THEN** the browser renders the complete CV HTML document (starts with `<!DOCTYPE html>`)
- **AND** the document reflects the saved template presentation for the chosen template

#### Scenario: JSON Resume URL serves the canonical document

- **WHEN** an MCP client invokes `export_cv_jsonresume` and fetches the returned `url` with `Accept: application/json`
- **THEN** the response body is a JSON object conforming to the JSON Resume schema (includes `$schema` and `meta`)
- **AND** the response `Content-Type` is `application/json; charset=utf-8`

#### Scenario: Signed URL works with no additional headers

- **WHEN** an MCP client invokes any `export_cv_*` tool and pastes the returned `url` into a browser address bar
- **THEN** the browser loads the artifact (HTML renders inline, PDF/PNG/JSON downloads or renders) without prompting for credentials
- **AND** no API-host auth header (`Authorization: Bearer …`) is required

#### Scenario: Default TTL is one hour

- **WHEN** `MCP_EXPORT_TTL_SECONDS` is not set
- **THEN** `expiresInSeconds` SHALL be 3600

### Requirement: The system SHALL enforce a maximum export size

Uploads whose `size_bytes` exceeds `MCP_EXPORT_MAX_BYTES` (default 10485760 / 10 MiB) SHALL fail with 413 Payload Too Large and a message that does not include binary data. The cap applies uniformly to HTML, PDF, screenshot (PNG), and JSON Resume exports.

#### Scenario: Oversize PDF rejected

- **WHEN** a rendered PDF for an owned CV exceeds `MCP_EXPORT_MAX_BYTES`
- **THEN** the `export_cv_pdf` tool SHALL fail with 413 and guidance to reduce content or hide sections via template presentation

#### Scenario: Screenshot rejected above cap

- **WHEN** a rendered PNG exceeds `MCP_EXPORT_MAX_BYTES`
- **THEN** the `export_cv_screenshot` tool SHALL fail with 413

### Requirement: The system SHALL allow agents to refresh a signed URL for an existing export

The system SHALL register an MCP tool `fetch_export_url` with arguments `{ exportId: uuid, ttlSeconds?: integer (60..86400) }`. The tool SHALL look up the row by `exportId` and `user_id` (from the MCP auth context), re-issue a signed URL via `createSignedUrl(storage_path, ttlSeconds)`, and update the row's `expires_at` to `now() + ttlSeconds`. The response SHALL be the same envelope shape as the `export_cv_*` tools. If the row does not exist or has already been swept, the tool SHALL fail with 404.

#### Scenario: Refresh a still-valid export

- **WHEN** an MCP client calls `fetch_export_url` with a valid `exportId` owned by the caller
- **THEN** the tool returns a new envelope with a fresh `url` and updated `expiresAt`
- **AND** the `mcp_export.expires_at` is updated to reflect the new TTL

#### Scenario: TTL clamp

- **WHEN** an MCP client calls `fetch_export_url` with `ttlSeconds = 10`
- **THEN** the tool fails with 400 because the value is below the minimum (60)

#### Scenario: Unknown export

- **WHEN** an MCP client calls `fetch_export_url` with a `exportId` that does not exist or has been swept
- **THEN** the tool fails with 404

### Requirement: The system SHALL enforce per-user ownership on `mcp_export` rows

The `public.mcp_export` table SHALL have RLS enabled with policies that restrict `select` and `delete` to `auth.uid() = user_id`. Writes are performed by the service-role client (mirroring `mcp_api_key` and `media`). The API layer SHALL additionally verify `row.user_id === authenticated user.id` for every read or delete path; mismatches SHALL return 404.

#### Scenario: Cross-user fetch denied

- **WHEN** a user calls `fetch_export_url` with an `exportId` that belongs to a different user
- **THEN** the tool fails with 404 (the row is not visible due to RLS + the API-side check)

#### Scenario: Service-role insert during upload

- **WHEN** the API successfully uploads an export on behalf of user `u`
- **THEN** the inserted row has `user_id = u` and a corresponding RLS-visible row is reachable by `u` via Supabase reads

### Requirement: The system SHALL sweep expired exports

A scheduled job (cron every 5 minutes) SHALL delete `mcp_export` rows whose `expires_at` is in the past, and SHALL best-effort remove the corresponding storage objects. The job SHALL be idempotent: removing an already-removed object is a no-op, and a row whose object was already swept is deleted normally.

#### Scenario: Expired row and object are removed

- **WHEN** the sweep runs and a row's `expires_at` is in the past
- **THEN** the storage object at `row.storage_path` is removed
- **AND** the row is deleted from `public.mcp_export`

#### Scenario: Sweep is idempotent

- **WHEN** the sweep runs twice in a row
- **THEN** the second run performs no work and reports `rowsDeleted = 0`, `objectsDeleted = 0`

#### Scenario: Sweep is best-effort

- **WHEN** a storage removal fails for one of many expired rows
- **THEN** the sweep continues to the next row and logs the failure
- **AND** the failed row is still removed from the DB (so it does not block future sweeps)

### Requirement: The system SHALL document new MCP export behavior in tool descriptions

Each of the four `export_cv_*` tool descriptions SHALL state that the result is a small envelope pointing at a signed URL, the default TTL is one hour, and the URL can be opened in a browser (HTML) or downloaded as a file (PDF / PNG / JSON). The `fetch_export_url` description SHALL state the tool re-issues a signed URL for a prior `exportId` without re-rendering, accepts an optional `ttlSeconds` clamped to [60, 86400], and returns 404 for unknown or swept exports.

#### Scenario: Tool descriptions reflect the new transport

- **WHEN** an MCP client lists the tools after initialize
- **THEN** every `export_cv_*` tool description includes a sentence referencing the signed URL envelope and the default TTL
- **AND** the `fetch_export_url` description is non-empty and explains the re-issuance semantics
