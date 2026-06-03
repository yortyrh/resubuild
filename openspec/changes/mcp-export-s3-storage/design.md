## Context

The four `export_cv_*` MCP tools (`export_cv_html`, `export_cv_pdf`, `export_cv_screenshot`, `export_cv_jsonresume`) currently return rendered content inline: HTML as a UTF-8 string, JSON Resume as a parsed object, and PDF/PNG as base64-encoded buffers. The PDF/PNG path already enforces a 10 MiB cap because of the 10 MiB decoded-size limit on MCP base64 payloads, and the HTML path can be hundreds of KB on a long CV. None of these inline payloads are cacheable, and clients have no way to share, re-open, or re-fetch the artifact without re-running the tool.

Resumind already has a Supabase Storage integration for media (`apps/api/src/media/media.service.ts`) that uses the service-role client to upload to a bucket and stores object paths in `public.media`. The same `SupabaseClient.storage.from(bucket).createSignedUrl(path, expiresIn)` API is available for short-lived read URLs. The MCP server itself is mounted on `apps/api` (`apps/api/src/mcp/`) and already runs under `McpApiKeyGuard`, so authenticated identity and per-user scoping are in place.

This change moves the **delivery transport** for the four MCP export tools from inline content to signed URLs backed by a dedicated Supabase Storage bucket, with an in-database `mcp_export` registry that ties storage objects to per-user ownership and TTL.

## Goals / Non-Goals

**Goals:**

- Replace inline `html` / `contentBase64` / `document` payloads in the four `export_cv_*` MCP tools with a small envelope (`{ exportId, url, expiresAt, filename, contentType, ... }`) where `url` is a Supabase Storage signed URL (with a `?token=…` query parameter) usable from any HTTP client (browser, curl, MCP client) without any API-host auth header.
- Make the HTML export openable directly in a browser tab (so an agent can `window.open(url)` for human review).
- Make the PDF / PNG / JSON Resume exports downloadable via plain HTTP (`curl url > cv.pdf`) without an MCP round-trip.
- Add `fetch_export_url` MCP tool so agents can re-fetch a signed URL for a previously generated export until the underlying row expires, instead of re-rendering the CV.
- Keep the existing REST `GET /cv/:id/export/{html,pdf,json}` endpoints unchanged (web preview iframe + download buttons stay on inline responses).
- Reuse `CvExportService` rendering pipeline (`renderHtml`, `renderPdf`, `renderScreenshot`, `renderJson`) — only the **delivery transport** for MCP changes.
- Owner-scoped access (RLS on `mcp_export` rows, namespaced storage paths) so exports never leak across users.
- TTL-based cleanup via a scheduled sweep so the bucket does not grow unbounded.

**Non-Goals:**

- Migrating the REST preview iframe or REST download endpoints to S3 in this change.
- New user-facing UI for managing past MCP exports.
- Cross-user export sharing or public-URL exports without a Bearer.
- Replacing the existing 10 MiB MCP base64 cap with a larger soft cap; the cap moves to the upload step (object size) but the limit value stays.
- CDN/edge caching of signed URLs (signed URLs are already cacheable on the client for their TTL).
- Browser-side rendering of PDF/PNG inside the agent (still relies on the URL being opened/downloaded by the user or fetched by the agent).
- Backwards compatibility for inline `html` / `contentBase64` responses — this is a clean break for the four tools.

## Decisions

### 1) Dedicated Supabase Storage bucket (`MCP_EXPORT_BUCKET`)

New bucket, separate from `MEDIA_BUCKET`, so storage lifecycle and policies can differ. The MCP export bucket stores short-lived rendered artifacts; the media bucket stores long-lived user uploads.

- **Object path layout**: `${userId}/${cvId}/${kind}/${exportId}.${ext}` where `kind ∈ {html, pdf, screenshot, jsonresume}` and `ext ∈ {html, pdf, png, json}`. Namespacing by `userId` is a defense-in-depth in case RLS is misconfigured.
- **Lifecycle**: Objects older than `expires_at` are removed by a scheduled sweep.
- **Alternative considered**: Reuse `MEDIA_BUCKET`. Rejected — the media bucket is owner-private forever; MCP exports are short-lived and disposable. Mixing them complicates lifecycle.

