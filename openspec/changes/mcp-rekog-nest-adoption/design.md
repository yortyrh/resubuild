## Context

The Resumind MCP server is implemented in `apps/api/src/mcp/` against the raw `@modelcontextprotocol/sdk` package. The current shape is:

- `McpController` — a single `@All(['mcp', 'mcp/'])` route guarded by `McpApiKeyGuard`. It runs the `McpApiKeyGuard` manually (although it also uses `@UseGuards`), branches on `isInitializeRequest`, manages a per-session `Map<string, { transport, server }>`, wires `onsessioninitialized` / `onclose` callbacks, wraps each request in `mcpAuthStorage.run(req.user, ...)` to put the `AuthUser` into `AsyncLocalStorage`, and hands the request to `StreamableHTTPServerTransport.handleRequest`.
- `McpToolsService` — a Nest `@Injectable` that owns the `McpServer` lifecycle. It builds a 20-tool catalog via a custom `register(name, schema, handler)` closure that wraps each handler in `{ content: [...], structuredContent: ... }` envelopes. Each `register` call passes through `as any` casts to dodge the SDK's `AnySchema` generic (`z3.ZodTypeAny | z4.$ZodType`). It also iterates over three resource handlers to call `server.registerResource` for each.
- `McpResourceHandler` — a hand-rolled interface (`title`, `description`, `uriTemplate`, `defaultMimeType`, `list(req)`, `read(uri, req)`) implemented by `CvResourceHandler`, `ApplicationResourceHandler`, `MediaResourceHandler`. Each implementation parses the entity id out of the URI manually (`uri.pathname.split('/').filter(Boolean)[0]`).
- `mcp-auth.context.ts` — `mcpAuthStorage` (a module-level `AsyncLocalStorage<AuthUser>`) and `getMcpAuthUser()` which throws if called outside `mcpAuthStorage.run(...)`. The controller wraps every MCP request in `mcpAuthStorage.run(req.user, ...)` so the tool/resource callbacks can call `getMcpAuthUser()` without taking `user` as a parameter.

Every tool and resource handler ends up calling `getMcpAuthUser()` from inside the SDK's callback model, which is why the `AsyncLocalStorage` shim exists. All four pieces (controller, service, resource interface, auth context) are required only because we are using the raw SDK directly.

