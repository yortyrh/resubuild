## MODIFIED Requirements

### Requirement: `apps/api` SHALL expose a Node inspector endpoint under watch mode for local debugging

`apps/api/package.json` MUST define a `start:debug` script that launches the Nest dev server with the Node Inspector listening on `0.0.0.0:9229` and watch mode enabled. The script SHALL be the standard `nest start --debug 0.0.0.0:9229 --watch` form (or an equivalent invocation documented in the script's `// dev-tools` comment). The existing `dev` script SHALL remain unchanged so non-debug runs are not affected.

#### Scenario: Developer attaches a debugger to the API

- **WHEN** a developer (or an agent such as Cursor) runs `pnpm --filter @resubuild/api start:debug` from the repo root
- **THEN** the Nest dev server starts in watch mode
- **AND** the Node Inspector is reachable at `ws://localhost:9229/<uuid>` (or `host:9229` for non-loopback binds)
- **AND** setting a breakpoint in a `apps/api/src/**/*.ts` file pauses execution on the next request

### Requirement: `apps/api` SHALL preserve TypeScript source maps so breakpoints resolve to `.ts` files

`apps/api/tsconfig.json` MUST keep `"sourceMap": true` in `compilerOptions`. The base config SHOULD also include `"declarationMap": true` so editors can resolve "go to definition" against compiled output. The build pipeline (`nest build`) MUST NOT strip source maps.

#### Scenario: Build output still ships source maps

- **WHEN** `pnpm --filter @resubuild/api build` runs in CI
- **THEN** `apps/api/dist/**/*.js.map` files are produced alongside the compiled JS
- **AND** `apps/api/dist/**/*.d.ts.map` files are produced alongside the declaration files when `declarationMap` is enabled

### Requirement: The repository SHALL provide an editor launch config and a `dev:api:debug` root script

The repo MUST include `.vscode/launch.json` with at least one configuration named `Attach to @resubuild/api` (or equivalent) that attaches to the Inspector port 9229 using `"request": "attach"` and `"port": 9229`. The root `package.json` MUST add a `dev:api:debug` script that delegates to the new `start:debug` script in `apps/api`, and a `local:devtools` script that opens the documented Devtools UI URL in the developer's browser once the API is running.

#### Scenario: One-click attach from Cursor or VS Code

- **WHEN** a developer runs `pnpm dev:api:debug` in a terminal
- **AND** then chooses the "Run and Debug" → "Attach to @resubuild/api" configuration in Cursor or VS Code
- **THEN** the editor attaches to the running Inspector
- **AND** breakpoints set in `apps/api/src/**/*.ts` files pause execution

### Requirement: The repository SHALL document the new debug workflow

`apps/api/README.md` and the repo root `README.md` MUST include a "Debugging the API" section that explains:

1. How to start the API with the Inspector enabled (`pnpm dev:api:debug`).
2. How to attach from Cursor/VS Code (the `Attach to @resubuild/api` launch config) or any Node Inspector client.
3. How to open the Nest Devtools UI (`pnpm local:devtools`).
4. That Devtools is disabled when `NODE_ENV=production` and that the Inspector binds to `0.0.0.0:9229` for local/agent use.

#### Scenario: A new agent or developer finds the debug instructions

- **WHEN** an agent or developer opens either README and searches for "debug" or "Inspector"
- **THEN** the "Debugging the API" section is reachable within the same document
- **AND** the listed commands work against a freshly cloned repo after `pnpm install`