### 2) Signed URLs via `createSignedUrl` with TTL

`supabase.storage.from(bucket).createSignedUrl(path, expiresIn)` returns a presigned URL that grants read access for the given window. Default `expiresIn = MCP_EXPORT_TTL_SECONDS` (default **3600s = 1h**).

- The signed URL is the only thing the agent sees. It is the canonical handoff.
- Refresh on demand via `fetch_export_url` MCP tool, which re-issues a signed URL against the existing storage path (the underlying object is still in the bucket until swept).
- **Alternative considered**: Public bucket + opaque UUID in the URL. Rejected — public buckets are not desirable for CV data; the export could be enumerated.

### 3) `mcp_export` registry table

A small Postgres table tracks each upload so we can:

1. Enforce per-user ownership at the API layer (RLS + explicit user_id checks).
2. Enforce the configured max size on upload (`MCP_EXPORT_MAX_BYTES`, default 10 MiB).
3. Resolve `exportId → storage_path` for `fetch_export_url` and the REST download endpoint.
4. Run the expiry sweep efficiently with `WHERE expires_at < now()`.

Schema:

```sql
create table public.mcp_export (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid not null,
  kind text not null check (kind in ('html','pdf','screenshot','jsonresume')),
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  filename text not null,
  template_id text,
  mode text, -- null unless kind = 'screenshot'
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (id, user_id)
);

create index mcp_export_user_idx on public.mcp_export (user_id, created_at desc);
create index mcp_export_expiry_idx on public.mcp_export (expires_at);
alter table public.mcp_export enable row level security;
create policy mcp_export_owner_select on public.mcp_export
  for select using (auth.uid() = user_id);
create policy mcp_export_owner_delete on public.mcp_export
  for delete using (auth.uid() = user_id);
```

The service-role client is used for writes (mirroring how `mcp_api_key` is managed), but reads by the API are still user-scoped via the row's `user_id` and the MCP/REST auth guards.

### 4) `ExportStorageService` (single source of truth for storage I/O)

A new service in `apps/api/src/export-storage/` exposes:

```ts
class ExportStorageService {
  uploadAndRegister(input: UploadExportInput): Promise<McpExportRecord>;
  createSignedUrl(
    exportId: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<{ url: string; expiresAt: string }>;
  streamForDownload(
    exportId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }>;
  sweepExpired(now?: Date): Promise<{ rowsDeleted: number; objectsDeleted: number }>;
}
```

- `uploadAndRegister` uploads to Supabase Storage, inserts a `mcp_export` row in a single transactional path (storage upload first, DB insert second; on DB failure, best-effort `storage.remove` to avoid orphan objects — same pattern as `MediaService.uploadBuffer`).
- `createSignedUrl` is the only path that returns a signed URL; it is reused by both `fetch_export_url` and the four `export_cv_*` tool handlers.
- `streamForDownload` is used by the new REST endpoint and is identical to `MediaService.loadMediaPayload` in spirit: re-validate ownership, fetch the blob, return buffer + content-type + filename.
- `sweepExpired` is called by a `@Cron` job every 5 minutes (configurable) and uses `supabase.storage.remove([paths])` then `delete from mcp_export where expires_at < now()`.

**Alternative considered**: One-off code in each `export_cv_*` tool handler. Rejected — the upload / signed-URL / expiry logic is identical across all four kinds and must be tested in one place.

### 5) `McpExportService` (orchestrator: render → upload → envelope)

A thin orchestrator in `apps/api/src/mcp/` that takes the existing `CvExportService` output (string / buffer / parsed JSON) and hands it to `ExportStorageService`. Public surface:

```ts
class McpExportService {
  publishHtml(user, cvId, template): Promise<McpExportEnvelope>;
  publishPdf(user, cvId, template): Promise<McpExportEnvelope>;
  publishScreenshot(user, cvId, opts): Promise<McpExportEnvelope>;
  publishJsonResume(user, cvId): Promise<McpExportEnvelope>;
  refreshSignedUrl(user, exportId): Promise<McpExportEnvelope>;
}
```

Each `publish*` method:

