## Why

This change retroactively documents work already implemented in the working tree.

The repository's `packageManager` field pinned pnpm to `10.26.0`, and the Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) installed that same older version via `corepack prepare pnpm@10.26.0 --activate`. The locally installed pnpm was `11.8.0`, which printed a deprecation warning on every `pnpm install`:

> The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.onlyBuiltDependencies".

The actual pnpm release on the developer machine had already drifted from the pinned version, the Dockerfiles still built images with a stale pnpm, and the deprecated `pnpm.onlyBuiltDependencies` block was being silently ignored. The change brings the three configuration surfaces (root package.json, both Dockerfiles, and the workspace file) into a single consistent state on pnpm 11 with the modern `allowBuilds` setting.

## What Changes

- Root `package.json` `packageManager` pinned to `pnpm@11.8.0`.
- Root `package.json` `pnpm.onlyBuiltDependencies` block **REMOVED** (no longer read by pnpm 10+; replaced by the new workspace file location below).
- `pnpm-workspace.yaml` gains an `allowBuilds` map listing every package previously in `pnpm.onlyBuiltDependencies` (`@nestjs/core`, `esbuild`, `lefthook`, `protobufjs`, `puppeteer`, `sharp`, `unrs-resolver`).
- `apps/api/Dockerfile` builder and runtime stages: `corepack prepare pnpm@10.26.0` → `corepack prepare pnpm@11.8.0`.
- `apps/web/Dockerfile` builder and runtime stages: `corepack prepare pnpm@10.26.0` → `corepack prepare pnpm@11.8.0`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monorepo-and-toolchain`: adds requirements that pin the pnpm version, document the `allowBuilds` allowlist location, and state that container builds must use the same pnpm version as the root `packageManager`.

## Impact

- **Build images** — Dockerfiles install pnpm 11.8.0 via corepack; lockfile resolution and workspace symlinking now run under pnpm 11 semantics.
- **Local development** — `pnpm install` no longer prints the `pnpm.onlyBuiltDependencies` deprecation warning.
- **CI** — GitHub Actions composite action `.github/actions/setup-monorepo` invokes corepack with the same version the root declares; no CI YAML changes are required but the lockfile (already authored against 11.x) is now the source of truth.
- **Allowed build scripts** — the seven packages listed above continue to be permitted to run install scripts. `pnpm install` will refuse to run install scripts for any package not on the list (existing behaviour).
