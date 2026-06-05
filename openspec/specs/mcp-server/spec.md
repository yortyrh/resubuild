# MCP Server

## Purpose

Define the Model Context Protocol (MCP) server exposed by `apps/api`, including
its transport, authentication, tool and resource surface, the `MCP_SERVER_ENABLED`
env gate, and the tool-catalog introspection backing the settings UI.

## Requirements

> **Implementation note:** all `Requirement` blocks in this spec are implemented
> using the [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest)
> NestJS module. Tools are declared as `@Tool({...})`-decorated methods on
> `@Injectable()` providers under `apps/api/src/mcp/tools/`; resources as
> `@ResourceTemplate({...})`-decorated methods under
> `apps/api/src/mcp/resources/`. The prior hand-rolled `McpController`,
> `McpToolsService`, and per-resource handlers are deleted.

### Requirement: The MCP server SHALL be implemented with the `@rekog/mcp-nest` NestJS module

The MCP server in `apps/api` SHALL be implemented using the [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest) NestJS module in place of direct usage of `@modelcontextprotocol/sdk`. `McpModule.forRoot(...)` SHALL be configured with `name = 'resumind'`, `version = '1.0.0'`, `transport = [McpTransportType.STREAMABLE_HTTP]`, `streamableHttp.statelessMode = false`, `streamableHttp.sessionIdGenerator = () => randomUUID()`, and `capabilities = { tools: { listChanged: false }, resources: { listChanged: false } }`. Each MCP tool SHALL be implemented as a single `@Tool({ name, description, parameters, annotations })`-decorated method on an `@Injectable()` provider, discovered automatically through NestJS dependency injection. Each MCP resource SHALL be implemented as a single `@Resource({ uri, name, description, mimeType })`-decorated method on an `@Injectable()` provider. The `McpApiKeyGuard`, `McpKeyRepository`, `McpSettingsService`, `McpSettingsController`, `McpExportService`, `ExportStorageService`, `CvService`, `CvExportService`, `CvTemplatePresentationService`, `ApplicationService`, `CvJsonResumeSwapService`, and `MediaService` SHALL remain unchanged.

The public MCP contract — tool names, Zod input schemas, `structuredContent` response envelopes, `annotations` (`readOnlyHint` / `destructiveHint`), resource URIs, the `MCP_SERVER_ENABLED` env gate, and the `McpApiKeyGuard` Bearer-key authentication — SHALL be unchanged from the prior implementation.

#### Scenario: Wrapper is the transport

- **WHEN** the API starts and `MCP_SERVER_ENABLED` is not `"false"` or `"0"`
- **THEN** `McpModule.forRoot(...)` is registered in the module graph
- **AND** the wrapper's built-in controller is mounted at `/mcp` and `/mcp/`
- **AND** no `apps/api/src/mcp/mcp.controller.ts` file exists in the codebase

#### Scenario: Each tool is a one-method provider

- **WHEN** an MCP client calls any of the 20 tools in `MCP_TOOL_NAMES`
- **THEN** the call is dispatched to a method on an `@Injectable()` provider decorated with `@Tool`
- **AND** the provider file lives under `apps/api/src/mcp/tools/`
- **AND** the provider name matches the kebab-case tool name (e.g. `list-cvs.tool.ts` for `list_cvs`)

#### Scenario: Each resource is a one-method provider

- **WHEN** an MCP client calls `resources/list` or `resources/read` for any of the three resources
- **THEN** the call is dispatched to a method on an `@Injectable()` provider decorated with `@Resource`
- **AND** the URI template on the decorator matches the prior `uriTemplate` value (`resumind://{cvId}/cv`, `resumind://{applicationId}/application`, `resumind://{mediaId}/media`)
- **AND** URI variables are passed to the method as named parameters

#### Scenario: Stateful session continuity is preserved

- **WHEN** an MCP client sends an `initialize` request and then a `tools/call` request with the same `mcp-session-id` header
- **THEN** the second request is routed to the same underlying `McpServer` instance the wrapper created for the session
- **AND** the E2E suite's existing scenarios (which use `mcp-session-id` round-tripping) continue to pass without modification

#### Scenario: Public MCP contract is unchanged

