## Why

The four MCP export tools (`export_cv_html`, `export_cv_pdf`, `export_cv_screenshot`, `export_cv_jsonresume`) currently return rendered content inline: HTML as a string field, JSON Resume as an object, and PDF/PNG as base64-encoded blobs. As a result, downstream agents cannot easily fetch the artifact for downstream consumption (e.g. open the HTML in a browser tab, download the PDF, fetch the JSON via URL) without re-rendering on their side. The export payload also has to be carried through the MCP response, which already has a 10 MiB hard cap on binary exports and is the wrong transport for what should be a shareable, cacheable URL.

This change moves MCP exports to a publish-to-object-storage model: each export uploads the rendered artifact to a dedicated Supabase Storage bucket and returns a time-limited signed URL. A new MCP tool (`fetch_export_url`) lets agents re-fetch or stream the artifact by id, so HTML can be opened in a browser tab, the PDF can be downloaded, and the JSON Resume can be consumed as `application/json` directly from the URL.

## What Changes

- Add a new `mcp-exports` (object storage + signed-URL) capability that uploads rendered CV exports to a dedicated Supabase Storage bucket and issues short-lived signed URLs.
- Refactor the four `export_cv_*` MCP tools so that their successful result is a small JSON envelope `{ exportId, url, expiresAt, filename, contentType, ... }` instead of inline HTML/base64/JSON content. JSON Resume returns the parsed object **and** a signed URL so agents can either inspect it inline or `fetch()` the raw file.
- Add a new `fetch_export_url` MCP tool that returns a refreshed signed URL for a previously exported artifact, by `exportId` (or by deterministic key like `cvId + template + format + mode`) so agents can re-fetch the same artifact until it expires.
- Add a new `download_export` REST endpoint (Bearer JWT or MCP API key) at `GET /cv-export/downloads/:exportId` that streams the original object back as the correct `Content-Type` and `Content-Disposition`. This is the same signed-URL surface but exposed in the API host so browsers, curl, and other HTTP clients can use it directly.
- Keep the existing `GET /cv/:id/export/{html,pdf,json}` REST endpoints untouched (still inline) so the web preview iframe and the existing download buttons continue to work. REST is not migrating to S3 in this change.
- Keep the 10 MiB base64 cap and the existing `CvExportService` rendering pipeline (`renderHtml`, `renderPdf`, `renderScreenshot`, `renderJson`) — only the **delivery transport** for MCP changes.
- Add a new migration introducing `mcp_export` rows with `id`, `user_id`, `cv_id`, `kind` (html/pdf/screenshot/jsonresume), `storage_path`, `content_type`, `size_bytes`, `filename`, `template_id`, `mode` (nullable), `created_at`, `expires_at`. RLS restricts rows to the owner.
- Add storage lifecycle: uploads are written under `user_id/cv_id/{kind}/{exportId}.{ext}` in a new `MCP_EXPORT_BUCKET`. Default TTL is **1 hour**, configurable via `MCP_EXPORT_TTL_SECONDS`. Sweep job removes expired rows + objects.

## Capabilities

### New Capabilities

- `mcp-exports`: Object-storage-backed delivery of rendered CV exports for the MCP server. Covers upload to a dedicated Supabase Storage bucket, signed-URL issuance, `fetch_export_url` tool, `GET /cv-export/downloads/:exportId` REST download endpoint, RLS-scoped `mcp_export` registry, and TTL-based cleanup.

### Modified Capabilities

- `mcp-server`: The four `export_cv_*` tools change response shape from inline content to a small envelope containing `exportId`, `url`, `expiresAt`, and `filename` / `contentType`. The rendered artifact is uploaded once to object storage and the URL is what the agent acts on. **BREAKING** for MCP clients that previously consumed `html`, `contentBase64`, or `document` directly from the tool result. The `export_cv_pdf` `contentType` change also affects REST parity scenarios.

## Impact

- **apps/api**:
  - New `ExportStorageService` (uploads, signed URLs, deletes, expiry sweep) under `apps/api/src/export-storage/`.
  - New `mcp_export` table migration under `supabase/migrations/`.
  - `CvExportService` stays unchanged; only the MCP tool handlers in `McpToolsService` change shape. `CvExportController` (REST) is untouched.
  - New `McpExportService` (orchestrator: render → upload → persist row → return envelope), wired into `McpModule`.
  - New `McpExportController` for `GET /cv-export/downloads/:exportId`.
  - New `fetch_export_url` MCP tool in `McpToolsService` and `MCP_TOOL_DEFINITIONS`.
  - New scheduled sweep (`@nestjs/schedule`) for expired exports.
- **apps/web**: No UI changes required (REST preview iframe + download buttons still call existing endpoints).
- **supabase/migrations**: New `mcp_export` table; new RLS policy for owner-only reads; partial index on `(expires_at)` for the sweep job; new storage bucket bootstrap (via migration SQL or documented `supabase` CLI step in README).
- **packages/types**: New shared types for `McpExportRecord`, `McpExportEnvelope`, and `McpExportKind`.
- **Testing**: Unit tests for `ExportStorageService` (mocked Supabase client), `McpExportService`, the new tool, and the new controller; E2E scenarios for upload + signed-URL fetch + expiry.
- **Security**:
  - Signed URLs are short-lived (default 1h); the REST download endpoint re-checks the row's `user_id` against the authenticated user (JWT or MCP API key) and refuses expired rows.
  - `mcp_export` rows have the same RLS as `cv` (owner-only).
  - Storage paths are namespaced by `user_id` so objects cannot leak across users even if RLS is misconfigured.
- **Operational**: New env vars `MCP_EXPORT_BUCKET` (required), `MCP_EXPORT_TTL_SECONDS` (default 3600), `MCP_EXPORT_MAX_BYTES` (default 10 MiB) for parity with the existing base64 cap.
