## Context

resubuild is a pnpm + Turborepo monorepo with two real test runners:
Jest 30 in `apps/api` and Vitest 4 in `apps/web`, `apps/import-agent`,
and the three `packages/*` workspaces. Today every test entry point
fans out to the host's default worker count:

- `apps/api/package.json` runs `jest --coverage` with no worker cap
  (Jest 30 defaults to `--maxWorkers=50%` of CPU cores, with no upper
  bound on multi-core CI hosts).
- Each Vitest config currently sets `pool: 'forks'` only in
  `apps/web`; the package configs default to Vitest's `pool: 'threads'`
  with the same implicit fan-out. Coverage reporters write per-worker
  temp directories that grow with worker count.
- The root `pnpm verify` script chains five Turborepo tasks
  sequentially, but Turborepo's `turbo.json` declares no
  `tasks.*.concurrency` cap, so `pnpm test` and `pnpm build` schedule
  every workspace at once when Turbo is not blocked by upstream
  `dependsOn`.
- CI (`/.github/workflows/ci.yml`) fans out into five concurrent
  GitHub-hosted runners, each restoring `node_modules` and running
  one tool. On the standard `ubuntu-latest` image (7 GB RAM) two of
  those jobs (Test + Build) reliably OOM when the test suite grows.
- Lefthook's pre-commit step invokes Biome and Prettier on staged
  files only, but Prettier's default is to scan every file in
  parallel; the explicit `--concurrency` flag is not set.
- Prettier and Biome themselves do not bound file-level parallelism
  in the root `pnpm format:check` / `pnpm lint` scripts.

The desired end state: every tool that runs in `pnpm verify`, CI, or
Lefthook has an explicit, small, deterministic worker cap that fits a
~4 GB per-process budget. The caps must be overridable for developers
on larger machines (a documented `RESUME_PARALLELISM=4` env var
adjusts all caps at once).

## Goals / Non-Goals

**Goals**

- Define a single, documented memory budget for the verify pipeline
  (≈4 GB peak RSS per process, ≈2 processes max in parallel).
- Replace every implicit worker fan-out with an explicit cap of
  `2` workers (or `1` where the runner is single-threaded by design,
  e.g. Vitest forks pool and Jest e2e).
- Reduce CI from 5 to 2 jobs so the GitHub-hosted runner does not
  exhaust memory on a cold cache.
- Add a documented escape hatch for developers on machines with more
  RAM (e.g. 16-core workstations) to raise the caps via a single env
  var.
- Keep the existing developer workflow (`pnpm verify`, Lefthook
  pre-commit, Lefthook pre-push) intact; the only observable
  difference is the number of workers and CI jobs.

**Non-Goals**

- Distributing tests across machines (no sharding).
- Speeding up the test suite. The change trades peak memory for
  wall-clock time on small machines; the goal is _predictability_, not
  _speed_.
- Changing test coverage thresholds or coverage tooling.
- Restructuring Turborepo pipelines or removing `dependsOn` edges.
- Removing `cancel-in-progress` from CI; that is preserved.

## Decisions

### Decision: Cap Jest workers at 2 in `apps/api`, keep `--runInBand` only for e2e

`apps/api/jest.config.cjs` adds `maxWorkers: 2` and `testTimeout` is
unchanged. The `test` script in `apps/api/package.json` becomes
`jest --coverage --maxWorkers=2`. Rationale: Jest 30's `runInBand`
flag forces a single process and breaks watch mode; with
`maxWorkers: 2` we get roughly half the per-process memory of the
implicit default and keep parallelism for I/O. `apps/api/test:e2e`
already sets `maxWorkers: 1` and `--runInBand`; we leave it alone.
**Alternatives considered**: `runInBand` everywhere (rejected —
doubles wall-clock time for unit tests on a 4-core box);
`--workerIdleMemoryLimit=512MB` (rejected — Jest 30 supports it but
the failing test files don't have predictable memory profiles, and
it makes failures harder to reproduce).

### Decision: Vitest workspaces all use `pool: 'forks'`, `poolOptions.forks.singleFork: true`

Each `vitest.config.ts` sets:

```ts
test: {
  pool: 'forks',
  poolOptions: { forks: { singleFork: true } },
  // …existing fields preserved
}
```

`singleFork: true` collapses the per-file worker fan-out to a single
fork, which matches the memory budget. We keep `pool: 'forks'`
rather than `'threads'` because several of our packages
(`@resubuild/import-agent`, `@mastra/core` transitively) ship ESM
modules that Vitest's worker threads cannot load without extra
`vmThreads` shims, and the `forks` pool already handles that.
`apps/web` already uses `pool: 'forks'`, so this is a unification
rather than a change in behavior for that workspace.
**Alternatives considered**: `pool: 'threads'` + `maxThreads: 2`
(rejected — fails on the ESM packages listed above); per-test-file
`isolate: true` (rejected — does not bound the worker count).

### Decision: Pin Turborepo `tasks.*.concurrency = 2` in `turbo.json`

We add `concurrency: 2` to `test`, `build`, and `typecheck`. This
caps the number of workspaces Turbo runs in parallel for those
pipelines, on top of any `dependsOn` ordering. Turborepo's
`--concurrency` CLI flag is left untouched, so developers who run
`turbo build --concurrency=8` on a workstation still get the override.
**Alternatives considered**: `concurrency: 1` (rejected — too slow
for `apps/web` typecheck + `apps/api` build overlap); leaving
concurrency implicit and adding `--concurrency=2` to the root
`pnpm verify` script (rejected — Turborepo's behavior is
deterministic only when the cap is in the config file, since the CLI
flag is shadowed by the config key in Turbo 2.x).

### Decision: Prettier `pnpm format` and `format:check` get `--concurrency=2`

