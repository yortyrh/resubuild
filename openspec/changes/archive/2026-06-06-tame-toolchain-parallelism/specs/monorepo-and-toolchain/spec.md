## MODIFIED Requirements

### Requirement: Continuous integration SHALL run format, lint, typecheck, test, and build in parallel jobs

CI on `main` MUST use GitHub Actions (`.github/workflows/ci.yml`) on
pushes and pull requests. **Two** jobs run in parallel on
`ubuntu-latest` with Node 22:

1. **quality** — runs `pnpm format:check`, then `pnpm lint`, then
   `pnpm typecheck` in sequence. Each command is a separate step in
   the workflow so the failing step is identifiable in the logs.
2. **test-and-build** — runs `pnpm test` (which includes
   `apps/api` Jest with `--coverage` and the Vitest workspaces),
   then `pnpm build`.

The split keeps the peak per-job memory budget under ~3 GB on a
standard `ubuntu-latest` runner (~7 GB RAM). Each job MUST:

1. Check out the repository (required before local composite actions).
2. Run `./.github/actions/setup-monorepo` to install pnpm/Node,
   restore the pnpm store (`setup-node` `cache: pnpm`), and restore
   cached `node_modules` keyed by `pnpm-lock.yaml`.
3. Run `pnpm install --frozen-lockfile` only when
   `node-modules-cache-hit` is not `true`.
4. Run its check commands.

The `test-and-build` job alone MUST run
`./.github/actions/save-node-modules` after install when the cache
was missed, so subsequent workflow runs can restore `node_modules`
without reinstalling in every job.

Both jobs that invoke Turborepo (`quality` for `typecheck` and
`test-and-build` for `test` and `build`) MUST use
`rharkor/caching-for-turbo` for Turbo remote cache.

Workflow-level placeholder env vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`) MUST be set
for web builds and tests.

Concurrency MUST cancel in-progress runs for the same ref
(`concurrency.group` / `cancel-in-progress: true`).

The unit-test step (inside `test-and-build`) MUST run `pnpm test`,
which includes `apps/api` Jest with `--coverage` and a pinned
`maxWorkers: 2` (see
`openspec/specs/toolchain-parallelism-budget/spec.md`). The
`apps/api` workspace SHALL enforce global coverage thresholds of
**90%** for statements, branches, functions, and lines via
`coverageThreshold` in `jest.config.cjs`.

#### Scenario: CI validates a pull request with a warm dependency cache

- **WHEN** a pull request targets `main` and a matching `node_modules`
  cache exists for the current `pnpm-lock.yaml`
- **THEN** the `quality` and `test-and-build` jobs each restore
  cached dependencies, skip `pnpm install`, run their checks, and
  the workflow does not fail solely because install was skipped

#### Scenario: CI validates a pull request after lockfile changes

- **WHEN** a pull request targets `main` and no matching `node_modules`
  cache exists
- **THEN** both jobs run `pnpm install --frozen-lockfile`, the
  `test-and-build` job saves the new cache, and both jobs run their
  checks with CI placeholder env vars
- **AND** the peak per-job memory stays under the documented
  ~3 GB budget

### Requirement: Git hooks SHALL run staged checks before commit and the full verify pipeline before push

Lefthook (`lefthook.yml`, installed via `pnpm install` →
`prepare`) MUST run Biome then Prettier on staged files on
**pre-commit**, and `pnpm verify` on **pre-push** with the same
placeholder public env vars used in CI. Biome is used as-is
(~250 MB peak). The Turborepo tasks invoked by `pnpm verify`
(`typecheck`, `test`) MUST be called with `--concurrency=2`
via the `turbo run` CLI flag so the verify pipeline does not
exhaust memory on large commits (see
`openspec/specs/toolchain-parallelism-budget/spec.md`).

Note: Prettier 3.8.3 does not expose a `--concurrency` CLI flag
in this version; Prettier runs with its default file-level
parallelism. The memory budget is preserved via the
Turborepo `--concurrency=2` cap on the `verify` script's
`typecheck` and `test` steps.

#### Scenario: Developer pushes without running verify manually

- **WHEN** they run `git push`
- **THEN** Lefthook executes `pnpm verify` (Prettier check, Biome,
  typecheck, tests, build) unless hooks are skipped
- **AND** every tool in the verify chain respects the documented
  parallelism cap