1. Calls the matching `CvExportService` method.
2. Wraps the result in a buffer/string with the correct `contentType` and `filename`.
3. Calls `ExportStorageService.uploadAndRegister(...)`.
4. Returns the envelope `{ exportId, url, expiresAt, filename, contentType, sizeBytes }`.

`refreshSignedUrl` re-issues a signed URL for an existing `exportId` and updates the row's `expires_at = now() + ttlSeconds` so agents that re-fetch don't see the URL expire mid-task.

### 6) New response envelope for the four `export_cv_*` tools

Old (example for `export_cv_html`):

```json
{ "html": "<!DOCTYPE html>...", "templateId": "classic" }
```

New:

```json
{
  "exportId": "9f1b…",
  "url": "https://…/storage/v1/object/sign/mcp-exports/<user>/<cv>/html/<id>.html?token=…",
  "expiresAt": "2026-06-02T23:00:00Z",
  "filename": "jane-doe-classic.html",
  "contentType": "text/html; charset=utf-8",
  "sizeBytes": 12345,
  "templateId": "classic",
  "kind": "html"
}
```

`export_cv_pdf` keeps the same envelope shape with `kind: "pdf"` and `contentType: "application/pdf"`. `export_cv_screenshot` adds `mode: "first_page" | "full_document"`. `export_cv_jsonresume` also returns `document: { ... }` (the parsed JSON Resume) **in addition to** the envelope, so the agent can reason about it inline without an extra round-trip when convenient — but the canonical handoff for downstream consumption is the URL.

The `contentType` / `filename` / `sizeBytes` fields are the same envelope fields already exposed for streaming download.

### 7) `fetch_export_url` MCP tool

Arguments:

```ts
const refreshSchema = z.object({
  exportId: z.string().uuid(),
  ttlSeconds: z.number().int().min(60).max(86400).optional(),
});
```

Returns the same envelope, with `url` regenerated for the requested TTL. If the underlying row has been swept, the tool returns an error equivalent to 404 (not 410 — the row is gone, not the bucket).

### 8) No API-host download endpoint

The signed URL returned by the four `export_cv_*` tools (and by `fetch_export_url`) is the entire transport. There is no separate API-host download endpoint — agents paste the signed URL into a browser, `curl`, or `fetch` and the Supabase Storage host serves the artifact directly. This keeps the API host out of the byte path, avoids a redundant auth hop, and means the signed URL is the only thing clients need to round-trip.

### 9) Scheduled sweep via `@nestjs/schedule`

Add a single `@Cron('*/5 * * * *')` method in `ExportStorageService` (or a dedicated `McpExportSweepService` if we want to keep `ExportStorageService` pure) that calls `sweepExpired()`. The schedule module is already imported in `app.module.ts` (`ScheduleModule.forRoot()`), so no new dependency.

The sweep is best-effort and idempotent: a row whose `expires_at` is past can safely be deleted, and an object that was already removed (e.g. by a previous sweep that crashed between the two steps) is a no-op.

### 10) Tool documentation updates

Each `export_cv_*` tool description is rewritten to:

- State the response is now a small envelope pointing at a signed URL.
- Explain that the URL can be opened in a browser (HTML), downloaded as a file (PDF/PNG/JSON), or fetched via HTTP.
- Mention the default TTL (1h) and how to refresh it via `fetch_export_url`.

`fetch_export_url` description explains: argument is a prior `exportId`; the tool refreshes the signed URL without re-rendering; `ttlSeconds` is optional and clamped to [60, 86400].

## Risks / Trade-offs

