## Why

Users increasingly manage CVs and job applications through external agentic tools (Cursor, Claude Desktop, custom agents). Today they must use the web UI or reverse-engineer REST calls with short-lived Supabase session tokens, which is awkward for automation and unsuitable for long-running agent sessions. A first-class MCP server with per-account API keys lets users opt in, connect their preferred MCP client, and read or update their CVs and applications programmatically while keeping access scoped and revocable.

## What Changes

- Add account-level MCP access: users enable MCP in settings, create one or more API keys (shown once at creation), and revoke keys at any time.
- Add an MCP server surface (Streamable HTTP transport) on the Nest API that authenticates via `Authorization: Bearer <mcp_api_key>` and exposes tools for CV and job-application operations aligned with existing REST semantics.
- Store MCP API keys hashed at rest (never plaintext); associate each key with `user_id` and optional label; enforce RLS-equivalent scoping via service-role or user-scoped data access on the server.
- Add dashboard settings UI (enable/disable MCP, list keys, create key with copy-once display, revoke key) and link from the user menu.
- Document MCP client configuration (example `mcp.json` snippet, base URL, required headers) in API README.
- MCP tools SHALL cover at minimum: list/get/delete primary CVs; **create** and **replace** CVs from a full JSON Resume document (replace uses staging + transactional delete/promote, not per-section patch); list/get applications; update application fields where REST already allows; SHALL NOT bypass validation or expose other users' data.
- MCP endpoint SHALL be available at **`/mcp` and `/mcp/`**; users MAY hold at most **two** active API keys.
- PDF/PNG MCP exports SHALL enforce a **10 MiB** decoded size cap (**413** when exceeded). Screenshots default to **`first_page`** when `mode` is omitted.
- Each MCP tool SHALL ship with rich, agent-oriented descriptions (purpose, when to use, argument semantics, response shape, JSON Resume / presentation config references) so external agents can tailor CVs without guessing API contracts.
- MCP tools SHALL expose preview/export capabilities aligned with the web preview: list designs (templates), get/update template presentation (section visibility, section order, field toggles per design), export CV as HTML (same as the web preview), export screenshot images (full document height or first page only), export canonical JSON Resume, and export PDF for a chosen design.
- MCP SHALL **not** expose AI agent account configuration, web-scrape/search tools, or import/prepare flows—those remain in the web UI or the user's own agentic toolchain (LLM keys, browser search, etc.).

## Capabilities

### New Capabilities

- `mcp-api-keys`: Account opt-in, API key lifecycle (create, list metadata, revoke), hashing, and authentication guard for MCP requests.
- `mcp-server`: MCP protocol endpoint, richly documented tool catalog, and mapping to existing CV/application/export/presentation services with the same business rules as REST.

### Modified Capabilities

- `authentication`: Add API-key authentication path for MCP (distinct from Supabase JWT) while keeping existing Bearer JWT behavior for REST.
- `web-application`: Settings page and navigation for MCP enablement and key management.

## Impact

- **apps/api**: New `mcp` module (controller, guard, tools registry, `tool-definitions.ts`), key repository/service; reuse `CvService`, `CvExportService`, `CvTemplatePresentationService`, `ApplicationService`; dependency on `@modelcontextprotocol/sdk`.
- **apps/web**: New settings route and forms; API client helpers for key CRUD.
- **supabase/migrations**: New `mcp_api_key` (or equivalent) table with RLS; optional `user_profile.mcp_enabled` flag if needed.
- **packages/types**: Types for MCP key metadata and tool payloads where shared.
- **Docs**: `apps/api/README.md` MCP section; optional `.samples/` example config.
- **Testing**: Unit tests for guard, key hashing, tool handlers; E2E scenarios for key auth and a representative tool call.
- **Security**: Rate limiting consideration for MCP endpoint; keys never logged; revoke on compromise.