- **WHEN** an MCP client invokes any tool or resource after the migration
- **THEN** the response shape matches the prior implementation (tool names, Zod input schemas, `structuredContent` envelopes, `annotations`, resource URIs, and signed-URL response shapes for the four `export_cv_*` tools and `fetch_export_url`)
- **AND** no MCP client configuration change is required (the client config snippet in `apps/api/README.md` — Bearer key on the API host — remains valid)

### Requirement: The MCP server SHALL preserve user-scoped auth context for `@Tool` and `@Resource` handlers

Tool and resource handlers SHALL be able to call `getMcpAuthUser()` (the existing `mcpAuthStorage`-backed helper) without taking the `AuthUser` as a method parameter, matching the prior implementation's call-site contract. A small bridge component (a Nest interceptor or middleware bound to the `/mcp` and `/mcp/` routes) SHALL wrap each incoming MCP request in `mcpAuthStorage.run(req.user, () => next.handle())`, where `req.user` is the `AuthUser` populated by `McpApiKeyGuard`. The bridge replaces the prior `McpController` body's `mcpAuthStorage.run(req.user, ...)` wrap. `mcpAuthStorage`, `getMcpAuthUser()`, and their existing unit tests SHALL remain unchanged.

#### Scenario: Tool handler reads the authenticated user

- **WHEN** an MCP request is authenticated by `McpApiKeyGuard` and reaches a `@Tool` handler
- **THEN** the bridge interceptor wraps the request in `mcpAuthStorage.run(req.user, ...)` before the handler runs
- **AND** `getMcpAuthUser()` inside the handler returns the same `AuthUser` that `McpApiKeyGuard` set on `req.user`
- **AND** `CvService` / `ApplicationService` / `MediaService` calls inside the handler continue to scope data by the authenticated `user.id` (RLS unchanged)

#### Scenario: Bridge is scoped to the MCP route

- **WHEN** a non-MCP request reaches the API (e.g. `GET /settings/mcp` behind `SupabaseAuthGuard`)
- **THEN** the bridge interceptor does NOT wrap the request in `mcpAuthStorage.run(...)`
- **AND** `getMcpAuthUser()` is not consulted by non-MCP code paths (the helper is still MCP-only)

### Requirement: The `MCP_SERVER_ENABLED` env gate SHALL be enforced at module boot

When `MCP_SERVER_ENABLED` is `"false"` or `"0"`, the application SHALL NOT register `McpModule.forRoot(...)` and the `/mcp` and `/mcp/` routes SHALL return 404. When `MCP_SERVER_ENABLED` is unset, `"true"`, or `"1"`, the module SHALL register and the routes SHALL accept traffic (subject to `McpApiKeyGuard`).

This is a deliberate behavior change from the prior implementation, which threw 503 on every request when disabled. The change is acceptable because the controller no longer exists; the wrapper's transport layer is registered at boot, and absence of registration surfaces as 404 to clients.

#### Scenario: Disabled server returns 404

- **WHEN** the API starts with `MCP_SERVER_ENABLED=false`
- **THEN** `McpModule.forRoot(...)` is NOT registered
- **AND** `POST /mcp` and `POST /mcp/` return 404
- **AND** the existing E2E scenarios that assert the disabled-server behavior (if any) are updated to assert 404 instead of 503

#### Scenario: Enabled server mounts the wrapper

- **WHEN** the API starts with `MCP_SERVER_ENABLED` unset (default) or set to `"true"` / `"1"`
- **THEN** `McpModule.forRoot(...)` IS registered
- **AND** `POST /mcp` and `POST /mcp/` accept traffic subject to `McpApiKeyGuard`

#### Scenario: REST key management is not gated

- **WHEN** the API starts with `MCP_SERVER_ENABLED=false`
- **THEN** `McpSettingsController` (`GET /settings/mcp`, `POST /settings/mcp/keys`, `DELETE /settings/mcp/keys/:id`) continues to serve traffic behind `SupabaseAuthGuard`
- **AND** users can pre-create keys before re-enabling the MCP server

### Requirement: The MCP server SHALL expose a `McpRegistryService`-backed tool catalog introspection

