## Why

The repository's unit-test runners and CI fan-out both default to high
parallelism, which exhausts memory on constrained environments (large
test suites, CI runners with ~7 GB RAM, and local laptops running the
verify pipeline). Symptoms reported in similar setups include the
GitHub-hosted runners and `apps/api`'s Jest suite OOM-killing under
`--maxWorkers=50%`, Vitest's default worker fan-out in `apps/web` and
`packages/*` duplicating Node heaps, the Lefthook pre-push `pnpm verify`
chain running tests at full Turbo fan-out, and Prettier's file-level
parallelism scanning the entire repository. We need explicit,
deterministic caps on every place parallelism is currently implicit, so
`pnpm verify` and CI run on a predictable memory budget.

## What Changes

- Cap `apps/api` Jest unit-test worker count to a fixed `2` workers and
  force `runInBand` semantics for the `--coverage` run, while leaving
  `apps/api/test:e2e` (already `maxWorkers: 1`) unchanged.
- Set explicit `pool` and `poolOptions` in every Vitest config
  (`apps/web`, `apps/import-agent`, `packages/types`,
  `packages/resume-template`, `packages/import-models`) so each Vitest
  workspace runs with a single fork-based pool sized to `1` worker and
  no per-test file fan-out.
- Document and pin a single-worker biome invocation for the Lefthook
  pre-commit step (the existing `--no-errors-on-unmatched` flag stays;
  the new cap goes alongside it).
- Lower Turborepo's local concurrency via `turbo.json` `tasks.*.concurrency`
  to `2` for the heavy `test` and `build` pipelines so `pnpm verify`
  and `pnpm test` from the root do not schedule every workspace at
  once.
- Lower Prettier's `concurrency` to `2` in the Lefthook pre-commit step
  (CLI flag `--concurrency`) and document the same flag on the
  `format:check` and `format` root scripts.
- Reduce GitHub Actions CI from five simultaneous jobs to two: a
  single **Quality** job (Prettier check + Biome lint + typecheck) and
  a single **Test + build** job (Vitest + Jest unit with coverage,
  followed by `pnpm build`). The `cancel-in-progress` concurrency
  group, dependency cache, and `rharkor/caching-for-turbo` integration
  remain.
- Update the Lefthook pre-push `pnpm verify` env defaults to include
  `JEST_WORKER_ID=1` documentation in the comment so developers
  understand the implicit cap; this is informational and does not
  change behavior.
- Add a short contributor note explaining the memory budget and how to
  raise the caps when running on a larger machine.

No API, schema, or contract changes; this is a developer-tooling change
only.

## Capabilities

### New Capabilities

- `toolchain-parallelism-budget`: documents the default worker /
  concurrency caps for every tool that runs in `pnpm verify`, CI, and
  Lefthook hooks, and how developers can override them on larger
  machines.

### Modified Capabilities

- `monorepo-and-toolchain`: the CI section (5 parallel jobs), the
  "Local verify matches CI checks" scenario, and the e2e worker line
  all need to reflect the new 2-job layout and the new worker caps
  inside Jest, Vitest, Biome, Prettier, and Turborepo.

## Impact

- `.github/workflows/ci.yml` — collapse from 5 jobs to 2.
- `turbo.json` — add `concurrency` caps to the `test`, `build`, and
  `typecheck` tasks.
- `apps/api/jest.config.cjs` + `apps/api/package.json` — pin Jest to
  `2` workers with `runInBand` for unit tests.
- `apps/web/vitest.config.ts`, `apps/import-agent/vitest.config.ts`,
  `packages/types/vitest.config.ts`,
  `packages/resume-template/vitest.config.ts`,
  `packages/import-models/vitest.config.ts` — single-worker fork pool.
- `lefthook.yml` — `--concurrency=2` on the Prettier pre-commit run.
- `package.json` (root) — `format` and `format:check` scripts accept
  the same flag via Prettier's default behavior (no script change
  required; documented).
- `README.md` (root) — short contributor note on raising the caps.
- New `openspec/specs/toolchain-parallelism-budget/spec.md`.
- Delta to `openspec/specs/monorepo-and-toolchain/spec.md`.

No source files, no API contracts, no DB migrations.
