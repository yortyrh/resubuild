## Context

The monorepo already has `pnpm dev` (Turborepo-orchestrated watch mode across all workspaces) and `pnpm build` (`pnpm icons:generate && turbo build`). Before this change, there was no `pnpm start` at the root, and `apps/api`'s `start` script was `nest start` (TS sources). To boot the full stack from built artifacts, a developer had to run two terminal panes: `pnpm --filter @resubuild/web start` and `pnpm --filter @resubuild/api start:prod`. That works but is undocumented and inconsistent with how the release-1 Railway target (per `openspec/specs/monorepo-and-toolchain/spec.md`) starts the same two services.

This change makes the local-built-sources boot path a single documented command and aligns `apps/api`'s `start` script with what Railway runs in production.

## Goals / Non-Goals

**Goals:**

- Provide a single root command (`pnpm start`) that boots `apps/web` and `apps/api` from their built artifacts in parallel.
- Have `apps/api`'s `start` script invoke the compiled `dist/main` so the local-built boot path matches the production boot path (`node apps/api/dist/main` per `apps/api/railway.json`).
- Preserve the existing TS-source API boot as `start:dev` for any tooling that depends on it.

**Non-Goals:**

- Replacing `pnpm dev` (watch mode) or altering its behavior.
- Adding process supervision, restart-on-crash, or daemonization. `pnpm start` is a foreground, single-shot launch — close the terminal to stop both services.
- Changing CI, verify pipeline, or test commands.
- Touching any runtime code in `apps/api/src` or `apps/web/src`.

## Decisions

- **Use `pnpm -r --parallel run start` instead of adding `concurrently`.** pnpm's built-in workspace filter (`-r`) automatically skips packages that don't declare a `start` script, so `apps/import-agent`, `packages/*`, etc. are silently excluded — exactly the same packages that participate in `pnpm dev`. No new dependency is added. Alternatives considered: `turbo run start` (would require a new `start` task in `turbo.json` and an extra layer of caching/orchestration for what is a one-off production start) and `concurrently` (extra dep + manual package list to maintain).

- **Reuse each workspace's existing `start` script instead of defining a new one.** `apps/web` already has `"start": "next start"` (Next.js's built-in command, runs from `.next/`). `apps/api` is updated to `"start": "node dist/main"`. This makes the root `pnpm start` invocation identical to what Railway runs per `apps/web/railway.json` and `apps/api/railway.json`.

- **Rename the TS-source API script to `start:dev` rather than deleting it.** `nest start` (without `--watch`) is occasionally useful for a one-shot, non-watch boot from TS sources, and removing it would be a breaking change for any developer muscle memory or docs that reference it. The previously-named `start:prod` is removed as a duplicate of the new `start` semantics.

- **Do not add `start` as a Turborepo task.** `turbo.json` would need an entry to orchestrate across workspaces, but `pnpm -r --parallel` already gives us the parallel-fan-out behavior we need, and the root script does not benefit from Turbo caching (no inputs/outputs).

## Risks / Trade-offs

- [Risk] `apps/api`'s `start` script no longer compiles on demand — running `pnpm start` without a prior `pnpm build` fails with "Cannot find module dist/main". → Mitigation: document the implicit `pnpm build` prerequisite; the diff already updates `apps/api/README.md` to list `pnpm start` in the Scripts section so the command surfaces there. Future iteration could chain `pnpm build` automatically, but that's a separate UX decision.
- [Risk] pnpm's parallel runner prefixes each workspace's output with its package name, but interleaves them; logs may look noisy. → Mitigation: same behavior as `pnpm dev`; developers already accept this trade-off.
- [Risk] `start:dev` is a new script name. Any external docs or scripts referencing `pnpm start:prod` will break. → Mitigation: a `Grep` for `start:prod` shows only `apps/api/README.md` (already updated) and archived OpenSpec changes (`openspec/changes/archive/...`, which are historical and must not be rewritten). No active docs or scripts outside the README reference the old name.
- [Trade-off] `pnpm start` is foreground-only; closing the terminal stops both services. Acceptable for a local-dev convenience command that mirrors Railway's process model, and consistent with `pnpm dev`'s behavior.

## Migration Plan

No deploy steps required. The change is a developer-tooling addition only:

1. Existing `pnpm dev` users: no change in behavior.
2. Developers who already used `pnpm --filter @resubuild/api start:prod` + `pnpm --filter @resubuild/web start`: can now use `pnpm start` from the repo root (after `pnpm build`).
3. Developers who used `pnpm --filter @resubuild/api start` (TS-source boot) without watch: switch to `pnpm --filter @resubuild/api start:dev` to preserve the same behavior.
4. Rollback: revert the commit. No DB / env / deploy state is touched.

## Open Questions

None.
