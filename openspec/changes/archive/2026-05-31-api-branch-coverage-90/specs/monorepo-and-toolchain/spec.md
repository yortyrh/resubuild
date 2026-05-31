## MODIFIED Requirements

### Requirement: Continuous integration SHALL run format, lint, typecheck, test, and build in parallel jobs

CI on `main` MUST use GitHub Actions (`.github/workflows/ci.yml`) on pushes and pull requests. Five jobs run in parallel—**Prettier check**, **Biome lint**, **Typecheck**, **Unit tests (coverage)**, and **Build**—each on `ubuntu-latest` with Node 22.

Each job MUST:

1. Check out the repository (required before local composite actions).
2. Run `./.github/actions/setup-monorepo` to install pnpm/Node, restore the pnpm store (`setup-node` `cache: pnpm`), and restore cached `node_modules` keyed by `pnpm-lock.yaml`.
3. Run `pnpm install --frozen-lockfile` only when `node-modules-cache-hit` is not `true`.
4. Run its check command (`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build`).

The **Build** job alone MUST run `./.github/actions/save-node-modules` after install when the cache was missed, so subsequent workflow runs can restore `node_modules` without reinstalling in every job.

Jobs that invoke Turborepo (`typecheck`, `test`, `build`) MUST use `rharkor/caching-for-turbo` for Turbo remote cache.

Workflow-level placeholder env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`) MUST be set for web builds and tests.

Concurrency MUST cancel in-progress runs for the same ref (`concurrency.group` / `cancel-in-progress: true`).

The **Unit tests (coverage)** job MUST run `pnpm test`, which includes `apps/api` Jest with `--coverage`. The `apps/api` workspace SHALL enforce global coverage thresholds of **90%** for statements, branches, functions, and lines via `coverageThreshold` in `jest.config.cjs`.

#### Scenario: CI validates a pull request with a warm dependency cache

- **WHEN** a pull request targets `main` and a matching `node_modules` cache exists for the current `pnpm-lock.yaml`
- **THEN** each parallel job restores cached dependencies, skips `pnpm install`, runs its check, and the workflow does not fail solely because install was skipped

#### Scenario: CI validates a pull request after lockfile changes

- **WHEN** a pull request targets `main` and no matching `node_modules` cache exists
- **THEN** each job runs `pnpm install --frozen-lockfile`, the Build job saves the new cache, and all jobs run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` with CI placeholder env vars

#### Scenario: Local verify matches CI checks

- **WHEN** a developer runs `pnpm verify` at the repository root
- **THEN** the same commands run in sequence as CI (Prettier check, Biome, typecheck, tests, build), modulo CI running them in parallel jobs and CI dependency caching

#### Scenario: API unit tests fail when branch coverage drops below threshold

- **WHEN** `apps/api` Jest coverage for branches falls below 90%
- **THEN** the test command exits non-zero
- **AND** CI **Unit tests (coverage)** job fails
