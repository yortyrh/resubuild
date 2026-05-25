# Monorepo and toolchain

## Purpose

Document how the Resumind repository is organized and which tools enforce quality, so agents and humans can navigate the codebase and run the same checks as CI.

## Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README

### Requirement: Formatting and linting SHALL use Prettier and Biome at the repository root

Prettier (`pnpm format`, `pnpm format:check`) handles formatting, including Markdown and Tailwind class sorting via `prettier-plugin-tailwindcss`. Biome (`pnpm lint`, `pnpm lint:fix`) handles linting and import organization repo-wide via `biome.json`. ESLint MUST NOT be configured in workspace packages.

#### Scenario: Developer fixes lint and format issues locally

- **WHEN** they run `pnpm lint:fix` and `pnpm format` from the repository root
- **THEN** Biome and Prettier apply fixes according to `biome.json` and Prettier configuration without per-package ESLint configs

### Requirement: Git hooks SHALL run staged checks before commit and the full verify pipeline before push

Lefthook (`lefthook.yml`, installed via `pnpm install` → `prepare`) MUST run Biome then Prettier on staged files on **pre-commit**, and `pnpm verify` on **pre-push** with the same placeholder public env vars used in CI.

#### Scenario: Developer pushes without running verify manually

- **WHEN** they run `git push`
- **THEN** Lefthook executes `pnpm verify` (Prettier check, Biome, typecheck, tests, build) unless hooks are skipped

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

#### Scenario: CI validates a pull request with a warm dependency cache

- **WHEN** a pull request targets `main` and a matching `node_modules` cache exists for the current `pnpm-lock.yaml`
- **THEN** each parallel job restores cached dependencies, skips `pnpm install`, runs its check, and the workflow does not fail solely because install was skipped

#### Scenario: CI validates a pull request after lockfile changes

- **WHEN** a pull request targets `main` and no matching `node_modules` cache exists
- **THEN** each job runs `pnpm install --frozen-lockfile`, the Build job saves the new cache, and all jobs run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` with CI placeholder env vars

#### Scenario: Local verify matches CI checks

- **WHEN** a developer runs `pnpm verify` at the repository root
- **THEN** the same commands run in sequence as CI (Prettier check, Biome, typecheck, tests, build), modulo CI running them in parallel jobs and CI dependency caching
