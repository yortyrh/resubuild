# Monorepo and toolchain (delta)

## Purpose

This delta modifies the `monorepo-and-toolchain` capability to reflect
two dev-time toolchain tweaks in `apps/api`: `nest-cli.json`
`compilerOptions.deleteOutDir = false` and `apps/api/tsconfig.json`
`compilerOptions.rootDir = "./src"`. The change is additive; existing
CI/Lefthook rules are unchanged.

## MODIFIED Requirements

### Requirement: The `apps/api` watch-mode build SHALL preserve its incremental cache

`apps/api/nest-cli.json` SHALL set `compilerOptions.deleteOutDir = false`
so the watch-mode build (`nest start --watch`) does not delete
`apps/api/dist/` or the `tsconfig.build.tsbuildinfo` cache file on every
restart. The production build (`pnpm build`, which is run via Turborepo
and is not the watch-mode command) is unaffected; it deletes the output
directory explicitly via its own pipeline. `apps/api/tsconfig.json` SHALL
set `compilerOptions.rootDir = "./src"` so the build emits a stable
output layout (`dist/main.js` always resolves to `src/main.ts`) and the
`tsbuildinfo` cache file is no longer rewritten on every restart.

#### Scenario: Developer runs `pnpm dev:api` after a previous session

- **WHEN** the developer runs `pnpm dev:api` (which invokes `nest start --watch`) in `apps/api`
- **THEN** the previous `apps/api/dist/` is preserved between restarts
- **AND** the `tsconfig.build.tsbuildinfo` cache file is reused, so the first compile after a source edit is faster than a clean rebuild
- **AND** the production build (`pnpm build`) is not affected (it deletes `dist/` explicitly)

#### Scenario: Source edit triggers an incremental rebuild

- **WHEN** the developer edits a `.ts` file under `apps/api/src/` while the watch-mode server is running
- **THEN** the server rebuilds only the changed module and its dependents
- **AND** the `tsbuildinfo` cache file is updated in place (not deleted and recreated)
