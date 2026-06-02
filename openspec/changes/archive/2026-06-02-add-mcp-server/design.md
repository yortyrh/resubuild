## Context

Resumind exposes CV and job-application management through a Nest REST API authenticated with short-lived Supabase JWTs (`SupabaseAuthGuard`). External agentic tools speak the Model Context Protocol (MCP) and expect long-lived credentials, tool discovery, and Streamable HTTP (or stdio) transport—not browser session flows.

The codebase already encrypts user-provided third-party keys (`ai_agent_account`) and scopes data per user via RLS when using the caller's Supabase access token. MCP access needs a parallel auth path: opaque API keys bound to `user_id`, validated server-side, with data operations executed via service-role Supabase client filtered by that user id (same pattern as background jobs that cannot hold a user JWT).

## Goals / Non-Goals

**Goals:**

- Let users opt in to MCP from dashboard settings and manage API keys (create, list metadata, revoke).
- Expose an MCP server on the existing API host (`POST /mcp` or `/mcp` per SDK conventions) using Streamable HTTP.
- Provide MCP tools that mirror core REST capabilities for primary CVs and job applications (list, read, create, update, delete where REST allows).
- Expose preview/export parity: template catalog, presentation config (section visibility/order/fields), HTML preview, PNG screenshots (full document or first page), JSON Resume export, and PDF export per design.
- Document every tool so external agents can tailor CVs without reading Resumind source code.
- Store only hashed key material; show the raw key once at creation.
- Reuse `CvService`, `ApplicationService`, and validation DTOs so MCP and REST share business rules.

**Non-Goals:**

- stdio MCP transport in v1 (HTTP only; users can wrap with `mcp-remote` if needed).
- MCP tools for PDF import, media upload multipart, or AI agent BYOK configuration (remain REST/UI).
- MCP tools for web scrape, job-board search, URL discovery, or any “search” capability—the user's agent (Cursor, Claude, etc.) already has its own web/search/browser MCP stack.
- MCP tools for `prepare_application`, import jobs, or flows that require Resumind's internal LLM/agent configuration.
- Public anonymous MCP access or cross-user admin tools.
- Replacing Supabase JWT auth for the web app or REST clients.

## Decisions

### 1) Host MCP inside `apps/api` on Streamable HTTP

Add `McpModule` to the Nest app with a dedicated controller mounting the official `@modelcontextprotocol/sdk` Streamable HTTP transport at **`/mcp` and `/mcp/`** (both paths registered for client compatibility).

**Alternatives:**

- Separate `apps/mcp` process: rejected for v1—duplicates auth, config, and deployment.
- stdio-only server: rejected—poor fit for hosted SaaS; HTTP matches Cursor/Claude remote server config.

### 2) API keys: opaque bearer tokens with one-way hash

On create, generate `rm_<random>` (prefix aids identification), store `key_hash` (bcrypt or HMAC-SHA256 with server pepper), `key_prefix` (first 8 chars for UI), `user_id`, optional `label`, `created_at`, `last_used_at`, `revoked_at`.

**Alternatives:**

- Reversible encryption like `ai_agent_account`: rejected—MCP keys are issued by us, never need decryption.
- More than two active keys per user: rejected—limit is **two** active (non-revoked) keys for rotation without sprawl.

### 3) `McpApiKeyGuard` distinct from `SupabaseAuthGuard`

MCP requests present `Authorization: Bearer <mcp_key>`. Guard looks up hash, rejects revoked keys, sets `request.user = { id: userId, authMethod: 'mcp' }` without `accessToken`. Tool handlers use `SupabaseService.createClientForUser(userId)` or existing service-role repository methods that enforce `user_id` filters.

JWT-shaped tokens that fail MCP lookup MAY fall through to Supabase validation only on non-MCP routes; on `/mcp`, invalid MCP key returns 401 without attempting Supabase (avoid leaking validation timing).

**Alternatives:**

- Mint short-lived Supabase JWT from API key: rejected—adds complexity and blurs RLS vs service-role boundaries.

### 4) Tool catalog (v1)

**CV data (editor / persistence)**

