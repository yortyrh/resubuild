## 1. Dependencies and lockfile

- [ ] 1.1 Add `@rekog/mcp-nest@^1.9.10` to `apps/api/package.json` `dependencies` (latest 1.9.x; verified via Context7 on 2026-06-03)
- [ ] 1.2 Add `zod@^4.3.5` to `apps/api/package.json` `dependencies` (the wrapper's required peer dep range)
- [ ] 1.3 Remove the direct `@modelcontextprotocol/sdk` entry from `apps/api/package.json` `dependencies` (the wrapper declares it as a peer dep; the lockfile keeps it transitively). Leave `@types/*` and other SDK-shaped deps untouched
- [ ] 1.4 Run `pnpm install` and confirm `pnpm-lock.yaml` resolves cleanly with no peer-dep warnings
- [ ] 1.5 Search `apps/api/src` for any direct `z.X` calls that may be v3-only (`z.record(z.string(), z.unknown())`, `z.string().uuid()`, `z.enum([...])`, `z.number().int().min(60).max(86400)`, etc. — the `tool-definitions.ts` and the new tool schemas). If a v3-only pattern is found, patch the call site or pin `zod@^3.25.x` in a follow-up; do not skip the upgrade

## 2. Module wiring

- [ ] 2.1 Rewrite `apps/api/src/mcp/mcp.module.ts` to (a) import `McpModule.forRoot({...})` from `@rekog/mcp-nest` with `name = 'resumind'`, `version = '1.0.0'`, `transport: [McpTransportType.STREAMABLE_HTTP]`, `capabilities: { tools: { listChanged: false }, resources: { listChanged: false } }`, `streamableHttp: { sessionIdGenerator: () => randomUUID(), statelessMode: false, enableJsonResponse: false }`; (b) gate the import on `MCP_SERVER_ENABLED` (skip when `"false"` / `"0"`, register otherwise); (c) keep `McpAuthModule`, `McpKeyRepository`, `McpApiKeyGuard`, `McpSettingsService`, `McpSettingsController`, `McpExportService` providers; (d) drop `McpToolsService` and `McpController` from providers / controllers
- [ ] 2.2 Apply `McpApiKeyGuard` to the wrapper's `/mcp` and `/mcp/` routes — either via a global `APP_GUARD` provider (scoped to the `McpModule`'s route prefix) or via the wrapper's `McpModule.forRoot({ guards: [McpApiKeyGuard] })` option (verify against the wrapper's documented config surface)
- [ ] 2.3 Confirm `apps/api/src/app.module.ts` still imports `McpModule` (no change required at the app-module layer)

## 3. Auth-context bridge

- [ ] 3.1 Create `apps/api/src/mcp/mcp-auth-request-bridge.interceptor.ts` (`@Injectable()` implementing `NestInterceptor`) that wraps each incoming request in `mcpAuthStorage.run(req.user, () => next.handle().toPromise())`. Skip wrapping when `req.user` is undefined (the guard has not run yet, e.g. on a non-MCP route)
- [ ] 3.2 Register the interceptor for the `/mcp` and `/mcp/` routes only — via `APP_INTERCEPTOR` scoped to a route prefix, or by adding `MiddlewareConsumer.apply(...).forRoutes('mcp', 'mcp/')` in `McpModule.configure(consumer)`. The bridge MUST NOT run on `GET /settings/mcp` (REST) or any other route
- [ ] 3.3 Keep `apps/api/src/mcp/mcp-auth.context.ts` and its `mcp-auth.context.spec.ts` UNCHANGED — `mcpAuthStorage`, `getMcpAuthUser()`, and the "throws outside a `run` context" semantics stay byte-compatible
- [ ] 3.4 Add `apps/api/src/mcp/mcp-auth-request-bridge.interceptor.spec.ts` covering: (a) the interceptor runs the request handler inside `mcpAuthStorage.run(req.user, ...)`; (b) `getMcpAuthUser()` is reachable from inside the handler; (c) when `req.user` is undefined, the interceptor passes through without wrapping (and `getMcpAuthUser()` throws — same as today)

