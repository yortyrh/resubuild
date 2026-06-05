## MODIFIED Requirements

### Requirement: The MCP server SHALL be implemented with the `@rekog/mcp-nest` NestJS module

The MCP server in `apps/api` SHALL be implemented using the [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest) NestJS module in place of direct usage of `@modelcontextprotocol/sdk`. `McpModule.forRoot(...)` SHALL be configured with `name = 'resumind'`, `version = '1.0.0'`, `transport = [McpTransportType.STREAMABLE_HTTP]`, `streamableHttp.statelessMode = false`, `streamableHttp.sessionIdGenerator = () => randomUUID()`, and `capabilities = { tools: { listChanged: false }, resources: { listChanged: false } }`. Each MCP tool SHALL be implemented as a single `@Tool({ name, description, parameters, annotations })`-decorated method on an `@Injectable()` provider, discovered automatically through NestJS dependency injection. Each MCP resource SHALL be implemented as a single `@Resource({ uri, name, description, mimeType })`-decorated method on an `@Injectable()` provider. The `McpApiKeyGuard`, `McpKeyRepository`, `McpSettingsService`, `McpSettingsController`, `McpExportService`, `ExportStorageService`, `CvService`, `CvExportService`, `CvTemplatePresentationService`, `ApplicationService`, `CvJsonResumeSwapService`, and `MediaService` SHALL remain unchanged.

The public MCP contract — tool names, Zod input schemas, `structuredContent` response envelopes, `annotations` (`readOnlyHint` / `destructiveHint`), resource URIs, the `MCP_SERVER_ENABLED` env gate, and the `McpApiKeyGuard` Bearer-key authentication — SHALL be unchanged from the prior implementation.

In addition, the `@rekog/mcp-nest` MCP server at `/mcp` SHALL remain a valid agent debug surface: agents and developers may call its tools and read its resources to inspect API behavior even when the Node inspector and `@nestjs/devtools-integration` are not running. The MCP server is the only agent-readable surface that is available in production (gated by `MCP_SERVER_ENABLED`); the Node inspector and Devtools are dev-only by design (see `openspec/specs/api-dev-debug-surface/spec.md`).

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

#### Scenario: MCP server is the prod-safe agent debug surface

- **WHEN** an agent operates against the API in a production-like environment where the Node inspector and Nest Devtools are disabled
- **AND** `MCP_SERVER_ENABLED` is not `"false"` or `"0"`
- **THEN** the agent can call MCP tools and read MCP resources at `/mcp` to inspect and operate on the API
- **AND** no other agent-readable debug surface is exposed in that environment
