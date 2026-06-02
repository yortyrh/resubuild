## 1. Database and types

- [ ] 1.1 Add migration `supabase/migrations/*_mcp_api_key.sql` for `mcp_api_key` table, `mcp_enabled` on user settings, and extend `cv.kind` check with `import_staging`
- [ ] 1.2 Add shared types in `packages/types` for MCP key metadata and settings responses

## 2. API key management (REST)

- [ ] 2.1 Implement `McpKeyRepository` in `apps/api/src/mcp/` with hash/verify helpers (colocated `mcp-key-crypto.util.ts`)
- [ ] 2.2 Implement `McpSettingsService` and `McpSettingsController` at `GET/PATCH /settings/mcp`, `POST/DELETE /settings/mcp/keys` behind `SupabaseAuthGuard` (enforce max **2** active keys, 409 when exceeded)
- [ ] 2.3 Add unit tests beside repository, service, and controller (`*.spec.ts`)

## 3. MCP authentication and transport

- [ ] 3.1 Add `@modelcontextprotocol/sdk` to `apps/api/package.json`
- [ ] 3.2 Implement `McpApiKeyGuard` resolving user id, checking `mcp_enabled`, updating `last_used_at`
- [ ] 3.3 Implement `McpModule` with Streamable HTTP handler at `/mcp` **and** `/mcp/`, plus `MCP_SERVER_ENABLED` env gate
- [ ] 3.4 Wire `McpModule` into `AppModule`; document env vars in `apps/api/README.md`

## 4. MCP tools and documentation

- [ ] 4.1 Create `apps/api/src/mcp/tool-definitions.ts` with rich `description` / `inputSchema` text for every tool (exclusions, JSON Resume vs editor shape, section keys, template ids)
- [ ] 4.2 Implement `CvJsonResumeSwapService` (staging insert + transactional delete/promote) and `create_cv_from_jsonresume` / `replace_cv_from_jsonresume` tools
- [ ] 4.2b Register CV read tools (`list_cvs`, `get_cv`, `delete_cv`) delegating to `CvService` (no `update_cv` in MCP v1)
- [ ] 4.3 Add `CvExportService.renderScreenshot` (`full_document` / `first_page`, default `first_page`) and 10 MiB cap on base64 exports sharing Puppeteer helper with `renderPdfFromHtml`
- [ ] 4.4 Register export tools: `export_cv_jsonresume`, `export_cv_html`, `export_cv_screenshot`, `export_cv_pdf` (base64 wrappers where binary)
- [ ] 4.5 Register design/preview tools: `list_cv_designs`, `get_cv_template_presentation`, `update_cv_template_presentation` (delegate to `CvExportService` / `CvTemplatePresentationService`)
- [ ] 4.6 Register application tools (`list_applications`, `get_application`, `update_application`, `update_application_letter`) delegating to `ApplicationService`
- [ ] 4.7 Unit tests: validation, cross-user denial, screenshot modes, tool catalog excludes agent/search/import tools, descriptions non-empty

## 5. Web settings UI

- [ ] 5.1 Add API helpers in `apps/web/src/lib/api.ts` for MCP settings and key CRUD
- [ ] 5.2 Create `apps/web/src/app/dashboard/settings/mcp/page.tsx` and `mcp-settings.tsx` component (enable toggle, key list, create/revoke, copy-once secret, client config snippet)
- [ ] 5.3 Add user menu link in `apps/web/src/components/dashboard/user-menu.tsx` and colocated tests

## 6. Documentation and verification

- [ ] 6.1 Add MCP client configuration section to `apps/api/README.md` with example Cursor/Claude config
- [ ] 6.2 Run `pnpm test` in `apps/api` and `apps/web` with `-- --run` for new unit tests
- [ ] 6.3 Manual smoke: create key in UI, call `list_cvs` from an MCP client against local API

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth (`POST /auth/login`, `GET /auth/me`), CV REST CRUD and sections, media upload/stream, CV export, template presentation, AI agent catalog, import LLM config, import URL validation

### Update required

- None

### Add

- `local-supabase.e2e-spec.ts` — new `describe('E2E — MCP (local Supabase)')` block:
  - Enable MCP for fixture user, create key via `POST /settings/mcp/keys` with JWT
  - Call MCP `list_cvs` tool (or minimal initialize + tools/call) with API key and assert seeded CV ids present
  - `export_cv_jsonresume` returns `$schema` for seeded CV
  - `list_cv_designs` returns canonical template ids
  - `export_cv_html` returns `<!DOCTYPE html>` for seeded CV
  - `export_cv_screenshot` with `first_page` returns PNG base64; `full_document` on a multi-section fixture includes content beyond first viewport (or skip if no long fixture)
  - `export_cv_pdf` returns base64 PDF for seeded CV + `classic` template
  - `replace_cv_from_jsonresume` swaps content; old id absent from `list_cvs` after success
  - Third MCP key creation returns 409
  - Tool catalog does not include `update_cv`, agent-config, or search tool names
  - Revoked key returns 401 on MCP endpoint
  - `GET /cv` with MCP key (not JWT) returns 401