[`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest) is the official NestJS wrapper around the same SDK. It provides:

- `McpModule.forRoot({ name, version, capabilities, streamableHttp: { ... } })` — bootstraps the transport, mounts the controller, manages sessions (stateful or stateless), and wires tool / resource / prompt discovery through Nest's DI.
- `@Tool({ name, description, parameters, annotations })` — decorator on a method of an `@Injectable()` provider. `parameters` is a Zod schema (or a `ZodRawShape`); the wrapper validates input before calling the handler. Handlers can return a value directly (the wrapper builds the `content` / `structuredContent` envelope) or return a `CallToolResult` shape explicitly.
- `@Resource({ uri, name, description, mimeType })` — decorator on a provider method. The URI template is declared on the decorator, so there is no `ResourceTemplate` / `list` / `read` plumbing to wire manually. The wrapper takes care of variable substitution and dispatch.
- Per-tool authorization — `Authorization` metadata + a guard picks which tools a caller can invoke.
- Built-in `Request` access — handler methods receive the underlying Express/Fastify request as a parameter, so reading the authenticated user is a one-liner.
- `statelessMode: true` for serverless-friendly deployments, `enableJsonResponse` to opt into non-streaming JSON responses on `/mcp`. The default stateful mode generates session ids via a `sessionIdGenerator: () => randomUUID()`.

This change adopts the wrapper. The MCP tool catalog, the resource URIs, the `McpApiKeyGuard` flow, the `MCP_SERVER_ENABLED` gate, and the signed-URL export transport all stay byte-compatible; only the implementation moves.

## Goals / Non-Goals

**Goals:**

- Replace the hand-rolled `McpController` / `McpServer` / `StreamableHTTPServerTransport` plumbing with `McpModule.forRoot(...)` from `@rekog/mcp-nest`.
- Express every MCP tool as a single-method `@Injectable()` provider decorated with `@Tool` (one file per tool name), and every MCP resource as a single-method `@Injectable()` provider decorated with `@Resource`.
- Preserve the public MCP contract: tool names, Zod input schemas, response envelopes (`structuredContent` + `content[]`), `annotations` (`readOnlyHint` / `destructiveHint`), resource URIs, the `MCP_SERVER_ENABLED=false` env gate, the `McpApiKeyGuard` path, and the `McpExportService` signed-URL envelopes.
- Reduce boilerplate: delete `mcp.controller.ts`, `mcp-tools.service.ts`, `mcp-resource-handler.ts`, the `resources/` subdirectory's `*.handler.ts` files, and the per-session `Map` / `onclose` / `onsessioninitialized` callbacks.
- Drop the `mcpAuthStorage.run(req.user, ...)` wrap from the controller by reading the user from the wrapper's `Request` access (or from a small `McpAuthRequestBridge` interceptor that populates the existing `AsyncLocalStorage` for handlers that don't want the request).
- Pass `pnpm --filter @resumind/api typecheck` and `pnpm --filter @resumind/api test -- --run` and the existing `local-supabase.e2e-spec.ts` MCP block (initialize, tool calls, signed-URL export, revoked-key 401, JWT 401 on `/mcp`) without modification.

**Non-Goals:**

- Changing the MCP tool catalog (no new tools, no removed tools, no renames).
- Changing the resource URIs or the `resumind://` scheme.
- Changing the REST API, the web app, the Supabase schema, or the RLS policies.
- Adopting the wrapper's built-in authorization server (`@nestjs/passport` + OAuth) — `McpApiKeyGuard` is the only auth path we expose to MCP clients today and it stays.
- Adopting the wrapper's `McpAuthorizationServer` / TypeORM store — we do not run an OAuth provider for MCP clients.
- Adopting STDIO or SSE transports — Streamable HTTP is the only transport Resumind supports, and the wrapper's `transport` array defaults to `[SSE, STREAMABLE_HTTP, STDIO]`; we limit it to `STREAMABLE_HTTP` only.
- Migrating to `@rekog/mcp-nest`'s prompt API — we do not ship prompts today.
- Replacing the `@modelcontextprotocol/sdk` peer dep — the wrapper pulls it in; we drop the direct dep from `apps/api/package.json` but the SDK is still on the lockfile transitively.
- Performance / latency optimization beyond what the wrapper provides out of the box. We are not adding `McpRegistryService` caching, `@nestjs/cache` integration, or `nestjs-pino` request logging as part of this change.

## Decisions

### 1) Adopt `@rekog/mcp-nest` v1.9.x as the MCP server module

Pin to the latest 1.9.x (currently 1.9.10 as of May 2026). Drop the direct `@modelcontextprotocol/sdk` dep from `apps/api/package.json`; the wrapper declares it as a peer dep. Add `zod@^4` as an explicit dep (the wrapper's peer dep range) — the existing Zod schemas in `tool-definitions.ts` and the resource implementations continue to import from `zod`; the v3 → v4 migration in the v3 schemas is a no-op for `z.object`, `z.string`, `z.uuid`, `z.number().int()`, `z.enum`, `z.record`, and the rest of the surface we use today. (If any direct `z.X` schema in our code is incompatible with v4, we pin to `zod@^3.25.x` in a follow-up; verified out of scope for v1.9.10.)

**Alternatives considered:**

- Stay on the raw SDK and refactor `McpToolsService` into smaller per-tool services. Rejected — it leaves the `McpController` transport plumbing in place and does not reduce the boilerplate (the user's stated goal).
- Use a different community wrapper (`nestjs-mcp`, `nest-mcp-server`, etc.). Rejected — `@rekog/mcp-nest` is the only wrapper with first-party `@Tool` / `@Resource` / `@Prompt` decorators, automatic DI discovery, per-tool authorization, and Streamable HTTP support that matches our existing transport. The community is small but the package has 144 versions, 657 stars, and weekly downloads north of 100K.

### 2) Mount `McpModule.forRoot(...)` statefully on Streamable HTTP, identical to today

```ts
McpModule.forRoot({
  name: 'resumind',
  version: '1.0.0',
  capabilities: {
    tools: { listChanged: false },
    resources: { listChanged: false },
  },
  transport: [McpTransportType.STREAMABLE_HTTP],
  streamableHttp: {
    enableJsonResponse: false,
    sessionIdGenerator: () => randomUUID(),
    statelessMode: false,
  },
});
```

The wrapper mounts its built-in controller at `/mcp` + `/mcp/` (verified against the playground `stateful-server` example). The `capabilities` block must declare `tools` and `resources` to satisfy strict MCP clients (e.g. `mcp-agent`); we set `listChanged: false` because our catalog is static at boot. `statelessMode: false` keeps the `mcp-session-id` round-trip the existing E2E suite depends on.

**Alternatives considered:**

- Stateless mode (`statelessMode: true`, no `sessionIdGenerator`). Rejected — it would force E2E to drop the `mcp-session-id` header round-trip and re-send `initialize` on every call. Stateful mode is a single-line config change and matches today's behavior.
- `enableJsonResponse: true`. Rejected — the existing clients (Cursor, Claude Desktop) use the streaming response, and `enableJsonResponse: true` is documented as for non-streaming clients only. We keep the default streaming behavior.

### 3) Gate `McpModule.forRoot` boot on `MCP_SERVER_ENABLED` without a controller-side `assertEnabled`

The current controller reads `MCP_SERVER_ENABLED` on every request and throws `ServiceUnavailableException` when it is `"false"` or `"0"`. With the wrapper, we have two options:

1. **Skip `McpModule.forRoot(...)` entirely when the env gate is set to "false" / "0".** The `/mcp` route simply does not exist; requests return 404.
2. **Always call `McpModule.forRoot(...)` and rely on the wrapper's `McpApiKeyGuard` (or a global guard) to throw 503 when disabled.**

We pick (1) for parity with the current 404-on-disabled behavior: the controller no longer exists to throw 503, so a disabled server simply has no `/mcp` route. This is a 404 instead of a 503, which is a minor behavior change worth flagging in the spec delta. Tests and E2E MUST be updated to assert 404 on `/mcp` when `MCP_SERVER_ENABLED=false` (currently they assert 503).

**Alternatives considered:**

- Keep a thin wrapper controller that re-implements `assertEnabled` and proxies to the wrapper. Rejected — the entire point of this change is to delete the controller.
- Add a global guard that reads `MCP_SERVER_ENABLED` and throws 503. Rejected — the wrapper's `McpStreamableHttpService` returns 404 when the underlying `McpServer` is not registered, which is functionally equivalent and matches the wrapper's documented behavior.

### 4) Bridge the `AuthUser` from the request to the existing `mcpAuthStorage` via an interceptor (no service-layer changes)

The wrapper exposes the underlying `Request` as a method parameter on `@Tool` and `@Resource` handlers. There are two ways to surface the user to handlers that want `getMcpAuthUser()`:

1. **Pass `req` to every handler and have handlers call `req.user as AuthUser` directly.** Pro: zero new infrastructure. Con: every existing `getMcpAuthUser()` call site (in `CvService`, `ApplicationService`, `MediaService`, the resource handlers, etc.) would have to be updated to take `user` as a parameter, which is exactly the "auth parameter pollution" the `AsyncLocalStorage` shim was built to avoid.
2. **Add a small `McpAuthRequestBridge` interceptor (or a Nest middleware bound to the `/mcp` route) that, on every MCP request, calls `mcpAuthStorage.run(req.user, () => next.handle())`.** Pro: zero call-site changes. Con: we keep the `AsyncLocalStorage` shim around.

We pick (2) to preserve the current call-site contract. The bridge is one Nest interceptor (or a `MiddlewareConsumer.apply(...).forRoutes('mcp', 'mcp/')` block in the `McpModule`). The `mcpAuthStorage.run(req.user, ...)` wrap moves from the controller body into the interceptor's `intercept(...)` method. The `getMcpAuthUser()` helper and its test (`mcp-auth.context.spec.ts`) stay unchanged.

**Alternatives considered:**

- Read `req.user` lazily inside every tool/resource handler (option 1). Rejected — too many call-site changes; the user's stated goal is "reduce the boilerplate", and option 1 is a different (and arguably worse) kind of boilerplate.
- Drop `getMcpAuthUser()` entirely and refactor `CvService.findAll(user, ...)` to read the user from a `ClsService`. Rejected — out of scope; would touch every service.

### 5) One `@Tool` provider per tool name, grouped by subdirectory

For 20 tools we create 20 `*.tool.ts` files. Each file is an `@Injectable()` with a single method decorated with `@Tool`. Example:

```ts
@Injectable()
export class ListCvsTool {
  constructor(private readonly cvService: CvService) {}
  @Tool({
    name: 'list_cvs',
    description: MCP_TOOL_DEFINITIONS.list_cvs.description,
    annotations: { readOnlyHint: true },
  })
  async run() {
    return this.cvService.findAll(getMcpAuthUser());
  }
}
```

Grouping:

- `apps/api/src/mcp/tools/cv/list-cvs.tool.ts`
- `apps/api/src/mcp/tools/cv/get-cv.tool.ts`
- `apps/api/src/mcp/tools/cv/delete-cv.tool.ts`
- `apps/api/src/mcp/tools/cv/create-cv-from-jsonresume.tool.ts`
- `apps/api/src/mcp/tools/cv/replace-cv-from-jsonresume.tool.ts`
- `apps/api/src/mcp/tools/export/export-cv-jsonresume.tool.ts`
- `apps/api/src/mcp/tools/export/export-cv-html.tool.ts`
- `apps/api/src/mcp/tools/export/export-cv-screenshot.tool.ts`
- `apps/api/src/mcp/tools/export/export-cv-pdf.tool.ts`
- `apps/api/src/mcp/tools/export/fetch-export-url.tool.ts`
- `apps/api/src/mcp/tools/export/list-cv-designs.tool.ts`
- `apps/api/src/mcp/tools/presentation/get-cv-template-presentation.tool.ts`
- `apps/api/src/mcp/tools/presentation/update-cv-template-presentation.tool.ts`
- `apps/api/src/mcp/tools/applications/list-applications.tool.ts`
- `apps/api/src/mcp/tools/applications/get-application.tool.ts`
- `apps/api/src/mcp/tools/applications/update-application.tool.ts`
- `apps/api/src/mcp/tools/applications/update-application-letter.tool.ts`
- `apps/api/src/mcp/tools/media/list-media.tool.ts`
- `apps/api/src/mcp/tools/media/get-media-url.tool.ts`
- `apps/api/src/mcp/tools/media/delete-media.tool.ts`

Tool descriptions stay in `tool-definitions.ts` (single source of truth — same as today). The `parameters` field is the same Zod schema that lives in `MCP_TOOL_DEFINITIONS`. The `annotations` field is the `{ readOnlyHint, destructiveHint }` pair. The wrapper's `Tool` decorator accepts all three.

The `run` body returns the **raw** value (e.g. the `McpExportEnvelope` or the `CvRecord`); the wrapper wraps it in `{ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }`. This replaces the manual `toStructuredContent(result)` and `JSON.stringify(result, null, 2)` from `McpToolsService.register`.

**Alternatives considered:**

- Keep a single `McpToolsService` with 20 methods, one per tool, all decorated with `@Tool`. Rejected — defeats the per-tool file pattern the wrapper is designed for, and does not make per-tool testing any easier than the current `mcp-tools.service.spec.ts`.
- Move tool descriptions inline to each `*.tool.ts` (de-duplicate `tool-definitions.ts`). Rejected — `tool-definitions.ts` is already the single source of truth and has dedicated unit tests (`tool-definitions.spec.ts`); the spec delta requires us to keep it.

### 6) One `@Resource` provider per resource URI, replacing the handler interface

The current `McpResourceHandler` interface (`title`, `description`, `uriTemplate`, `defaultMimeType`, `list(req)`, `read(uri, req)`) is replaced by three `@Injectable()` providers. Example:

```ts
@Injectable()
export class CvResource {
  constructor(private readonly cvService: CvService) {}
  @Resource({
    uri: 'resumind://{cvId}/cv',
    name: 'CVs',
    description: 'User CV library — primary CVs only (excludes application clones)',
    mimeType: 'application/json',
  })
  async handle({ cvId }: { cvId: string }) {
    const user = getMcpAuthUser();
    const cv = await this.cvService.findOne(user, cvId);
    return { text: JSON.stringify(cv, null, 2), mimeType: 'application/json' };
  }
}
```

`list` and `read` are folded into a single handler that returns `{ text, mimeType }`; the URI variables (`cvId`, `applicationId`, `mediaId`) are passed to the method as named parameters. The wrapper's `@Resource` decorator takes care of `resources/list` (returns the available URIs by calling the handler with each known id) and `resources/read` (extracts the id from the URI and dispatches to the handler).

**Alternatives considered:**

- Split `list` and `read` into two methods on the same provider (e.g. `@ListResources` and `@ReadResource`). Rejected — the wrapper's single-handler model is simpler and the current `McpResourceHandler.list()` body in `CvResourceHandler` is small (one query + a map); folding it into `handle({ cvId })` keeps the implementation legible.
- Keep the `McpResourceHandler` interface as a thin wrapper around `@Resource` so existing tests can stay. Rejected — the interface is implementation, not contract; deleting it (and its three implementations) is the cleanest cut.

### 7) `McpModule.forRoot` import path

`@rekog/mcp-nest` exports `McpModule` from the package root (`@rekog/mcp-nest`), and the `McpTransportType` enum from the same path. `McpModule.forRoot` is sync; the wrapper also exposes `McpModule.forRootAsync` (used in the Lambda example in the search result above) but our `MCP_SERVER_ENABLED` env gate is read once at module load and does not change at runtime, so `forRoot` is sufficient.

**Alternatives considered:**

- `McpModule.forRootAsync` reading the env from `ConfigService`. Rejected — the only env var we read at boot is `MCP_SERVER_ENABLED`, and the synchronous `forRoot` form lets us read `process.env` directly. If we later add a per-key rate limit, we can switch to `forRootAsync`.

### 8) Update the existing `mcp-server` delta spec to record the implementation change

`openspec/changes/mcp-export-s3-storage/specs/mcp-server/spec.md` is the most recent delta touching `mcp-server`. We add an "Implementation note" line to each tool / resource requirement in that delta noting that the implementation is provided by `@rekog/mcp-nest` `@Tool` / `@Resource` decorators. No new requirements; this is purely an audit trail.

**Alternatives considered:**

- Add a brand-new `mcp-rekog-nest-adoption` capability spec. Rejected — the change is implementation-only; adding a new spec would imply a new spec-level requirement, which we do not have.
- Update the unarchived `mcp-server` spec in place. Rejected — the unarchived spec lives in the `mcp-export-s3-storage` change folder; that change is on the verge of archive. We add the implementation note now and let the spec land via the normal archive flow.

## Risks / Trade-offs

- **Wrapper pinning risk** → `@rekog/mcp-nest` is a thin wrapper that imports `@modelcontextprotocol/sdk` as a peer dep; if the wrapper stops publishing for our Node / Nest versions we are stuck on 1.9.x. Mitigation: pin to `^1.9.10` (allows patch upgrades), keep `@modelcontextprotocol/sdk` as a direct fallback dep (do not delete the package from `apps/api/package.json` until v1.9.x is widely adopted and we have a fallback plan).
- **Session management parity** → the wrapper's `McpStreamableHttpService` uses a `transports: { [sessionId]: StreamableHTTPServerTransport }` map keyed by `mcp-session-id` header. The E2E suite depends on session round-tripping; verified that stateful mode + `sessionIdGenerator: () => randomUUID()` is the documented "stateful server" config in the wrapper playground. Mitigation: the `local-supabase.e2e-spec.ts` MCP block runs unchanged; any divergence is caught by the existing scenarios.
- **`MCP_SERVER_ENABLED` becomes 404-on-disabled instead of 503-on-disabled** → the controller goes away; the wrapper's transport returns 404 when the `McpServer` is not registered. This is a minor behavior change. Mitigation: update `apps/api/README.md` and any tests / fixtures that assert 503 on disabled mode.
- **Loss of `mcpAuthStorage.run(req.user, ...)` wrap in the controller** → the wrap moves to a Nest interceptor / middleware. The interceptor runs once per request, so the cost is one extra function call. Negligible. Mitigation: `mcp-auth.context.spec.ts` continues to test `mcpAuthStorage.run` + `getMcpAuthUser()`; the new `mcp-auth-request-bridge.interceptor.spec.ts` tests the wrap.
- **Zod 3 vs 4 incompatibility in any of our existing schemas** → the wrapper's peer dep is `zod@^4.3.5`. Our `tool-definitions.ts` uses `z.object({ cvId: z.string().uuid() })`, `z.enum([...])`, `z.number().int().min(60).max(86400)`, `z.record(z.string(), z.unknown())`, etc. — all v3-compatible and most v4-compatible. We typecheck and run tests; if any v3-only pattern appears (e.g. `.nonstrict()`, `.deepPartial()`, `.refine(...)` with a `path` arg), we patch the call site or pin `zod@^3.25.x` in a follow-up. Mitigation: search the codebase for `z.X` calls before bumping, then run `pnpm typecheck` and `pnpm test` and resolve any failures.
- **Per-tool testing cost** → 20 new `*.spec.ts` files plus 3 new resource specs is more total lines than the current single `mcp-tools.service.spec.ts` (~670 lines). The wrapper's `McpRegistryService` exposes a `getToolDefinitions()` and `getResourceDefinitions()` API we can use to assert discovery in a single `mcp-server.module.spec.ts`, keeping the per-tool specs narrow. Mitigation: colocate each spec next to its `*.tool.ts` per the workspace rule; do not duplicate `tool-definitions.ts` tests.
- **Tool description drift between `tool-definitions.ts` and the wrapper's `@Tool` decorator** → the description lives in `MCP_TOOL_DEFINITIONS[name].description` and is passed to the decorator via `MCP_TOOL_DEFINITIONS[name].description`. Drift is a code change, not a runtime risk. Mitigation: keep the unit test in `tool-definitions.spec.ts` that asserts every tool has a non-empty description.
- **Loss of `MCP_SERVER_ENABLED` 503 at request time** → the gate moves from per-request (`assertEnabled()` in the controller) to per-boot (skip `McpModule.forRoot` if the env is disabled). Operators who toggle `MCP_SERVER_ENABLED` at runtime would need a process restart. Mitigation: document in `apps/api/README.md`; today's behavior is per-request only because the controller ran `assertEnabled()` on every call, but operators in practice set the env at boot.

## Migration Plan

1. **Dependencies** — add `@rekog/mcp-nest@^1.9.10` and `zod@^4.3.5` to `apps/api/package.json`. Remove the direct `@modelcontextprotocol/sdk` entry (the wrapper declares it as a peer dep; the lockfile keeps it transitively). Run `pnpm install` to update `pnpm-lock.yaml`.
2. **Module wiring** — replace `apps/api/src/mcp/mcp.module.ts` with a module that imports `McpModule.forRoot({...})` (gated by `MCP_SERVER_ENABLED`), registers the new per-tool / per-resource providers, and binds the `McpAuthRequestBridge` interceptor (or middleware) to the `/mcp` route. The interceptor wraps the request in `mcpAuthStorage.run(req.user, ...)`.
3. **Tool providers** — create 20 `apps/api/src/mcp/tools/**/*.tool.ts` files. Each file is an `@Injectable` with a single `@Tool`-decorated method. The description comes from `MCP_TOOL_DEFINITIONS[name].description`; the parameters come from the existing Zod schemas in `mcp-tools.service.ts` (moved into a new `apps/api/src/mcp/tools/_schemas.ts` or kept inline per tool — see decisions). Each `run` body returns the raw value; the wrapper builds the `CallToolResult` envelope.
4. **Resource providers** — create 3 `apps/api/src/mcp/resources/*.resource.ts` files. Each file is an `@Injectable` with a single `@Resource`-decorated method. The `handle` method receives URI variables as named parameters and returns `{ text, mimeType }`.
5. **Delete** — `mcp.controller.ts`, `mcp-tools.service.ts`, `mcp-resource-handler.ts`, the old `resources/{cv,application,media}-resource.handler.ts` files, and the per-handler `spec.ts` files (`mcp.controller.spec.ts`, `mcp-tools.service.spec.ts`, `cv-resource.handler.spec.ts`, `application-resource.handler.spec.ts`, `media-resource.handler.spec.ts`).
6. **Auth context** — keep `mcp-auth.context.ts` (the `mcpAuthStorage` + `getMcpAuthUser` helpers) and its spec unchanged. Add `apps/api/src/mcp/mcp-auth-request-bridge.interceptor.ts` (or middleware) that wraps each `/mcp` request in `mcpAuthStorage.run(req.user, ...)` and add a colocated spec.
7. **Module test** — add `apps/api/src/mcp/mcp.module.spec.ts` that boots the module with `Test.createTestingModule` and asserts `McpModule.forRoot` discovers all 20 tool providers and 3 resource providers.
8. **Per-tool / per-resource specs** — add `apps/api/src/mcp/tools/**/*.spec.ts` and `apps/api/src/mcp/resources/*.spec.ts` covering: (a) the Zod schema rejects invalid input; (b) the handler calls the right service method; (c) the return value matches the expected shape (envelope for export tools, raw value for CRUD tools).
9. **README** — update `apps/api/README.md` MCP section: drop the manual transport paragraph; add a one-liner "uses [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest) for the Streamable HTTP transport, session management, and tool / resource registration"; update the `MCP_SERVER_ENABLED` note to mention 404 (not 503) when disabled.
10. **Spec delta** — add an "Implementation note" line to each requirement in `openspec/changes/mcp-export-s3-storage/specs/mcp-server/spec.md` indicating that the implementation is provided by `@rekog/mcp-nest` decorators. No new requirements; the audit trail is for future readers.
11. **Verify** — run `pnpm --filter @resumind/api typecheck`, `pnpm --filter @resumind/api test -- --run`, and `pnpm verify`. The `local-supabase.e2e-spec.ts` MCP block MUST pass unchanged.
12. **Rollback** — revert the diff; the wrapper is additive (we delete the controller / tools service / resource handlers but the wrapper brings its own controller). The signed-URL export transport, the `McpApiKeyGuard`, the `McpSettingsService`, and the `McpKeyRepository` are untouched. `pnpm install` + a single revert restores the prior state.

## Open Questions

- **Do we keep the 20 individual `*.tool.ts` files or co-locate groups of 2–3 tools in one provider (e.g. `CvToolHandlers` with 5 methods)?** Decision: 20 individual files. Each file is ~20–40 lines, the wrapper's auto-discovery is per-class, and per-file specs make failure diagnosis easier. The trade-off is file count.
- **Should we add the wrapper's per-tool `@UseGuards` (e.g. `McpApiKeyGuard` as a per-tool guard) instead of the application-level guard?** Decision: keep the application-level guard. We have one auth path (MCP API key) for all 20 tools; per-tool guards would be over-engineered and would force every tool to declare the same guard.
- **Should the `MCP_SERVER_ENABLED` gate also short-circuit the `McpSettingsService` (REST CRUD for keys) or only the `/mcp` route?** Decision: only `/mcp`. The REST endpoints for key management stay live so users can pre-create keys before re-enabling the MCP server. Documented in `apps/api/README.md`.
- **Do we keep `streamableHttp.enableJsonResponse` as the default (`false`) or flip it to `true`?** Decision: keep `false` (streaming SSE response) to match the existing client behavior. `enableJsonResponse: true` is for clients that do not support streaming.
- **Should we expose the wrapper's `McpRegistryService` from `McpModule` so the existing `McpSettingsService` introspection (the `listRegisteredToolNames()` API) can be backed by the wrapper?** Decision: yes, but as a separate change. The `McpSettingsService` already calls `McpToolsService.listRegisteredToolNames()`; we update that call site to use `McpRegistryService` in the same PR so the `McpSettingsController` GET endpoint continues to return the catalog.
