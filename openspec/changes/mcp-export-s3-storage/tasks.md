## 1. Database, types, and shared infrastructure

- [ ] 1.1 Add migration `supabase/migrations/*_mcp_export.sql` creating `public.mcp_export` (id, user_id, cv_id, kind, storage_path, content_type, size_bytes, filename, template_id, mode, created_at, expires_at) with check constraints on `kind`, RLS enabled, owner-only `select`/`delete` policies, and indexes on `(user_id, created_at desc)` and `(expires_at)`
- [ ] 1.2 Add `McpExportKind`, `McpExportRecord`, `McpExportEnvelope`, and `McpExportUploadInput` shared types in `packages/types/src/`
- [ ] 1.3 Update `apps/api` env validation/schema to recognize `MCP_EXPORT_BUCKET` (required), `MCP_EXPORT_TTL_SECONDS` (default 3600), `MCP_EXPORT_MAX_BYTES` (default 10485760)

## 2. Export storage service

- [ ] 2.1 Create `apps/api/src/export-storage/` module with `ExportStorageService` exposing `uploadAndRegister`, `createSignedUrl`, `streamForDownload`, and `sweepExpired`
- [ ] 2.2 Implement `uploadAndRegister` with namespaced object path `${userId}/${cvId}/${kind}/${exportId}.${ext}`, transactional storage-upload-first / DB-insert-second flow, and best-effort `storage.remove` on DB failure
- [ ] 2.3 Implement the 10 MiB / `MCP_EXPORT_MAX_BYTES` size guard in `uploadAndRegister` (throw `PayloadTooLargeException` before any storage call)
- [ ] 2.4 Implement `createSignedUrl` returning `{ url, expiresAt }` and updating `mcp_export.expires_at` to the new TTL
- [ ] 2.5 Implement `streamForDownload` returning `{ buffer, contentType, filename }` after re-validating `user_id` ownership and `expires_at` (return `NotFoundException` for expired rows)
- [ ] 2.6 Implement `sweepExpired` deleting rows past `expires_at` and best-effort removing their storage objects; report `{ rowsDeleted, objectsDeleted }`
- [ ] 2.7 Add unit tests in `export-storage.service.spec.ts` covering upload, signed-URL issuance, ownership check, expiry sweep, and oversize rejection (mocked Supabase client)

## 3. Scheduled sweep

- [ ] 3.1 Add `@Cron('*/5 * * * *')` method on `ExportStorageService` (or dedicated `McpExportSweepService` if separation preferred) calling `sweepExpired`
- [ ] 3.2 Confirm `ScheduleModule.forRoot()` is imported in `apps/api/src/app.module.ts` (already is) and that the cron is registered in the export-storage module providers
- [ ] 3.3 Add unit test that advances fake timers and asserts the cron triggers `sweepExpired` with the current time

## 4. MCP export orchestrator

