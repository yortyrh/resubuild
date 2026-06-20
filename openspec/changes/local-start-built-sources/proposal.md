## Why

Developers currently have no first-class way to launch the full Resubuild stack from already-built artifacts. `pnpm dev` runs everything in watch mode (slow, requires fresh Nest recompiles, and pulls in Devtools), while `pnpm build` only produces artifacts — it does not start anything. Smoke-testing a release-style run, reproducing a production-shaped boot locally, or running the stack after `pnpm build` all require falling back to two parallel `pnpm --filter …` invocations from muscle memory. This change retroactively documents work already implemented in the working tree to fill that gap with a single canonical command.

This change retroactively documents work already implemented in the working tree.

## What Changes

- Add a root `pnpm start` script that runs the `start` script of every workspace in parallel, so a single command boots `apps/web` (`next start`) and `apps/api` (`node dist/main`) from their built sources.
- Change `apps/api`'s `start` script to invoke `node dist/main` (the previously-named `start:prod`), so the root `pnpm start` boots the API from compiled output rather than re-invoking `nest start` against TS sources.
- Rename the previous TS-source API script from `start` to `start:dev` to preserve access to the watch-free TS-mode boot path for any external reference; the previously-named `start:prod` is removed as a duplicate.
- Update `apps/api/README.md` to reference the canonical `pnpm start` instead of the removed `pnpm start:prod`.

No new behaviors are introduced at runtime — both apps still listen on the same ports, the API still honors `NODE_ENV !== 'production'` gating for Devtools, and the web app still runs from `.next/`. The change is a developer-experience / packaging alignment only.

## Capabilities

### New Capabilities

None. No new spec capability is created — this is a developer-tooling alignment that fits under the existing `monorepo-and-toolchain` capability, which already documents root scripts and workspace conventions.

### Modified Capabilities

- `monorepo-and-toolchain`: add a requirement covering the root `pnpm start` command (built-sources local boot, parallel workspace invocation, contract with each workspace's own `start` script).

## Impact

- `package.json` (root): new `start` script (`pnpm -r --parallel run start`).
- `apps/api/package.json`: `start` swapped to `node dist/main`; old `start:prod` removed; previous TS-source script preserved as `start:dev`.
- `apps/api/README.md`: one doc line updated to reference `pnpm start` and list `start` in the Scripts section.
- No runtime code, no API contracts, no test files, no migrations, no dependencies added.
- No effect on `pnpm verify`, `pnpm test`, or CI (a new root script does not alter any verify chain).
