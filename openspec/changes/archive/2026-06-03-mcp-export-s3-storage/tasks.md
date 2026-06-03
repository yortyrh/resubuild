## 1. Database, types, and shared infrastructure

- [x] 1.1 Add migration `supabase/migrations/*_mcp_export.sql` creating `public.mcp_export` (id, user_id, cv_id, kind, storage_path, content_type, size_bytes, filename, template_id, mode, created_at, expires_at) with check constraints on `kind`, RLS enabled, owner-only `select`/`delete` policies, and indexes on `(user_id, created_at desc)` and `(expires_at)`
- [x] 1.2 Add `McpExportKind`, `McpExportRecord`, `McpExportEnvelope`, and `McpExportUploadInput` shared types in `packages/types/src/`
- [x] 1.3 Update `apps/api` env validation/schema to recognize `MCP_EXPORT_BUCKET` (required), `MCP_EXPORT_TTL_SECONDS` (default 3600), `MCP_EXPORT_MAX_BYTES` (default 10485760)

## 2. Export storage service

- [x] 2.1 Create `apps/api/src/export-storage/` module with `ExportStorageService` exposing `uploadAndRegister`, `createSignedUrl`, and `sweepExpired`
- [x] 2.2 Implement `uploadAndRegister` with namespaced object path `${userId}/${cvId}/${kind}/${exportId}.${ext}`, transactional storage-upload-first / DB-insert-second flow, and best-effort `storage.remove` on DB failure; return `{ record, signedUrl, expiresAt }` so callers do not need a second round trip
- [x] 2.3 Implement the 10 MiB / `MCP_EXPORT_MAX_BYTES` size guard in `uploadAndRegister` (throw `PayloadTooLargeException` before any storage call)
- [x] 2.4 Implement `createSignedUrl` returning `{ url, expiresAt }` and updating `mcp_export.expires_at` to the new TTL
- [x] 2.5 (REMOVED) No `streamForDownload` — the signed URL is the entire transport; there is no API-host download endpoint
- [x] 2.6 Implement `sweepExpired` deleting rows past `expires_at` and best-effort removing their storage objects; report `{ rowsDeleted, objectsDeleted }`
- [x] 2.7 Add unit tests in `export-storage.service.spec.ts` covering upload, post-insert signed-URL issuance, signed-URL refresh, ownership check, expiry sweep, and oversize rejection (mocked Supabase client)

## 3. Scheduled sweep

- [x] 3.1 Add `@Cron('*/5 * * * *')` method on `ExportStorageService` (or dedicated `McpExportSweepService` if separation preferred) calling `sweepExpired`
- [x] 3.2 Confirm `ScheduleModule.forRoot()` is imported in `apps/api/src/app.module.ts` (already is) and that the cron is registered in the export-storage module providers
- [x] 3.3 Add unit test that advances fake timers and asserts the cron triggers `sweepExpired` with the current time

## 4. MCP export orchestrator