- **[MCP client compatibility break]** → This is a hard **BREAKING** change for any agent that depends on `html` / `contentBase64` / `document` fields in the four `export_cv_*` tool results. Mitigated by: (a) the change is internal to Resumind and shipped in one release; (b) the new `url` field plus the same `filename` / `contentType` envelope fields means clients that only need a download still work after they switch to `fetch(url)`; (c) we update the MCP tool descriptions so agents are steered toward the URL.
- **[Signed URL leakage]** → Signed URLs are bearer tokens. They are scoped to one object, short-lived, and the path is namespaced by `userId`. Acceptable for v1; document the warning in the tool description ("treat the URL as secret until it expires").
- **[Bucket misconfiguration]** → The `MCP_EXPORT_BUCKET` env var is required in production (mirrors the `MEDIA_BUCKET` requirement in `MediaService.onModuleInit`). If absent, the four `export_cv_*` tools return 503 just like PDF/screenshot do today when Chromium is down.
- **[Sweep lag]** → With a 5-minute cron, an expired export can be reachable for up to 5 minutes after `expires_at`. The signed URL itself is the real authorization; the sweep is just for storage hygiene. Acceptable.
- **[Orphaned storage objects on DB insert failure]** → Same trade-off as `MediaService.uploadBuffer`: storage upload first, DB insert second, best-effort `storage.remove` on DB failure. Tested via unit tests that simulate DB errors.
- **[Storage cost on a high-traffic tenant]** → TTL defaults to 1h, not 24h, and the sweep is aggressive. Worst case is still bounded by `users × exports_per_minute × 1h × avg_size`. Documented in `apps/api/README.md`.
- **[MCP server disabled in tests]** → `McpExportService` is unit-testable in isolation with a mocked `ExportStorageService`. The REST download endpoint is tested via E2E (real Supabase Storage) per `e2e-testing` spec.

## Migration Plan

1. **Migration**: ship `supabase/migrations/<ts>_mcp_export.sql` with the table, indexes, RLS policies, and a `create extension if not exists pgcrypto` if `gen_random_uuid` is not already covered. Run `supabase db reset` locally to apply.
2. **Bucket**: document creating the bucket in `apps/api/README.md` (`supabase storage create mcp-exports --public false`) or include a SQL migration that creates the bucket via the `storage.buckets` table. Local `supabase start` must create the bucket; CI seeds must too.
3. **Wire `ExportStorageService`** into a new `ExportStorageModule` and import it from `McpModule` + the new download controller.
4. **Update `McpToolsService`**: replace the four tool handlers to call `McpExportService.publish*` and return the envelope. Add `fetch_export_url`. Update `MCP_TOOL_DEFINITIONS` (descriptions + no `readOnlyHint` regression).
5. **Add `McpExportController`** for `GET /cv-export/downloads/:exportId`. Accept either Bearer JWT or MCP API key (use a small `@UseGuards` chain: `SupabaseAuthGuard || McpApiKeyGuard` via a tiny composite guard or two parallel guards).
6. **Sweep**: add `@Cron` to `ExportStorageService` (or a separate `McpExportSweepService`) and confirm `ScheduleModule` is initialized in `app.module.ts` (already is).
7. **Update tests**: unit tests for `ExportStorageService`, `McpExportService`, the four tool handlers, the new tool, the download controller. E2E scenarios: upload via MCP, refresh signed URL, download via REST with both JWT and API key, expired export returns 404, sweep removes the row.
8. **Update `apps/api/README.md`**: new env vars (`MCP_EXPORT_BUCKET`, `MCP_EXPORT_TTL_SECONDS`, `MCP_EXPORT_MAX_BYTES`), bucket setup, MCP tool behavior change.
9. **Rollback**: drop the migration (drops the table; objects in `MCP_EXPORT_BUCKET` are abandoned, not deleted — acceptable for rollback). Revert tool handler changes. The bucket itself is left in place for a future re-enable.

## Open Questions

- **Should `export_cv_jsonresume` still return `document` inline?** Decision: yes, keep `document` for the parsed object in addition to the URL. This is a one-time free win for the most common LLM case. Confirm with product before implementation.
- **Should the `url` TTL be visible in the envelope as a relative seconds value too?** Decision: yes, add `expiresInSeconds: number` alongside `expiresAt: string` so clients do not have to parse ISO timestamps.
- **Do we need a `delete_export` MCP tool?** Decision: not in v1. The sweep handles cleanup; explicit delete can be added in a follow-up if users ask for it.
- **Should we reject the four `export_cv_*` tools in MCP v1 if the bucket is missing, or return inline content as a fallback?** Decision: fail fast with 503 (matches the existing pattern for missing Chromium). Inline fallback would re-introduce the 10 MiB base64 path and the change is the entire point.