| Tool                         | Maps to                           | Agent notes (in MCP `description`)                                                                                                                     |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list_cvs`                   | `GET /cv`                         | Primary CVs only; use before picking an id.                                                                                                            |
| `get_cv`                     | `GET /cv/:id`                     | Resumind editor shape (basics + sections); use to read current content before edits.                                                                   |
| `create_cv_from_jsonresume`  | `POST /cv` + import normalization | Accepts a full JSON Resume document; runs `prepareImportedResume` + schema validation + create (new primary CV).                                       |
| `replace_cv_from_jsonresume` | New swap service                  | Replaces an existing primary CV with a new JSON Resume—see §4d (no per-section merge).                                                                 |
| `delete_cv`                  | `DELETE /cv/:id`                  | Irreversible; document in description.                                                                                                                 |
| `export_cv_jsonresume`       | `GET /cv/:id/export/json`         | Canonical [JSON Resume](https://jsonresume.org/schema/) document (`$schema`, stripped internal ids); preferred for LLM reasoning and external tooling. |
| `export_cv_html`             | `GET /cv/:id/export/html`         | Full HTML document identical to web preview (`iframe[srcDoc]`); use before visual review or vision models that accept HTML.                            |
| `export_cv_screenshot`       | New (`CvExportService`)           | PNG of rendered HTML; `mode` optional, **defaults to `first_page`**; or `full_document` (fullPage, 100% content height).                               |
| `export_cv_pdf`              | `GET /cv/:id/export/pdf`          | Renders PDF for `template` id using saved presentation config; returns base64 + filename.                                                              |

**Preview / design (template presentation + catalog)**

| Tool                              | Maps to                                         | Agent notes                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_cv_designs`                 | `GET /cv/export/templates`                      | Lists template ids (`classic`, `modern`, `tabular`, `left`) and metadata for choosing a design.                                                                     |
| `get_cv_template_presentation`    | `GET /cv/:id/template-presentation?template=`   | Returns `sectionOrder`, `hiddenSections`, field visibility, labels—same as web preview panel.                                                                       |
| `update_cv_template_presentation` | `PATCH /cv/:id/template-presentation?template=` | Show/hide sections (`hiddenSections`), reorder sections (`sectionOrder`), toggle field visibility; document allowed `SectionKey` values in tool schema description. |

**Applications**

| Tool                        | Maps to                                        |
| --------------------------- | ---------------------------------------------- |
| `list_applications`         | `GET /applications` (active/list-visible only) |
| `get_application`           | `GET /applications/:id`                        |
| `update_application`        | `PATCH /applications/:id`                      |
| `update_application_letter` | `PATCH` letter endpoint if separate            |

Prepare/cancel/promote, multipart upload, import, and AI agent settings stay out of v1 MCP.

Each tool validates input with Zod or shared DTO classes and returns JSON-serializable results matching REST response shapes. Binary exports use `{ filename, contentBase64, contentType }` (PDF, PNG). `export_cv_html` returns `{ html, templateId, filename? }` (HTML as UTF-8 string in JSON).

### 4c) HTML and screenshot rendering

Reuse the same pipeline as PDF: `loadExportContext` → `renderResumeHtml` with presentation config → Puppeteer.

- **`export_cv_html`**: No Puppeteer; return HTML string from `CvExportService.renderHtml` (already used by `GET /cv/:id/export/html`).
- **`export_cv_screenshot`**: Add `renderScreenshotFromHtml(html, mode)` on `CvExportService`:
  - `full_document`: `page.setContent(html)` then `page.screenshot({ fullPage: true, type: 'png' })` so the image spans the entire résumé (100% document height).
  - `first_page`: set viewport to Letter aspect (match `PDF_EXPORT_OPTIONS`), `setContent`, `screenshot({ fullPage: false })` without clip beyond viewport—captures what fits on one printed page.
  - Share Chromium launch with `renderPdfFromHtml` (extract `withBrowserPage(fn)` helper to avoid duplicate launch logic).

Optional follow-up: expose `GET /cv/:id/export/screenshot?template=&mode=` for REST parity; v1 can be MCP-only if scope is tight.

Screenshot failures SHALL surface the same `503` family as PDF when Chromium is unavailable.

**Binary response size cap:** MCP export tools returning `contentBase64` (PDF, PNG) SHALL reject payloads above a configured maximum decoded size (default **10 MiB**) with **413 Payload Too Large** and a message to use a smaller template or fewer sections—never truncate silently.

### 4d) JSON Resume create and replace (no item-level MCP edits)

MCP v1 SHALL **not** expose item-level section CRUD or `update_cv` patch-by-section. Agents tailor content by passing a **complete JSON Resume** document.