- [x] 4.1 Create `McpExportService` in `apps/api/src/mcp/` exposing `publishHtml`, `publishPdf`, `publishScreenshot`, `publishJsonResume`, and `refreshSignedUrl`
- [x] 4.2 Implement each `publish*` method: call the matching `CvExportService` method, compute `contentType` and `filename`, delegate to `ExportStorageService.uploadAndRegister`, return the envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind, templateId, mode? }`
- [x] 4.3 Implement `refreshSignedUrl(user, exportId, ttlSeconds?)` that re-issues the signed URL via `ExportStorageService.createSignedUrl` and returns the envelope; clamp `ttlSeconds` to [60, 86400] and throw `BadRequestException` outside the range
- [x] 4.4 Add unit tests in `mcp-export.service.spec.ts` covering each `publish*` method and the refresh path (mocked `CvExportService` + `ExportStorageService`)

## 5. Wire `ExportStorageModule` and update `McpModule`

- [x] 5.1 Create `ExportStorageModule` exporting `ExportStorageService`; import it from `McpModule` and from the new download controller module
- [x] 5.2 Add `McpExportService` to `McpModule.providers` so `McpToolsService` can inject it
- [x] 5.3 Update `apps/api/src/mcp/mcp.module.ts` to import the new module if split; otherwise just register the new service

## 6. Refactor the four `export_cv_*` MCP tools

- [x] 6.1 Update `McpToolsService` `export_cv_html` handler to call `McpExportService.publishHtml` and return the envelope
- [x] 6.2 Update `export_cv_pdf` handler to call `publishPdf`; the handler keeps its custom callback signature for parity with the existing `server.registerTool` call but returns the same envelope shape
- [x] 6.3 Update `export_cv_screenshot` handler to call `publishScreenshot`; preserve `mode` in the envelope
- [x] 6.4 Update `export_cv_jsonresume` handler to call `publishJsonResume` and additionally surface the parsed `document` field on the envelope
- [x] 6.5 Remove the now-unused `toMcpBase64Payload` / `assertMcpBinarySize` call sites in the four handlers (keep `CvExportService.toMcpBase64Payload` available for any other caller; do not delete it)
- [x] 6.6 Add the new `fetch_export_url` tool registration in `McpToolsService.registerTools`; accept `{ exportId, ttlSeconds? }` via Zod and call `McpExportService.refreshSignedUrl`
- [x] 6.7 Update `MCP_TOOL_DEFINITIONS` in `apps/api/src/mcp/tool-definitions.ts`: add `fetch_export_url` entry; rewrite the four `export_cv_*` descriptions to describe the signed-URL envelope, the default TTL, and the ability to open the URL in a browser
- [x] 6.8 Update `MCP_TOOL_NAMES` to include `fetch_export_url` (insert in the export group, maintain alphabetical order within the group)
- [x] 6.9 Update `McpToolsService` unit tests in `mcp-tools.service.spec.ts`: replace `toMcpBase64Payload` / `assertMcpBinarySize` mocks with a `mcpExportService` mock; add tests for the four `export_cv_*` envelopes and the new `fetch_export_url` tool

## 7. Signed-URL envelope (no API-host download endpoint)

- [x] 7.1 Make the `McpExportEnvelope.url` field the actual Supabase Storage signed URL (with `?token=…`) instead of an API-host viewer URL; drop the `viewerUrlForId` helper and the `ConfigService` dep from `McpExportService`
- [x] 7.2 Update `ExportStorageService.uploadAndRegister` to issue the signed URL in the same call so callers do not need a second round trip
- [x] 7.3 Remove `cv-export-downloads.controller.ts`, `cv-export-downloads.guard.ts`, and their spec files; remove the controller + guard from `cv-export.module.ts` and drop the `ExportStorageModule` import there
- [x] 7.4 Update the four `export_cv_*` and `fetch_export_url` tool descriptions in `MCP_TOOL_DEFINITIONS` to describe the Supabase signed URL (`?token=…` query param, no API-host auth needed)
- [x] 7.5 Update unit tests in `mcp-export.service.spec.ts` and `export-storage.service.spec.ts` to assert the envelope `url` is the signed storage URL (not the API-host surface)
- [x] 7.6 Update `apps/api/README.md` MCP transport section, `.env.example`, `openspec/changes/mcp-export-s3-storage/specs/mcp-exports/spec.md` and `…/mcp-server/spec.md` to match the signed-URL transport

## 8. Documentation and configuration

- [x] 8.1 Update the MCP transport section of `apps/api/README.md` to describe the signed-URL envelope (no API-host download endpoint)
- [x] 8.2 Update `.env.example` to drop the `+ /cv-export/downloads` reference
- [x] 8.3 Update the MCP client config note in `apps/api/README.md` to reflect the signed-URL transport
- [x] 8.4 The `mcp-exports` bucket is already declared in `supabase/config.toml`; `pnpm setup:env` provisions it for local Supabase stacks

## 9. Verification

- [x] 9.1 Run `pnpm --filter @resumind/api typecheck` and resolve all type errors
- [x] 9.2 Run `pnpm --filter @resumind/api test -- --run` and resolve all unit test failures (export-storage, mcp-export, mcp-tools)
- [x] 9.3 Run `pnpm verify` (format:check, Biome lint, typecheck, test, build) and confirm green
- [ ] 9.4 Manual smoke: call each of the four `export_cv_*` tools via an MCP client against a local dev API; paste the returned `url` into a browser and verify the HTML renders / PDF opens / PNG downloads / JSON parses (no `Authorization` header required)
- [ ] 9.5 (REMOVED) No `GET /cv-export/downloads/…` route to smoke
- [ ] 9.6 Manual smoke: trigger `fetch_export_url` and verify the new `url` differs from the prior one (new `?token=…` query string) while the storage object remains the same

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all existing auth, CV CRUD, sections, media upload/stream, template presentation, AI agent catalog, import LLM config, import URL validation, job application, and existing MCP scenarios from `2026-06-02-add-mcp-server` (initialize, `list_cvs`, `export_cv_jsonresume` `$schema`, `list_cv_designs`, `export_cv_html` doctype, `export_cv_screenshot` PNG, `export_cv_pdf` PDF, `replace_cv_from_jsonresume`, key limits, tool catalog exclusions, revoked-key 401, JWT 401 on `/mcp`)

### Update required

- `local-supabase.e2e-spec.ts` — **MCP export response shape** (existing scenarios that asserted `contentBase64` for `export_cv_pdf` and `export_cv_screenshot` MUST be rewritten to fetch the signed URL, decode the response, and assert `Content-Type` / byte length; the `export_cv_html` scenario that asserted `html` field MUST be rewritten to fetch the URL and assert `<!DOCTYPE html>` on the response body; the `export_cv_jsonresume` scenario that asserted `document.$schema` MAY keep that assertion but MUST additionally fetch the URL and assert `$schema` on the response body)
- `local-supabase.e2e-spec.ts` — **MCP tool catalog assertions** (extend the catalog check to require the presence of `fetch_export_url` and to assert the four `export_cv_*` descriptions reference the signed URL envelope with the `?token=…` query parameter)

### Add

- `local-supabase.e2e-spec.ts` — new `describe('E2E — MCP exports (local Supabase)')` block:
  - `export_cv_html` returns envelope with `kind = 'html'`, `url`, `exportId`; the `url` is a Supabase Storage signed URL (host on the Supabase project, contains a `?token=…` query parameter) and fetching it with no additional headers returns HTML starting with `<!DOCTYPE html>` reflecting the saved template presentation
  - `export_cv_pdf` returns envelope with `kind = 'pdf'`, `url` (Supabase Storage signed URL with `?token=…`) whose fetched body is a valid PDF (`%PDF-` header) and `Content-Type: application/pdf`
  - `export_cv_screenshot` returns envelope with `mode = 'first_page' | 'full_document'`, `url` (Supabase Storage signed URL with `?token=…`) whose fetched body is a PNG with `Content-Type: image/png`
  - `export_cv_jsonresume` returns envelope with `kind = 'jsonresume'`, `url` (Supabase Storage signed URL with `?token=…`) whose fetched body parses as JSON Resume and includes `$schema` and `meta`
  - `fetch_export_url` re-issues a signed URL for a prior `exportId`; the new `url` is different from the original (new `?token=…` query string) and the storage object bytes are unchanged
  - `fetch_export_url` with an unknown `exportId` returns 404
  - `fetch_export_url` with `ttlSeconds = 10` (below minimum) returns 400
  - An export that exceeds `MCP_EXPORT_MAX_BYTES` (forge by setting the env to a tiny value and rendering a fixture) returns 413 and no `mcp_export` row is inserted
  - Triggering the scheduled sweep (advance time or invoke `sweepExpired` directly) removes an expired `mcp_export` row and its storage object
  - Cross-user `fetch_export_url` (forge an `exportId` owned by another user) returns 404
  - Fetching the signed `url` for an `export_cv_html` envelope directly in a browser (no `Authorization` header) returns the full HTML document
