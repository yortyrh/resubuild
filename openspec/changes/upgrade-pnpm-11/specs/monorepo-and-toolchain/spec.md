## ADDED Requirements

### Requirement: The repository SHALL pin pnpm 11.x via the root `packageManager` field

The root `package.json` MUST declare `"packageManager": "pnpm@11.8.0"` (or a later pnpm 11.x release), and the developer machine, CI runners, and container builds MUST resolve to that version. The lockfile (`pnpm-lock.yaml`) MUST be the source of truth for resolved dependency versions; pnpm MUST refuse to mutate the lockfile silently.

#### Scenario: `pnpm --version` agrees with `packageManager`

- **WHEN** a developer or CI runner runs `pnpm --version` in the repository root
- **THEN** the reported version matches the patch-level version declared in the root `package.json` `packageManager` field
- **AND** `pnpm install` runs without printing a "wrong pnpm version" error

### Requirement: The workspace allowlist for native build scripts SHALL live in `pnpm-workspace.yaml`

Packages that are permitted to run install scripts (native builds, postinstall binaries) MUST be listed under the `allowBuilds` map in `pnpm-workspace.yaml`. The legacy `pnpm.onlyBuiltDependencies` field in `package.json` MUST NOT be used — pnpm 10+ ignores it and prints a deprecation warning if present. The allowlist MUST include every package that requires a native build or postinstall step in this repo (`@nestjs/core`, `esbuild`, `lefthook`, `protobufjs`, `puppeteer`, `sharp`, `unrs-resolver`).

#### Scenario: `pnpm install` does not warn about `pnpm.onlyBuiltDependencies`

- **WHEN** a developer or CI runner runs `pnpm install` at the repository root
- **THEN** pnpm MUST NOT print the message "The \"pnpm\" field in package.json is no longer read by pnpm"
- **AND** every package in the `allowBuilds` map runs its install/build scripts
- **AND** any package NOT in the map is refused its install script (pnpm 11 default-deny behaviour)

### Requirement: Container images SHALL install the same pnpm version as the root `packageManager`

Both `apps/api/Dockerfile` and `apps/web/Dockerfile` MUST activate pnpm via `corepack prepare pnpm@<exact-version> --activate` in **every** stage that runs `pnpm` (the builder stage and the runtime stage), where `<exact-version>` matches the patch version declared in the root `package.json` `packageManager` field. The version string MUST NOT be older than the root `packageManager` value.

#### Scenario: API container installs the pinned pnpm

- **WHEN** the `apps/api` image is built
- **THEN** both the builder and the runtime stages activate `pnpm@<root packageManager version>` via corepack
- **AND** `pnpm install` inside the container succeeds without a "lockfile requires pnpm X" warning

#### Scenario: Web container installs the pinned pnpm

- **WHEN** the `apps/web` image is built
- **THEN** both the builder and the runtime stages activate `pnpm@<root packageManager version>` via corepack
- **AND** the production install (`pnpm install --prod --ignore-scripts`) uses that same version

### Requirement: Future pnpm version bumps stay in sync across the repo and container images

A pnpm version bump MUST land in a single PR that updates (a) the root `package.json` `packageManager` field, (b) every `corepack prepare pnpm@...` line in `apps/api/Dockerfile` and `apps/web/Dockerfile`, and (c) the lockfile (via `pnpm install`). The change MUST be considered breaking if any of the four files is missed, because a drifted corepack version will rebuild `node_modules/.pnpm` with a different store layout and silently invalidate Docker layer caches.

#### Scenario: Developer bumps pnpm

- **WHEN** a developer bumps the pnpm version
- **THEN** the same PR updates all four config locations to the new exact version
- **AND** CI rebuilds `node_modules` and re-pushes both images without manual fixups
