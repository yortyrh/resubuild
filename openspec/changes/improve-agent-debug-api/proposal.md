## Why

Agentic tools (Cursor, Claude, etc.) that debug the Resumind NestJS API today have to work blind: there is no Node inspector listener, no dependency graph they can introspect, and the dev `tsconfig` does not preserve the mappings they need to set breakpoints in source `.ts` files. At the same time, `@nestjs/devtools-integration` is not wired into `AppModule`, so its snapshot graph and route inspector are unavailable locally. Improving this surface lets agents (and humans) attach a debugger, list providers/controllers, and step through real TypeScript — turning the API from a black box into a navigable one.

## What Changes

- Add `start:debug` and `start:debug:prod` scripts to `apps/api/package.json` that launch the Nest dev server with the Node inspector listening on `0.0.0.0:9229` and watch mode enabled.
- Install `@nestjs/devtools-integration` and register `DevtoolsModule` in `apps/api/src/app.module.ts` gated on `NODE_ENV !== 'production'`, and enable `snapshot: true` in `apps/api/src/main.ts` so the dependency graph and bootstrap snapshot are available for inspection.
- Ensure `apps/api/tsconfig.json` emits TypeScript source maps (preserve `"sourceMap": true`, add `"declarationMap": true` if missing) so breakpoints in `.ts` files resolve correctly.
- Add an `.vscode/launch.json` entry (and document `inspector-mcp` for Cursor) so any agent or developer can attach to `start:debug` with one click.
- Document the new debug workflow in `apps/api/README.md` and the repo root `README.md` under a "Debugging the API" section, and add a `local:devtools` pnpm helper at the root to launch the Devtools UI.

## Capabilities

### New Capabilities

- `api-dev-debug-surface`: Covers the local debug affordances for `apps/api` — Node inspector script, Nest Devtools wiring, source-map preservation, and agent-friendly launch configuration.

### Modified Capabilities

- `monorepo-and-toolchain`: REQUIREMENTS about the `apps/api` script surface and the root pnpm helpers expand to include the new `dev:api:debug` and `local:devtools` scripts and a documented Devtools availability clause. Existing CI/Lefthook rules are unchanged.
- `mcp-server`: REQUIREMENTS gain a clause that the existing `@rekog/mcp-nest` MCP server is also a valid agent debug surface, and that agents may discover the API in addition to consume it. No behavioral change to existing tools.

## Impact

- `apps/api/package.json` (new scripts + `@nestjs/devtools-integration` devDependency).
- `apps/api/src/main.ts` (one option flag).
- `apps/api/src/app.module.ts` (one new module import, gated on env).
- `apps/api/tsconfig.json` (source-map option audit; no breaking change).
- `.vscode/launch.json` (new file, debug-only — not loaded in CI).
- `package.json` (new root scripts: `dev:api:debug`, `local:devtools`).
- `apps/api/README.md` and root `README.md` (additive docs).
- No public API, Supabase, or schema changes. Production builds (`pnpm build`, `node dist/main`) are unchanged because Devtools is gated on `NODE_ENV !== 'production'`.
