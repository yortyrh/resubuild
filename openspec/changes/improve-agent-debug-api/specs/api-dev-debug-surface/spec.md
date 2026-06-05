## ADDED Requirements

### Requirement: `apps/api` SHALL expose a Node inspector endpoint under watch mode for local debugging

`apps/api/package.json` MUST define a `start:debug` script that launches the Nest dev server with the Node inspector listening on `0.0.0.0:9229` and watch mode enabled. The script SHALL be the standard `nest start --debug 0.0.0.0:9229 --watch` form (or an equivalent invocation documented in the script's `// dev-tools` comment). The existing `dev` script SHALL remain unchanged so non-debug runs are not affected.

#### Scenario: Developer attaches a debugger to the API

- **WHEN** a developer (or an agent such as Cursor) runs `pnpm --filter @resumind/api start:debug` from the repo root
- **THEN** the Nest dev server starts in watch mode
- **AND** the Node inspector is reachable at `ws://localhost:9229/<uuid>` (or `host:9229` for non-loopback binds)
- **AND** setting a breakpoint in a `apps/api/src/**/*.ts` file pauses execution on the next request

#### Scenario: Non-debug `dev` script is unchanged

- **WHEN** a developer runs `pnpm dev:api`
- **THEN** the API starts in watch mode without exposing the inspector
- **AND** port 9229 is not opened

### Requirement: `apps/api` SHALL register `@nestjs/devtools-integration` outside production

`apps/api` MUST depend on `@nestjs/devtools-integration` (declared in `devDependencies` or `dependencies` as appropriate for the version published). `AppModule` MUST register `DevtoolsModule.register({ http: process.env.NODE_ENV !== 'production' })` so the module and its HTTP inspector are wired only in non-production environments. `apps/api/src/main.ts` MUST call `NestFactory.create(AppModule, { snapshot: true })` so the bootstrap graph is recorded and made visible to Devtools.

#### Scenario: Devtools UI is available in development

- **WHEN** the API is started with `NODE_ENV=development` (the default for `pnpm dev:api`) and the bootstrap completes
- **THEN** `@nestjs/devtools-integration` HTTP endpoints are mounted under `/_devtools/`
- **AND** the bootstrap snapshot JSON is written to the documented cache location
- **AND** an agent or developer can open the Devtools UI at the documented URL to inspect the module graph and routes

#### Scenario: Devtools is disabled in production

- **WHEN** the API is started with `NODE_ENV=production` (e.g. via `pnpm start:prod` → `node dist/main`)
- **THEN** `DevtoolsModule.register({ http: false })` is the effective registration
- **AND** no `/_devtools/` HTTP endpoints are mounted
- **AND** the snapshot option is still passed (cheap, no leak) but no Devtools UI is reachable

### Requirement: `apps/api` SHALL preserve TypeScript source maps so breakpoints resolve to `.ts` files

`apps/api/tsconfig.json` MUST keep `"sourceMap": true` in `compilerOptions`. The base config SHOULD also include `"declarationMap": true` so editors can resolve "go to definition" against compiled output. The build pipeline (`nest build`) MUST NOT strip source maps.

#### Scenario: Breakpoints resolve in source TypeScript

- **WHEN** a developer or agent attaches the Node inspector to `pnpm dev:api:debug` and sets a breakpoint on a line of a `.ts` file under `apps/api/src/`
- **THEN** execution pauses at the corresponding line in the source file
- **AND** the inspector does not show `dist/main.js` as the breakpoint location

#### Scenario: Build output still ships source maps

- **WHEN** `pnpm --filter @resumind/api build` runs in CI
- **THEN** `apps/api/dist/**/*.js.map` files are produced alongside the compiled JS
- **AND** `apps/api/dist/**/*.d.ts.map` files are produced alongside the declaration files when `declarationMap` is enabled

### Requirement: The repository SHALL provide an editor launch config and a `dev:api:debug` root script

The repo MUST include `.vscode/launch.json` with at least one configuration named `Attach to @resumind/api` (or equivalent) that attaches to the inspector port `9229` using `"request": "attach"` and `"port": 9229`. The root `package.json` MUST add a `dev:api:debug` script that delegates to the new `start:debug` script in `apps/api`, and a `local:devtools` script that opens the documented Devtools UI URL in the developer's browser once the API is running.

#### Scenario: One-click attach from Cursor or VS Code

- **WHEN** a developer runs `pnpm dev:api:debug` in a terminal
- **AND** then chooses the "Run and Debug" → "Attach to @resumind/api" configuration in Cursor or VS Code
- **THEN** the editor attaches to the running inspector
- **AND** breakpoints set in `apps/api/src/**/*.ts` files pause execution

#### Scenario: Devtools UI is reachable from the root helper

- **WHEN** a developer runs `pnpm local:devtools` after starting the API
- **THEN** the developer's default browser opens the documented Devtools URL
- **AND** the module graph and route table are visible

### Requirement: The repository SHALL document the new debug workflow

`apps/api/README.md` and the repo root `README.md` MUST include a "Debugging the API" section that explains:

1. How to start the API with the inspector enabled (`pnpm dev:api:debug`).
2. How to attach from Cursor/VS Code (the `Attach to @resumind/api` launch config) or any Node inspector client.
3. How to open the Nest Devtools UI (`pnpm local:devtools`).
4. That Devtools is disabled when `NODE_ENV=production` and that the inspector binds to `0.0.0.0:9229` for local/agent use.

#### Scenario: A new agent or developer finds the debug instructions

- **WHEN** an agent or developer opens either README and searches for "debug" or "inspector"
- **THEN** the "Debugging the API" section is reachable within the same document
- **AND** the listed commands work against a freshly cloned repo after `pnpm install`