- [ ] 4.1 Create `McpExportService` in `apps/api/src/mcp/` exposing `publishHtml`, `publishPdf`, `publishScreenshot`, `publishJsonResume`, and `refreshSignedUrl`
- [ ] 4.2 Implement each `publish*` method: call the matching `CvExportService` method, compute `contentType` and `filename`, delegate to `ExportStorageService.uploadAndRegister`, return the envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind, templateId, mode? }`
- [ ] 4.3 Implement `refreshSignedUrl(user, exportId, ttlSeconds?)` that re-issues the signed URL via `ExportStorageService.createSignedUrl` and returns the envelope; clamp `ttlSeconds` to [60, 86400] and throw `BadRequestException` outside the range
- [ ] 4.4 Add unit tests in `mcp-export.service.spec.ts` covering each `publish*` method and the refresh path (mocked `CvExportService` + `ExportStorageService`)

## 5. Wire `ExportStorageModule` and update `McpModule`

- [ ] 5.1 Create `ExportStorageModule` exporting `ExportStorageService`; import it from `McpModule` and from the new download controller module
- [ ] 5.2 Add `McpExportService` to `McpModule.providers` so `McpToolsService` can inject it
- [ ] 5.3 Update `apps/api/src/mcp/mcp.module.ts` to import the new module if split; otherwise just register the new service

## 6. Refactor the four `export_cv_*` MCP tools

- [ ] 6.1 Update `McpToolsService` `export_cv_html` handler to call `McpExportService.publishHtml` and return the envelope
- [ ] 6.2 Update `export_cv_pdf` handler to call `publishPdf`; the handler keeps its custom callback signature for parity with the existing `server.registerTool` call but returns the same envelope shape
- [ ] 6.3 Update `export_cv_screenshot` handler to call `publishScreenshot`; preserve `mode` in the envelope
- [ ] 6.4 Update `export_cv_jsonresume` handler to call `publishJsonResume` and additionally surface the parsed `document` field on the envelope
- [ ] 6.5 Remove the now-unused `toMcpBase64Payload` / `assertMcpBinarySize` call sites in the four handlers (keep `CvExportService.toMcpBase64Payload` available for any other caller; do not delete it)
- [ ] 6.6 Add the new `fetch_export_url` tool registration in `McpToolsService.registerTools`; accept `{ exportId, ttlSeconds? }` via Zod and call `McpExportService.refreshSignedUrl`
- [ ] 6.7 Update `MCP_TOOL_DEFINITIONS` in `apps/api/src/mcp/tool-definitions.ts`: add `fetch_export_url` entry; rewrite the four `export_cv_*` descriptions to describe the signed-URL envelope, the default TTL, and the ability to open the URL in a browser
- [ ] 6.8 Update `MCP_TOOL_NAMES` to include `fetch_export_url` (insert in the export group, maintain alphabetical order within the group)
- [ ] 6.9 Update `McpToolsService` unit tests in `mcp-tools.service.spec.ts`: replace `toMcpBase64Payload` / `assertMcpBinarySize` mocks with a `mcpExportService` mock; add tests for the four `export_cv_*` envelopes and the new `fetch_export_url` tool

## 7. REST download endpoint

- [ ] 7.1 Create `apps/api/src/cv-export/cv-export-downloads.controller.ts` exposing `GET /cv-export/downloads/:exportId`
- [ ] 7.2 Apply a composite guard that accepts either `SupabaseAuthGuard` (Bearer JWT) or `McpApiKeyGuard` (MCP API key); resolve `req.user.id` from whichever guard ran
- [ ] 7.3 Stream the object back as `application/pdf` / `image/png` / `text/html; charset=utf-8` / `application/json; charset=utf-8` with `Content-Disposition: attachment; filename="<row.filename>"` via `@Header` and `StreamableFile`
- [ ] 7.4 Return 404 (not 403) when `req.user.id !== row.user_id` and when the row is expired
- [ ] 7.5 Register the controller in `apps/api/src/cv-export/cv-export.module.ts` (or a new `cv-export-downloads.module.ts` if you prefer to keep `CvExportModule` unchanged) and add the module to `app.module.ts`
- [ ] 7.6 Add unit tests in `cv-export-downloads.controller.spec.ts` for the happy path (JWT), the MCP API key path, the cross-user 404, and the expired 404

## 8. Documentation and configuration

- [ ] 8.1 Add a new section to `apps/api/README.md` documenting `MCP_EXPORT_BUCKET`, `MCP_EXPORT_TTL_SECONDS`, `MCP_EXPORT_MAX_BYTES`, the bucket creation step (`supabase storage create mcp-exports --public false`), and the breaking change to the four `export_cv_*` tool responses
- [ ] 8.2 Add `MCP_EXPORT_BUCKET` to `.env.example` files where present and to the local Supabase setup script (`scripts/setup-env.mjs` or equivalent)
- [ ] 8.3 Add a one-line note in the MCP client config section of `apps/api/README.md` explaining that exported artifacts are now URLs instead of inline content, with the `fetch_export_url` workaround for refreshing signed URLs
- [ ] 8.4 Update `apps/api/test/setup-env.sh` (or the e2e setup script) to create the `mcp-exports` bucket in local Supabase before `pnpm samples:seed`

## 9. Verification

- [ ] 9.1 Run `pnpm --filter @resumind/api typecheck` and resolve all type errors
- [ ] 9.2 Run `pnpm --filter @resumind/api test -- --run` and resolve all unit test failures (export-storage, mcp-export, mcp-tools, cv-export-downloads)
- [ ] 9.3 Run `pnpm verify` (format:check, Biome lint, typecheck, test, build) and confirm green
- [ ] 9.4 Manual smoke: call each of the four `export_cv_*` tools via an MCP client against a local dev API; verify the returned `url` opens in a browser (HTML) or downloads correctly (PDF, PNG, JSON)
- [ ] 9.5 Manual smoke: hit `GET /cv-export/downloads/:exportId` with both a Bearer JWT and an MCP API key; confirm correct `Content-Type` and `Content-Disposition`
- [ ] 9.6 Manual smoke: trigger `fetch_export_url` and verify the new `url` differs from the prior one while the storage object remains the same

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all existing auth, CV CRUD, sections, media upload/stream, template presentation, AI agent catalog, import LLM config, import URL validation, job application, and existing MCP scenarios from `2026-06-02-add-mcp-server` (initialize, `list_cvs`, `export_cv_jsonresume` `$schema`, `list_cv_designs`, `export_cv_html` doctype, `export_cv_screenshot` PNG, `export_cv_pdf` PDF, `replace_cv_from_jsonresume`, key limits, tool catalog exclusions, revoked-key 401, JWT 401 on `/mcp`)

### Update required

- `local-supabase.e2e-spec.ts` — **MCP export response shape** (existing scenarios that asserted `contentBase64` for `export_cv_pdf` and `export_cv_screenshot` MUST be rewritten to fetch the signed URL, decode the response, and assert `Content-Type` / byte length; the `export_cv_html` scenario that asserted `html` field MUST be rewritten to fetch the URL and assert `<!DOCTYPE html>` on the response body; the `export_cv_jsonresume` scenario that asserted `document.$schema` MAY keep that assertion but MUST additionally fetch the URL and assert `$schema` on the response body)
- `local-supabase.e2e-spec.ts` — **MCP tool catalog assertions** (extend the catalog check to require the presence of `fetch_export_url` and to assert the four `export_cv_*` descriptions reference the signed URL envelope)

### Add

- `local-supabase.e2e-spec.ts` — new `describe('E2E — MCP exports (local Supabase)')` block:
  - `export_cv_html` returns envelope with `kind = 'html'`, `url`, `exportId`; fetching the URL returns HTML starting with `<!DOCTYPE html>` and reflects the saved template presentation
  - `export_cv_pdf` returns envelope with `kind = 'pdf'`, `url` whose fetched body is a valid PDF (`%PDF-` header) and `Content-Type: application/pdf`
  - `export_cv_screenshot` returns envelope with `mode = 'first_page' | 'full_document'`, `url` whose fetched body is a PNG with `Content-Type: image/png`
  - `export_cv_jsonresume` returns envelope with `kind = 'jsonresume'`, `url` whose fetched body parses as JSON Resume and includes `$schema` and `meta`
  - `fetch_export_url` re-issues a signed URL for a prior `exportId`; the new `url` is different from the original and the storage object bytes are unchanged
  - `fetch_export_url` with an unknown `exportId` returns 404
  - `fetch_export_url` with `ttlSeconds = 10` (below minimum) returns 400
  - `GET /cv-export/downloads/:exportId` with Bearer JWT streams the correct `Content-Type` and `Content-Disposition` for the row's `kind`
  - `GET /cv-export/downloads/:exportId` with MCP API key behaves identically when the key's `user_id` matches the row
  - `GET /cv-export/downloads/:exportId` for another user's row returns 404
  - An export that exceeds `MCP_EXPORT_MAX_BYTES` (forge by setting the env to a tiny value and rendering a fixture) returns 413 and no `mcp_export` row is inserted
  - Triggering the scheduled sweep (advance time or invoke `sweepExpired` directly) removes an expired `mcp_export` row and its storage object
  - Cross-user `fetch_export_url` (forge an `exportId` owned by another user) returns 404
