## 1. Dependencies and scripts

- [x] 1.1 Add `@nestjs/devtools-integration` to `apps/api/package.json` `devDependencies` and install via `pnpm install`
- [x] 1.2 Add `start:debug` script to `apps/api/package.json` running `nest start --debug 0.0.0.0:9229 --watch` (keep existing `dev` script unchanged)
- [x] 1.3 Add root `dev:api:debug` and `local:devtools` scripts to the repo `package.json` delegating to `apps/api` and opening the documented Devtools URL

## 2. Nest bootstrap and module wiring

- [x] 2.1 In `apps/api/src/main.ts`, pass `{ snapshot: true }` to `NestFactory.create(AppModule, ...)` with a short comment pointing to `openspec/changes/improve-agent-debug-api`
- [x] 2.2 In `apps/api/src/app.module.ts`, add `DevtoolsModule.register({ http: process.env.NODE_ENV !== 'production' })` to the `imports` array (gated on non-production per spec requirement)

## 3. TypeScript source maps

- [x] 3.1 Verify `apps/api/tsconfig.json` keeps `"sourceMap": true` and add `"declarationMap": true` (audit only; do not weaken existing options)
- [x] 3.2 Confirm `nest build` still emits `*.js.map` next to `*.js` under `apps/api/dist/` (no code change expected — verification only)

## 4. Editor / agent launch config

- [x] 4.1 Create `.vscode/launch.json` with a single `Attach to @resumind/api` configuration: `{ type: "node", request: "attach", name: "Attach to @resumind/api", port: 9229, restart: true, sourceMaps: true, sourceMapPathOverrides: { "*": "${workspaceRoot}/*" }, outFiles: ["${workspaceRoot}/apps/api/dist/**/*.js"] }`
- [x] 4.2 Add a brief `.vscode/launch.json` JSON-formatting test (Biome/Prettier pre-commit will catch this; no new test code)

## 5. Documentation

- [x] 5.1 Add a "Debugging the API" section to `apps/api/README.md` covering `pnpm dev:api:debug`, the `Attach to @resumind/api` launch config, `pnpm local:devtools`, and the `NODE_ENV=production` guard
- [x] 5.2 Add the same "Debugging the API" section to the repo root `README.md` (linked from the existing Dev workflow table)
- [x] 5.3 Document the optional `inspector-mcp` MCP server for Cursor under the "Debugging the API" section so agents can attach via MCP as well

## 6. Unit tests

- [x] 6.1 Add `apps/api/src/app.module.spec.ts` (colocated) asserting `DevtoolsModule` is imported when `NODE_ENV !== 'production'` and not imported when `NODE_ENV === 'production'` — uses `Test.createTestingModule` with mocked `process.env` to keep coverage above 90%
- [x] 6.2 Add a small unit test in `apps/api/src/main.ts` companion or a dedicated `apps-api-bootstrap.spec.ts` that verifies `NestFactory.create` receives `{ snapshot: true }` by spying on the factory (colocated; works against the existing 90% threshold)

## 7. Verification

- [x] 7.1 Run `pnpm --filter @resumind/api test -- --run` — all unit tests pass, coverage ≥ 90% for statements/branches/functions/lines
- [x] 7.2 Run `pnpm typecheck` — typecheck passes with the new module imports and `declarationMap` option
- [x] 7.3 Run `pnpm lint` and `pnpm format:check` — no Biome or Prettier diffs
- [ ] 7.4 Manually start `pnpm dev:api:debug` and confirm (a) inspector reachable at `ws://localhost:9229`, (b) `/_devtools/` endpoints respond, (c) `pnpm dev:api` still starts without the inspector port
- [x] 7.5 Run `pnpm build` — production build succeeds and `apps/api/dist` includes source maps; `node dist/main.js` (with `NODE_ENV=production`) does NOT mount `/_devtools/`

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — full suite. This change adds dev-only configuration (inspector, Devtools, source maps, launch config, docs). No REST contract, Supabase schema, RLS policy, auth flow, or MCP server behavior changes, so the existing scenarios MUST continue to pass.

### Update required

- None — the public API surface, MCP contract, and Supabase data model are unchanged.

### Add

- None — Devtools and the Node inspector are developer affordances, not user-facing behavior. They are covered by the colocated unit tests in `apps/api/src/app.module.spec.ts` and the manual verification in task 7.4.
