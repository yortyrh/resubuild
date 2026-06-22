## Context

The repository is a pnpm + Turborepo monorepo. pnpm's configuration is read from two locations in modern releases:

1. `pnpm-workspace.yaml` — workspace declarations and pnpm settings (`onlyBuiltDependencies` / `allowBuilds`, `peerDependencyRules`, etc.).
2. Root `package.json` — the `packageManager` field pins the pnpm version, and `engines.pnpm` is no longer used as of pnpm 10.

Before this change:

- Root `package.json` had `packageManager: pnpm@10.26.0` and an inline `pnpm.onlyBuiltDependencies` allowlist.
- `pnpm-workspace.yaml` only declared `packages:`.
- `apps/api/Dockerfile` and `apps/web/Dockerfile` pinned corepack to `pnpm@10.26.0` in both builder and runtime stages.
- The developer's local corepack had already pulled `pnpm@11.8.0`, causing a drift between the local environment and the container images.

## Goals / Non-Goals

**Goals:**

- Single source of truth for the pnpm version: root `packageManager` and every Dockerfile agree.
- Move the allow-built-deps allowlist to the location pnpm 10+ actually reads (`pnpm-workspace.yaml`).
- Eliminate the deprecation warning on every `pnpm install`.

**Non-Goals:**

- Upgrading lockfile-resolved dependency versions (no `pnpm` dep tree change).
- Adopting other pnpm 11 settings (e.g. `peerDependencyRules`, `packageExtensions`).
- Touching CI workflow files — `.github/actions/setup-monorepo` already invokes corepack without a hard-pinned version and reads the root `packageManager`.

## Decisions

- **Bump pnpm to 11.8.0 (not the latest 11.x).** Matches the version already in active use on developer machines and already compatible with the lockfile. Picking a non-floating version keeps Docker builds reproducible.
- **Move `onlyBuiltDependencies` → `allowBuilds`.** pnpm 10 renamed the key (same shape: `{ "pkg-name": true }`). The seven entries (`@nestjs/core`, `esbuild`, `lefthook`, `protobufjs`, `puppeteer`, `sharp`, `unrs-resolver`) are migrated verbatim.
- **No Dockerfile consolidation.** Each Dockerfile still pins its own corepack version (4 lines total across the repo). This mirrors the existing pattern and avoids introducing a shared `ARG` constant — the cost of repeating `pnpm@11.8.0` is lower than the cost of a new build arg.
- **No `packageManager` corepack auto-resolution in Dockerfiles.** `corepack prepare pnpm@X.Y.Z --activate` continues to take an explicit version. Relying on `packageManager` auto-resolution in corepack is supported but less reproducible across corepack versions.

## Risks / Trade-offs

- [Lockfile regenerated under pnpm 11 could shift `node_modules/.pnpm` paths] → Mitigation: the lockfile on `main` is already produced under pnpm 11.8.0; no fresh `pnpm install --lockfile-only` is required by this change.
- [Future pnpm 11.x patch upgrades require a Dockerfile + `packageManager` bump in the same PR] → Mitigation: tracked in the new requirement "Future pnpm version bumps stay in sync across the repo and container images".
- [CI cache keyed on lockfile might miss the first run after merge] → Mitigation: standard `actions/cache` warm-up behaviour; not specific to this change.

## Migration Plan

Already applied — no rollout steps remain. The change is a configuration sync, not a runtime change.

Rollback: revert the four files (`package.json`, `pnpm-workspace.yaml`, both Dockerfiles) and re-run `pnpm install` to regenerate any pnpm-11-specific lockfile entries.

## Open Questions

None.
