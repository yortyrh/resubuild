## Context

`apps/api` is a NestJS 11 service. Today:

- `pnpm --filter @resumind/api dev` runs `nest start --watch` — no Node inspector is exposed, so no debugger can attach.
- `apps/api/src/main.ts` calls `NestFactory.create(AppModule)` with no options, so the bootstrap snapshot is discarded.
- `AppModule` does not import `@nestjs/devtools-integration`, so the Devtools module graph and HTTP inspector are unavailable.
- `apps/api/tsconfig.json` does have `"sourceMap": true`, but there is no agent/editor launch config in the repo and no doc explaining how to attach.
- The repo already exposes an `@rekog/mcp-nest` MCP server at `/mcp` (see `openspec/specs/mcp-server/spec.md`), so agents can already call API tools — but they cannot introspect the module graph or step through TypeScript.

This change makes the API debuggable from any agent or editor without altering production behavior.

## Goals / Non-Goals

**Goals:**

- Expose a Node inspector endpoint (`--inspect=0.0.0.0:9229`) under watch mode for `apps/api`.
- Register `DevtoolsModule` (gated on `NODE_ENV !== 'production'`) so the bootstrap graph and route table are visible at `/_devtools/...`.
- Keep `tsconfig.json` source maps intact (and add `declarationMap`) so breakpoints resolve to `.ts` files when running under the inspector.
- Add a `.vscode/launch.json` and document `inspector-mcp` so any agent or human can attach with one command.
- Surface these helpers in the root README and `apps/api/README.md`.

**Non-Goals:**

- No new MCP tools, no new REST endpoints exposed to clients.
- No changes to production builds (`node dist/main`), CI, or Lefthook.
- No changes to Supabase, RLS, JSON Resume schema, or web app.
- No new tests beyond what is needed to keep coverage at 90% (the additions are configuration only — no service logic changes).

## Decisions

### Decision 1: Use `nest start --debug 0.0.0.0:9229 --watch` rather than raw `node --inspect`

- **Rationale:** Matches the user's prompt verbatim and is what `@nestjs/cli` documents for dev debugging. It preserves watch-mode rebuilds and avoids duplicating the build pipeline in a custom script.
- **Alternatives considered:** raw `node --inspect-brk dist/main.js` after `nest build` — rejected because it loses watch-mode UX and duplicates the build/run coupling.

### Decision 2: Gate `DevtoolsModule` on `NODE_ENV !== 'production'`

- **Rationale:** The user's prompt and the official docs both require this gate. Devtools is a developer aid; exposing it in prod leaks module metadata and is a small DoS surface.
- **Alternatives considered:** always-on with a separate boolean flag (`DEVTOOLS_ENABLED`) — rejected as more config for no real benefit; the `NODE_ENV` gate is the documented default and matches the env-var conventions already used (`MCP_SERVER_ENABLED`, `CORS_ORIGIN`).

### Decision 3: Pass `snapshot: true` to `NestFactory.create`

- **Rationale:** Required by `@nestjs/devtools-integration` to record the bootstrap graph and let Devtools render it. Costs one synchronous `writeFile` of a small JSON file on startup — negligible.
- **Alternatives considered:** a custom GraphQL inspector — rejected; the snapshot is the documented contract.

### Decision 4: Add `.vscode/launch.json` with a single `Attach to @resumind/api` config

- **Rationale:** VS Code / Cursor attach to Node inspectors using a known recipe. A checked-in launch config means agents and humans share the same attach path. We do not run the `start:debug` script ourselves — the user runs `pnpm dev:api:debug` in one terminal and attaches in the other.
- **Alternatives considered:** a compound script that starts + attaches in one process — rejected, harder to keep running while editing.

### Decision 5: Add `dev:api:debug` and `local:devtools` root scripts, not new CI scripts

- **Rationale:** Root scripts are how `apps/api` is operated locally today (`dev:api`). Adding `dev:api:debug` mirrors that. `local:devtools` opens the Devtools UI in the user's browser after the API is running.
- **Alternatives considered:** document in README only — rejected, scripts make the workflow reproducible and discoverable.

### Decision 6: Source maps — keep `sourceMap: true`, add `declarationMap: true`

- **Rationale:** `sourceMap` is already on; we add `declarationMap` so jumping to a declaration in editor (e.g. "Go to definition") works for compiled consumers. This is dev-only metadata and has no runtime cost.
- **Alternatives considered:** toggling `inlineSources` — rejected, bloats output; not needed when breakpoints only need to map back to `.ts`.

## Risks / Trade-offs

- [Devtools exposed accidentally in prod if `NODE_ENV` is mis-set] → The `register({ http: process.env.NODE_ENV !== 'production' })` guard is the documented gate; we add a comment in `app.module.ts` calling it out and we verify with a unit test that mocks `NODE_ENV`.
- [Inspector port 9229 reachable on a shared LAN] → Acceptable for local dev; documented in the README that the inspector binds to all interfaces for container/agent use, and the user should not expose 3001/9229 publicly.
- [Snapshot file written to disk on every bootstrap] → Use the default `./node_modules/.cache/nestjs-devtools/snapshot.json` location; small, ephemeral, not committed.
- [`.vscode/launch.json` adds a workspace preference file] → Cursor and VS Code both respect a per-repo `launch.json`; other editors are unaffected. The file only contains a debug config, not secrets.

## Migration Plan

1. Land this change behind a single PR; no DB / env / deploy steps required.
2. Developers opt in by running `pnpm dev:api:debug` (or hitting the VS Code "Attach to @resumind/api" launch config after running it in a terminal).
3. Rollback: revert the PR. Production paths (`pnpm start:prod`, CI `Build` job) are untouched because Devtools is env-gated and the `start:debug` script is a new addition, not a replacement of `dev`.

## Open Questions

- None blocking. If the team later wants remote SSH attach for Codespaces, add `--inspect-brk` variant under a separate script (out of scope here).