## 4. Tool providers — CV CRUD

- [ ] 4.1 Create `apps/api/src/mcp/tools/cv/list-cvs.tool.ts` (`@Injectable()`, `@Tool({ name: 'list_cvs', description: MCP_TOOL_DEFINITIONS.list_cvs.description, annotations: { readOnlyHint: true } })`) — handler returns `this.cvService.findAll(getMcpAuthUser())`
- [ ] 4.2 Create `apps/api/src/mcp/tools/cv/get-cv.tool.ts` (`@Tool({ name: 'get_cv', description: ..., parameters: z.object({ cvId: z.string().uuid() }), annotations: { readOnlyHint: true } })`) — handler returns `this.cvService.findOne(getMcpAuthUser(), args.cvId)`
- [ ] 4.3 Create `apps/api/src/mcp/tools/cv/delete-cv.tool.ts` (`@Tool({ name: 'delete_cv', parameters: cvIdSchema, annotations: { destructiveHint: true } })`) — handler returns `{ ok: true, cvId }`
- [ ] 4.4 Create `apps/api/src/mcp/tools/cv/create-cv-from-jsonresume.tool.ts` (`@Tool({ name: 'create_cv_from_jsonresume', parameters: jsonResumeCreateSchema })`) — handler delegates to `CvJsonResumeSwapService.createFromJsonResume(getMcpAuthUser(), args.document)` and returns `{ cvId, cv }`
- [ ] 4.5 Create `apps/api/src/mcp/tools/cv/replace-cv-from-jsonresume.tool.ts` (`@Tool({ name: 'replace_cv_from_jsonresume', parameters: jsonResumeReplaceSchema, annotations: { destructiveHint: true } })`) — handler delegates to `CvJsonResumeSwapService.replaceFromJsonResume(...)` and returns `{ cvId, cv }`
- [ ] 4.6 Add colocated `*.spec.ts` for each of the 5 CV CRUD tools; each spec mocks the underlying service and asserts: (a) the handler calls the right service method with `getMcpAuthUser()`'s return value; (b) the return shape matches the expected envelope (raw value for read tools, `{ ok, cvId }` for delete, `{ cvId, cv }` for create/replace); (c) invalid input against the Zod schema is rejected by the wrapper (assert via direct `schema.safeParse(...)` — the wrapper's validation path is exercised in the module-level spec)

## 5. Tool providers — CV export (signed-URL envelope)