`McpSettingsService` (or its consumer, `McpSettingsController`) SHALL list the registered tool names by reading from the `@rekog/mcp-nest` `McpRegistryService` (or the wrapper's equivalent introspection API) rather than from a hand-maintained list. The returned names SHALL match `MCP_TOOL_NAMES` exactly. This replaces the prior `McpToolsService.listRegisteredToolNames()` call.

#### Scenario: Settings endpoint reflects the wrapper's catalog

- **WHEN** a user calls `GET /settings/mcp` (or whatever endpoint the `McpSettingsService` exposes for the catalog)
- **THEN** the response includes exactly the 20 names in `MCP_TOOL_NAMES`
- **AND** the names are sourced from the wrapper's tool discovery at boot, not from a static list

#### Scenario: New tool appears in the catalog after registration

- **WHEN** a developer adds a new `@Tool` provider to `McpModule.providers`
- **THEN** the wrapper auto-discovers it on next boot
- **AND** the settings endpoint includes the new tool's name in the response
- **AND** no manual catalog update is required

### Requirement: The MCP server SHALL enforce "one active key per user" at the schema level

The table `public.mcp_api_key` SHALL enforce "at most one row per user" via
its primary key on `user_id` (a primary key is implicitly UNIQUE and NOT
NULL). The previous surrogate `id` UUID column and the previous `UNIQUE`
constraint on `user_id` are removed by the
`supabase/migrations/20260604190000_mcp_api_key_pk_user_id.sql` migration.
The MCP server's key-rotation flow SHALL issue a single atomic
`INSERT ... ON CONFLICT (user_id) DO UPDATE` (Supabase `upsert` with
`onConflict: 'user_id'`) and SHALL NOT perform a separate `DELETE` before
the insert. The `McpApiKeyRow` shape returned by the repository SHALL NOT
include a surrogate `id` field; the row's identifier is its `user_id`.

#### Scenario: A user rotates their MCP API key

- **WHEN** an authenticated user calls `POST /settings/mcp/keys` while a key already exists for their `user_id`
- **THEN** the repository SHALL call `supabase.from('mcp_api_key').upsert({ user_id, key_prefix, key_hash, encrypted_secret }, { onConflict: 'user_id' })` exactly once
- **AND** SHALL NOT call `delete` or `insert` on `mcp_api_key` before the upsert
- **AND** the returned row SHALL have `user_id` equal to the authenticated user's id and SHALL NOT have a surrogate `id` field
- **AND** the previous key's `key_hash` is replaced atomically (no row with the old `key_hash` survives the upsert)

#### Scenario: A user creates their first MCP API key

- **WHEN** an authenticated user calls `POST /settings/mcp/keys` while no key exists for their `user_id`
- **THEN** the repository SHALL call `upsert(...)` and the result SHALL be a single row keyed on `user_id`

#### Scenario: Concurrent rotate from a stale tab does not collide

- **WHEN** two tabs call `POST /settings/mcp/keys` for the same user within the same instant
- **THEN** both calls succeed; the final row reflects the second caller's values; no `BadRequestException` is surfaced for a unique-violation

### Requirement: The MCP server SHALL look up active keys and refresh `last_used_at` by `user_id`

`McpKeyRepository.findActiveKeyBySecret` SHALL return a row shaped as
`McpApiKeyRow` keyed by `user_id` (no surrogate `id`). `McpKeyRepository.touchLastUsedAt`
SHALL take a `userId: string` argument and SHALL update `mcp_api_key` rows
where `user_id = userId`. `McpApiKeyGuard` SHALL call
`touchLastUsedAt(row.user_id)` (not `touchLastUsedAt(row.id)`) after a
successful authentication.

#### Scenario: Guard refreshes `last_used_at` for the authenticated user

- **WHEN** `McpApiKeyGuard` authenticates a request and `findActiveKeyBySecret` returns a row
- **THEN** `touchLastUsedAt(row.user_id)` is called
- **AND** the `mcp_api_key` row for that user has its `last_used_at` column updated to the current timestamp
- **AND** the surrogate `id` field is not consulted (the table no longer has one)

### Requirement: The MCP server SHALL expose `get_jsonresume_schema` as a read-only MCP tool

The MCP server SHALL register a tool named `get_jsonresume_schema` implemented
as a `@Tool({...})`-decorated method on an `@Injectable()` provider under
`apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.ts`. The tool SHALL
return an envelope `{ $id, version, schema }` where `schema` is the bundled
`packages/schemas/resume.schema.json` JSON document, `$id` is the schema's
`$id` (defaulting to `https://jsonresume.org/schema/` when absent), and
`version` is the schema's `meta.version` when present and `undefined`
otherwise. The tool SHALL be marked `readOnlyHint: true` and SHALL NOT make
any database, network, or auth-context call. The tool name SHALL appear in
`MCP_TOOL_NAMES` and the description SHALL appear in
`MCP_TOOL_DEFINITIONS.get_jsonresume_schema`.

#### Scenario: An MCP agent discovers the JSON Resume shape before composing a document

- **WHEN** an MCP client calls `tools/call` with `name: "get_jsonresume_schema"`
- **THEN** the response `structuredContent` is an object with keys `$id`, `version`, and `schema`
- **AND** `schema` is the bundled JSON Resume document (not a network-fetched copy)
- **AND** `schema.properties` includes the standard JSON Resume section keys (`basics`, `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, `projects`, `meta`)
- **AND** `schema.definitions.iso8601` is present (referenced by date fields)

#### Scenario: The tool is read-only

- **WHEN** the MCP server is queried for the tool's annotations
- **THEN** `readOnlyHint` is `true`
- **AND** the tool makes no mutation to user state, the database, or storage

### Requirement: The MCP server SHALL upload exported artifacts with a bare MIME type while preserving the descriptive value on the row and the envelope

`ExportStorageService.uploadAndRegister` SHALL strip any `;`-delimited
parameters from the value passed to `supabase.storage.from(bucket).upload(...)`
(e.g. `application/json; charset=utf-8` becomes `application/json`) so the
`mcp-exports` bucket's `allowed_mime_types` allowlist in
`supabase/config.toml` accepts the call. The descriptive Content-Type value
supplied by the caller (with parameters) SHALL be preserved on the
`mcp_export` row and on the MCP signed-URL response envelope so downstream
consumers still get the charset hint.

#### Scenario: JSON export with a charset hint uploads successfully

- **WHEN** an MCP export tool calls `uploadAndRegister` with `contentType: "application/json; charset=utf-8"`
- **THEN** `supabase.storage.from("mcp-exports").upload(...)` is called with `contentType: "application/json"`
- **AND** the `mcp_export` row's `content_type` column is `"application/json; charset=utf-8"`
- **AND** the signed-URL response envelope's `contentType` field is `"application/json; charset=utf-8"`

#### Scenario: HTML export with a charset hint uploads successfully

- **WHEN** an MCP export tool calls `uploadAndRegister` with `contentType: "text/html; charset=utf-8"`
- **THEN** `supabase.storage.from("mcp-exports").upload(...)` is called with `contentType: "text/html"`
- **AND** the descriptive value is preserved on the row and the envelope

#### Scenario: Parameter-less content type is unchanged

- **WHEN** an MCP export tool calls `uploadAndRegister` with `contentType: "application/pdf"`
- **THEN** the value passed to `storage.upload(...)` is `"application/pdf"` (unchanged)
- **AND** the row's `content_type` column is `"application/pdf"`

### Requirement: The MCP server SHALL distinguish "Create API key" from "Rotate API key" in the settings UI

The web settings page at `/dashboard/settings/mcp` SHALL always expose a
button that triggers the key-creation flow. When the user has no key, the
button SHALL be labeled "Create API key" and SHALL use the default button
variant. When the user has a key, the button SHALL be labeled "Rotate key"
and SHALL use the outline button variant. The confirmation dialog SHALL
vary its title and description based on whether a key already exists, and
its primary action SHALL be destructive (`variant="destructive"`) when a
key exists and the default variant when it does not. The toast message and
the inline error message SHALL also vary based on the same condition.

#### Scenario: First-time user creates a key

- **WHEN** the user opens `/dashboard/settings/mcp` and no key exists
- **THEN** the button SHALL be labeled "Create API key"
- **AND** the dialog title SHALL be "Create API key?"
- **AND** the dialog description SHALL explain that a new key will be generated and that it will not be shown again
- **AND** the dialog's confirm button SHALL use the default (non-destructive) variant and be labeled "Create key"
- **AND** on success, the toast SHALL say "API key created. Copy the key — it will not be shown again."

#### Scenario: Existing user rotates a key

- **WHEN** the user opens `/dashboard/settings/mcp` and a key already exists
- **THEN** the button SHALL be labeled "Rotate key"
- **AND** the dialog title SHALL be "Rotate API key?"
- **AND** the dialog description SHALL explain that the current key will be immediately invalidated
- **AND** the dialog's confirm button SHALL use the destructive variant and be labeled "Rotate"
- **AND** on success, the toast SHALL say "Key rotated. Copy the new key — it will not be shown again."