**`create_cv_from_jsonresume`:** Validate → `prepareImportedResume` → same persist path as `POST /cv` → returns new primary CV summary + id.

**`replace_cv_from_jsonresume`:** Atomic swap avoiding in-place section diff:

1. **Import in invisible state** — insert a new CV row with `kind = 'import_staging'` (excluded from `list_cvs` / `GET /cv` library filter, like `application_clone`).
2. **In one database transaction:** delete the target primary CV by id (must be `kind = 'primary'` and owned by user); set the staging row to `kind = 'primary'`.
3. If the transaction fails after staging insert, delete the orphan staging row (or reuse on retry).

This is logically “delete + import” but guarantees the library never shows two primaries or a half-updated CV. Presentation rows for the old CV are removed with the delete; agents may re-apply template presentation on the new id.

Requires migration extending `cv_kind_check` to allow `'import_staging'`.

### 4b) Agent-oriented tool documentation

Register tools via the MCP SDK with:

- **`description`**: Multi-paragraph markdown where helpful—what the tool does, when to call it, relationship to other tools (e.g. “call `export_cv_jsonresume` for LLM-friendly career data; call `get_cv` for editor state before PATCH”).
- **`inputSchema`**: JSON Schema with `description` on every property; for presentation updates, embed allowed section keys (`summary`, `work`, `volunteer`, …) and link to JSON Resume section semantics where relevant.
- **`annotations`**: `readOnlyHint` / `destructiveHint` / `idempotentHint` per MCP conventions where applicable.

Maintain a single source of truth in `apps/api/src/mcp/tool-definitions.ts` (or similar) so descriptions are reviewable in code review and unit-tested for presence of required sections (smoke test: every tool has non-empty description and documented `cvId` where needed).

Optional: ship a static `mcp-tool-guide.md` in repo referenced from settings UI for human readers; MCP clients rely on embedded tool descriptions.

### 5) Account enablement flag

Add `mcp_enabled boolean default false` on a user settings row or `public.user_settings`. REST endpoints `GET/PATCH /settings/mcp` (JWT-guarded) toggle enablement. MCP guard rejects all `/mcp` traffic when disabled, even with valid key (keys remain stored but inactive).

**Alternatives:**

- Implicit enable on first key: acceptable fallback but explicit toggle is clearer for consent.

### 6) Settings UI

New route `/dashboard/settings/mcp` with enable toggle, key table (label, prefix, created, last used), create-key dialog (show secret once), revoke action. Link from user menu alongside AI agent settings.

### 7) Rate limiting and observability

Apply `@nestjs/throttler` to `/mcp` with stricter limits than REST (e.g. 60/min per key). Update `last_used_at` on successful auth (async, non-blocking). Never log full keys.

## Risks / Trade-offs

- [MCP SDK / Nest integration churn] → Pin SDK version; thin adapter layer in `mcp.transport.ts`.
- [Service-role bypass of RLS bugs] → Centralize user scoping in repositories; unit test cross-user denial.
- [Key leakage at creation] → Copy-once UI + docs warning; no key in list responses.
- [Tool surface drift from REST] → Tools call same services; add contract tests comparing MCP tool output to REST for sample fixtures.
- [Large CV payloads in tool results] → Document size limits; optional `fields` filter in v2.

## Migration Plan

1. Migration: `mcp_api_key` table + `user_settings.mcp_enabled` (or dedicated settings table).
2. Ship API key CRUD REST endpoints behind JWT guard.
3. Ship MCP transport + tools behind `McpApiKeyGuard`.
4. Ship web settings UI.
5. Document client config in `apps/api/README.md`.

Rollback: disable `mcp_enabled` globally via env flag `MCP_SERVER_ENABLED=false` without dropping tables.

## Resolved decisions (formerly open questions)

| Topic                      | Decision                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MCP HTTP path              | Register **both** `/mcp` and `/mcp/`                                                                                                                   |
| Active API keys per user   | **Maximum 2** non-revoked keys; `POST /settings/mcp/keys` returns 409 when at limit                                                                    |
| CV content updates via MCP | **No** `update_cv` or item-level tools in v1; use `create_cv_from_jsonresume` or `replace_cv_from_jsonresume` (staging + transactional delete/promote) |
| PDF/PNG base64 size        | **Cap at 10 MiB** decoded; **413** with clear message if exceeded                                                                                      |
| Screenshot default `mode`  | **`first_page`** when omitted                                                                                                                          |