The root `package.json` scripts change from
`prettier --write .` to `prettier --write --concurrency=2 .` (and
`--check --concurrency=2` for the check variant). Lefthook's
pre-commit Prettier command also gets `--concurrency=2`. Prettier 3
respects the flag for file-level parallelism.
**Alternatives considered**: `.prettierrc` setting (rejected —
Prettier 3 does not expose concurrency in `.prettierrc`; the CLI
flag is the only knob); a `prettier.config.cjs` `overrideConfig`
(rejected — over-engineered for a one-flag change).

### Decision: CI collapses from 5 jobs to 2

The new layout:

1. **quality** — `pnpm format:check && pnpm lint && pnpm typecheck`,
   on `ubuntu-latest`, with the existing `setup-monorepo` and
   `cache-for-turbo` steps.
2. **test-and-build** — `pnpm test && pnpm build`, on `ubuntu-latest`,
   with the same setup, plus `save-node-modules` after install when
   the cache misses.

Both jobs run in parallel and are part of the existing
`concurrency.cancel-in-progress` group. Rationale: a single 7 GB
runner that runs `format:check + lint + typecheck` peaks at
~1.5 GB; the same runner running `test + build` peaks at ~3 GB. Two
jobs give us the same wall-clock latency as the original five
(both are bound by the longest single step) at half the
concurrent-memory footprint. We lose the per-tool signal in the GitHub
UI, but each step still produces a distinct exit code in the logs.
**Alternatives considered**: keeping 5 jobs but capping each
runner to ~2 GB via `actions/setup-node` resource limits
(rejected — GitHub-hosted runners are sized in whole CPU/RAM units
and the cap is not enforceable); 3 jobs (split test and build
into separate jobs) (rejected — `pnpm test` and `pnpm build` share
the `node_modules` cache, and a third runner doubles install time
on a cold cache).

### Decision: Single `RESUME_PARALLELISM` env var as the override

Developers on larger machines can set `RESUME_PARALLELISM=8` (or any
positive integer) before running `pnpm verify`, and every tool that
reads it scales its worker cap accordingly:

- Jest `maxWorkers` = `RESUME_PARALLELISM` (or 2 if unset).
- Vitest `poolOptions.forks.singleFork` becomes `false` and
  `maxForks` = `RESUME_PARALLELISM`.
- Turborepo `tasks.*.concurrency` = `RESUME_PARALLELISM`.
- Prettier `--concurrency` = `RESUME_PARALLELISM`.
- Biome's CLI does not take a concurrency flag; it stays at the
  default (Biome is already ~250 MB peak).
- Lefthook pre-push `pnpm verify` does not need a flag change — the
  env var propagates through `pnpm exec` to every tool.

The env var is documented in the new README section and in the
`toolchain-parallelism-budget` spec. There is no equivalent for
GitHub Actions; CI always uses the conservative caps.
**Alternatives considered**: per-tool env vars
(`JEST_MAX_WORKERS`, `VITEST_POOL_SIZE`, etc.) (rejected — five env
vars for one knob is too much surface area); a `toolchain.config.cjs`
(rejected — adding a config file for a single integer is overkill).

## Risks / Trade-offs

- **[Slower wall-clock on small machines]** Two workers is roughly
  half the default fan-out on a 4-core box, so `pnpm verify` will
  take longer in CPU-bound sections. → Document expected wall-clock
  in the new README section so developers know what to expect; the
  `RESUME_PARALLELISM` override covers workstations.
- **[Vitest `singleFork: true` disables file-level isolation]** A
  test that leaks globals will affect every file in the run. → We
  already have `clearMocks: true` in `apps/web` and rely on Vitest's
  per-file module isolation, so global leakage is rare; the
  `toolchain-parallelism-budget` spec documents this trade-off.
- **[CI 2-job layout loses per-tool signal]** The GitHub UI will show
  `quality` and `test-and-build`, not the individual checks. → The
  workflow logs still print every command, and `pnpm verify` produces
  the same exit codes. A future change can split them back out if
  GitHub's hosted runners grow RAM.
- \*\*[Prettier `--concurrency=2` is too aggressive for repos with
  > 10k files]\*\* Our monorepo has ~2k tracked files; the cap is
  > generous. → Documented in the spec; the override covers larger
  > repositories.
- **[Turborepo `concurrency: 2` may surprise contributors who expect
  the default `Infinity` cap]** → Document the cap in
  `turbo.json` (a `// memory-budget: 2` comment) and in the new spec.

## Migration Plan

This change is non-breaking for end users. Rollout steps:

1. Merge the spec deltas in this change (no deploy).
2. Land the config-file changes in a single PR (the spec lists the
   exact files).
3. Watch the first CI run for OOM regressions; if a single job still
   peaks above 4 GB, raise the cap from 2 to 3 in a follow-up patch.
4. Communicate the `RESUME_PARALLELISM` env var in the next
   contributor-facing release notes.

Rollback: each change is independently revertable — `turbo.json`'s
`concurrency` key, each `vitest.config.ts` field, and the
`package.json` Jest script are all isolated edits. CI rollback is a
single commit reverting the workflow to the 5-job layout.

## Open Questions

- Do we want a `pnpm verify:fast` alias that uses
  `RESUME_PARALLELISM=8` for local development on workstations?
  → Defer to a follow-up; not in scope for this change.
- Should the `apps/web` Vitest config keep `jsdom` (it currently does)
  when moving to `singleFork: true`? → Yes; `jsdom` is per-file, not
  per-worker, so it is unaffected.
- Is there a Turborepo remote-cache budget concern with running
  fewer parallel jobs locally? → No; remote cache is write-only per
  task hash, and the cap is on local scheduling only.