- [ ] 5.1 Create `apps/api/src/mcp/tools/export/list-cv-designs.tool.ts` (`@Tool({ name: 'list_cv_designs', annotations: { readOnlyHint: true } })`) — handler returns `this.cvExportService.listTemplateCatalog()`
- [ ] 5.2 Create `apps/api/src/mcp/tools/export/export-cv-html.tool.ts` (`@Tool({ name: 'export_cv_html', parameters: templateOptionalSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.mcpExportService.publishHtml(getMcpAuthUser(), args.cvId, args.template)`
- [ ] 5.3 Create `apps/api/src/mcp/tools/export/export-cv-pdf.tool.ts` (`@Tool({ name: 'export_cv_pdf', parameters: templateOptionalSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.mcpExportService.publishPdf(...)`
- [ ] 5.4 Create `apps/api/src/mcp/tools/export/export-cv-screenshot.tool.ts` (`@Tool({ name: 'export_cv_screenshot', parameters: screenshotSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.mcpExportService.publishScreenshot(getMcpAuthUser(), args.cvId, { template: args.template, mode: args.mode })`
- [ ] 5.5 Create `apps/api/src/mcp/tools/export/export-cv-jsonresume.tool.ts` (`@Tool({ name: 'export_cv_jsonresume', parameters: cvIdSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.mcpExportService.publishJsonResume(getMcpAuthUser(), args.cvId)` (the orchestrator already returns `{ ...envelope, document }`)
- [ ] 5.6 Create `apps/api/src/mcp/tools/export/fetch-export-url.tool.ts` (`@Tool({ name: 'fetch_export_url', parameters: fetchExportUrlSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.mcpExportService.refreshSignedUrl(getMcpAuthUser(), args.exportId, args.ttlSeconds)`
- [ ] 5.7 Move the Zod schemas (`cvIdSchema`, `templateOptionalSchema`, `screenshotSchema`, `jsonResumeCreateSchema`, `jsonResumeReplaceSchema`, `fetchExportUrlSchema`, etc.) from `mcp-tools.service.ts` to a new `apps/api/src/mcp/tools/_schemas.ts` (or co-locate them at the top of each `*.tool.ts` — pick one and document the choice)
- [ ] 5.8 Add colocated `*.spec.ts` for each of the 6 export tools; each spec mocks `mcpExportService` (or `cvExportService` for `list_cv_designs`) and asserts: (a) the handler returns the envelope shape; (b) the right service method is called; (c) the `McpExportEnvelope` shape is preserved (or the `McpExportEnvelope & { document? }` shape for JSON Resume)

## 6. Tool providers — CV presentation

- [ ] 6.1 Create `apps/api/src/mcp/tools/presentation/get-cv-template-presentation.tool.ts` (`@Tool({ name: 'get_cv_template_presentation', parameters: presentationSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.presentationService.getPresentation(getMcpAuthUser(), args.cvId, args.template)`
- [ ] 6.2 Create `apps/api/src/mcp/tools/presentation/update-cv-template-presentation.tool.ts` (`@Tool({ name: 'update_cv_template_presentation', parameters: presentationPatchSchema })`) — handler returns `this.presentationService.upsertPresentation(getMcpAuthUser(), args.cvId, args.template, args.config as Partial<CvTemplatePresentationConfig>)`
- [ ] 6.3 Add colocated `*.spec.ts` for each of the 2 presentation tools; mock `presentationService` and assert the handler returns the right shape

## 7. Tool providers — Applications

- [ ] 7.1 Create `apps/api/src/mcp/tools/applications/list-applications.tool.ts` (`@Tool({ name: 'list_applications', annotations: { readOnlyHint: true } })`) — handler returns `this.applicationService.findAll(getMcpAuthUser())`
- [ ] 7.2 Create `apps/api/src/mcp/tools/applications/get-application.tool.ts` (`@Tool({ name: 'get_application', parameters: applicationIdSchema, annotations: { readOnlyHint: true } })`) — handler returns `this.applicationService.findOne(getMcpAuthUser(), args.applicationId)`
- [ ] 7.3 Create `apps/api/src/mcp/tools/applications/update-application.tool.ts` (`@Tool({ name: 'update_application', parameters: updateApplicationSchema })`) — handler strips `applicationId` from the args and calls `this.applicationService.patchApplicationMetadata(getMcpAuthUser(), applicationId, patch)`
- [ ] 7.4 Create `apps/api/src/mcp/tools/applications/update-application-letter.tool.ts` (`@Tool({ name: 'update_application_letter', parameters: updateLetterSchema })`) — handler calls `this.applicationService.updateCoverLetter(getMcpAuthUser(), applicationId, coverLetter)`
- [ ] 7.5 Add colocated `*.spec.ts` for each of the 4 application tools; mock `applicationService` and assert the handler returns the right shape

## 8. Tool providers — Media

- [ ] 8.1 Create `apps/api/src/mcp/tools/media/list-media.tool.ts` (`@Tool({ name: 'list_media', annotations: { readOnlyHint: true } })`) — handler maps `mediaService.listMediaForUser(user.id)` to `{ ...item, url: mediaService.viewerUrlForId(item.id) }` and returns the list
- [ ] 8.2 Create `apps/api/src/mcp/tools/media/get-media-url.tool.ts` (`@Tool({ name: 'get_media_url', parameters: mediaIdSchema, annotations: { readOnlyHint: true } })`) — handler returns `{ id, url, contentType, crop, hasCropped }`
- [ ] 8.3 Create `apps/api/src/mcp/tools/media/delete-media.tool.ts` (`@Tool({ name: 'delete_media', parameters: mediaIdSchema, annotations: { destructiveHint: true } })`) — handler returns `{ ok: true, mediaId }`
- [ ] 8.4 Add colocated `*.spec.ts` for each of the 3 media tools; mock `mediaService` and assert the handler returns the right shape

## 9. Resource providers

- [ ] 9.1 Create `apps/api/src/mcp/resources/cv.resource.ts` (`@Injectable()`, `@Resource({ uri: 'resumind://{cvId}/cv', name: 'CVs', description: '...', mimeType: 'application/json' })`) — handler `handle({ cvId })` returns `{ text: JSON.stringify(cv), mimeType: 'application/json' }` where `cv = this.cvService.findOne(getMcpAuthUser(), cvId)`
- [ ] 9.2 Create `apps/api/src/mcp/resources/application.resource.ts` (`@Resource({ uri: 'resumind://{applicationId}/application', name: 'Applications', ... })`) — handler returns the JSON-stringified `ApplicationService.findOne(...)` record
- [ ] 9.3 Create `apps/api/src/mcp/resources/media.resource.ts` (`@Resource({ uri: 'resumind://{mediaId}/media', name: 'Media', ... })`) — handler returns the JSON-stringified `MediaService.getMediaMeta(...)` record
- [ ] 9.4 Add colocated `*.spec.ts` for each of the 3 resources; mock the underlying service and assert: (a) the handler returns `{ text, mimeType }`; (b) the URI variable is forwarded to the service call; (c) the `MCPResourceEntry` shape (uri, name, description) matches the prior `McpResourceHandler` interface contract

## 10. Deletions

- [ ] 10.1 Delete `apps/api/src/mcp/mcp.controller.ts`
- [ ] 10.2 Delete `apps/api/src/mcp/mcp-tools.service.ts`
- [ ] 10.3 Delete `apps/api/src/mcp/mcp-resource-handler.ts`
- [ ] 10.4 Delete `apps/api/src/mcp/resources/cv-resource.handler.ts`
- [ ] 10.5 Delete `apps/api/src/mcp/resources/application-resource.handler.ts`
- [ ] 10.6 Delete `apps/api/src/mcp/resources/media-resource.handler.ts`
- [ ] 10.7 Delete the per-handler `*.spec.ts` files: `mcp.controller.spec.ts`, `mcp-tools.service.spec.ts`, `cv-resource.handler.spec.ts` (if it exists), `application-resource.handler.spec.ts` (if it exists), `media-resource.handler.spec.ts` (if it exists)
- [ ] 10.8 Verify no other source file imports the deleted modules (run `rg "mcp-tools.service|mcp.controller|mcp-resource-handler|cv-resource.handler|application-resource.handler|media-resource.handler" apps/api/src` and resolve any remaining references)

## 11. Settings service wiring

- [ ] 11.1 Update `apps/api/src/mcp/mcp-settings.service.ts` (or wherever the tool-catalog introspection lives) to read from the wrapper's `McpRegistryService` (or equivalent) instead of `McpToolsService.listRegisteredToolNames()`. If the wrapper exposes a `getToolDefinitions()` API, use it; otherwise, read from a module-level snapshot of the catalog built at boot
- [ ] 11.2 Verify the `McpSettingsController` GET endpoint returns the 20 names in `MCP_TOOL_NAMES` after the swap (add a unit test that boots `McpModule` and asserts the snapshot)

## 12. Module-level test

- [ ] 12.1 Create `apps/api/src/mcp/mcp.module.spec.ts` that boots the module with `Test.createTestingModule({ imports: [McpModule.forRoot({...})] })` and asserts: (a) all 20 tool providers are registered; (b) all 3 resource providers are registered; (c) the tool catalog includes every name in `MCP_TOOL_NAMES`; (d) `McpApiKeyGuard` is applied to the `/mcp` and `/mcp/` routes
- [ ] 12.2 Create `apps/api/src/mcp/mcp-server.module.spec.ts` (or extend 12.1) that boots the module with `MCP_SERVER_ENABLED=false` and asserts: (a) `McpModule.forRoot(...)` is NOT imported; (b) `POST /mcp` returns 404 (use `supertest` against the test app)

## 13. Documentation

- [ ] 13.1 Update `apps/api/README.md` MCP section to: (a) drop the manual "Streamable HTTP transport" paragraph; (b) add a one-liner that the server is implemented with [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest); (c) update the `MCP_SERVER_ENABLED` note to mention 404 (not 503) when the gate is disabled
- [ ] 13.2 Update the `.env.example` comment for `MCP_SERVER_ENABLED` to read "Disable the MCP server entirely. When false, /mcp returns 404 (server is not registered)."
- [ ] 13.3 Update `openspec/changes/mcp-export-s3-storage/specs/mcp-server/spec.md` with an "Implementation note" line appended to each requirement indicating the implementation is provided by `@rekog/mcp-nest` decorators — this is the audit trail; no requirement text changes

## 14. Verification

- [ ] 14.1 Run `pnpm --filter @resumind/api typecheck` and resolve all type errors (Zod 3 vs 4 surface mismatches, wrapper type imports, the new tool / resource providers)
- [ ] 14.2 Run `pnpm --filter @resumind/api test -- --run` and resolve all unit test failures (the new per-tool / per-resource / module specs, the auth-context bridge spec, the `mcp-settings.service.spec.ts` catalog test, the `tool-definitions.spec.ts` coverage)
- [ ] 14.3 Run `pnpm verify` (format:check → biome → typecheck → test → build) and confirm green
- [ ] 14.4 Manual smoke: `pnpm dev` and `curl -i -X POST http://localhost:3001/mcp -H "Authorization: Bearer <mcp_key>" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'` — confirm 200 with `mcp-session-id` header
- [ ] 14.5 Manual smoke: with the `mcp-session-id` from 14.4, call `tools/list` and assert the 20 tool names + 3 resource URIs are present

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — the entire MCP block from `2026-06-02-add-mcp-server`: initialize + `list_cvs`, `export_cv_jsonresume` `$schema`, `list_cv_designs`, `export_cv_html` doctype, `export_cv_screenshot` PNG, `export_cv_pdf` PDF, `replace_cv_from_jsonresume`, key limits, tool catalog exclusions, revoked-key 401, JWT 401 on `/mcp`. The stateful session mode keeps `mcp-session-id` round-tripping exactly as today
- `local-supabase.e2e-spec.ts` — all existing auth, CV CRUD, sections, media upload/stream, template presentation, AI agent catalog, import LLM config, import URL validation, job application scenarios (none of these touch the MCP transport)

### Update required

- `local-supabase.e2e-spec.ts` — if any scenario currently asserts 503 on `/mcp` when `MCP_SERVER_ENABLED=false`, change the assertion to 404 (matches the new boot-time gate behavior). Search the e2e spec for `MCP_SERVER_ENABLED` / `Service unavailable` / `503` references and update the affected `expect(status).toBe(503)` to `toBe(404)` in the same commit

### Add

- `local-supabase.e2e-spec.ts` — new `describe('E2E — MCP wrapper integration (local Supabase)')` block:
  - `tools/list` returns exactly the 20 names in `MCP_TOOL_NAMES` (in addition to the existing per-tool invocation scenarios)
  - `resources/list` returns exactly the 3 URIs in the `resumind://` scheme (`resumind://{cvId}/cv`, `resumind://{applicationId}/application`, `resumind://{mediaId}/media`)
  - `resources/read` on `resumind://{cvId}/cv` for a seeded CV returns JSON whose body is the CV record (same as the prior `CvResourceHandler.read(...)` contract)
  - With `MCP_SERVER_ENABLED=false` set in the API process env (a separate test app instance), `POST /mcp` returns 404
