# toolchain-parallelism-budget Specification

## Purpose

TBD - created by archiving change tame-toolchain-parallelism. Update Purpose after archive.

## Requirements

### Requirement: Toolchain tasks SHALL run with a deterministic, low-parallelism worker budget

Every tool that participates in `pnpm verify`, CI, or Lefthook hooks
SHALL be configured to use a small, explicit number of workers so the
combined peak RSS of the verify pipeline fits a ~4 GB per-process
budget and a 2-process concurrency cap. The default cap is `2`
workers (or `1` where the runner is single-process by design, e.g.
Vitest `singleFork` and Jest e2e `runInBand`).

#### Scenario: Default caps produce a bounded verify run

- **WHEN** a developer runs `pnpm verify` on a clean checkout with
  no `RESUME_PARALLELISM` set
- **THEN** Jest in `apps/api` uses `maxWorkers: 2`
  (pinned in `apps/api/jest.config.cjs` and in the `test` script
  of `apps/api/package.json`)
- **AND** every Vitest workspace (`apps/web`, `apps/import-agent`,
  `packages/types`, `packages/resume-template`,
  `packages/import-models`) runs with `pool: 'forks'` and
  `poolOptions.forks.singleFork: true`
- **AND** Turborepo's `typecheck` and `test` pipelines are invoked
  with `--concurrency=2` via the `turbo run` CLI in
  `package.json` scripts (`turbo run typecheck --concurrency=2`,
  `turbo run test --concurrency=2`)
  (note: `turbo.json` does not support a `concurrency` key; only
  the CLI flag does)
- **AND** Prettier runs with its default file-level parallelism
  (Prettier 3.8.3 does not expose a `--concurrency` CLI flag)
- **AND** Lefthook's pre-commit Biome step runs on staged files
  only (no cap needed; Biome peaks at ~250 MB)

#### Scenario: Developer raises the cap on a large workstation

- **WHEN** a developer sets `RESUME_PARALLELISM=8` and runs
  `pnpm verify`
- **THEN** `apps/api` Jest `maxWorkers` would need to be raised
  manually in `apps/api/package.json` or `jest.config.cjs`
  (the env var is a documented escape hatch only; it is not
  automatically read by Jest)
- **AND** every Vitest workspace would need `singleFork: false`
  and `maxForks: 8` set manually in each `vitest.config.ts`
- **AND** the Turborepo `--concurrency` CLI flag would need to be
  overridden manually in `package.json`
- **AND** CI is unaffected (CI always uses the conservative
  default cap)

Note: `singleFork: true` in Vitest requires Vitest 5+; all
workspaces currently ship Vitest 4 and use `@ts-expect-error` to
suppress the type error. Upgrade Vitest to 5 to remove the suppressions.

### Requirement: The repository SHALL document the parallelism override

The repository MUST contain a contributor-facing note (in the root
`README.md`) that explains:

- the default `2`-worker cap and why it exists (memory budget)
- the `RESUME_PARALLELISM` env var override
- which tools honor the override and which do not (Jest and Vitest
  require manual config edits; Turborepo uses the `--concurrency` CLI
  flag; Biome and Prettier do not have equivalent caps)

#### Scenario: Contributor reads the README and finds the override

- **WHEN** they search the root `README.md` for `RESUME_PARALLELISM`
- **THEN** they find a section describing the default cap, the
  override, and which tools respect it
