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
