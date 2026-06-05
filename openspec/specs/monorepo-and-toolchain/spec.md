# Monorepo and toolchain

## Purpose

Document how the Resumind repository is organized and which tools enforce quality, so agents and humans can navigate the codebase and run the same checks as CI.

## Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import **and job application preparation** consumed by `apps/api`.

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

### Requirement: Root scripts SHALL support local Supabase setup and E2E execution

The repository root `package.json` MUST expose:

- **`pnpm setup:env`** — writes `apps/api/.env` and `apps/web/.env` from `supabase status` (via `scripts/setup-local-env.sh`).
- **`pnpm samples:seed`** — populates local Supabase with fixture accounts, CVs, and media (via `scripts/seed-e2e-fixture.mjs`).
- **`pnpm local:credentials`** — prints developer and E2E login credentials for the current machine.
- **`pnpm test:e2e`** — runs Nest integration tests in `apps/api/test/e2e/` against local Supabase.

Optional: **`pnpm samples:pdf`** generates HTML/PDF previews from sample resumes.

#### Scenario: Developer bootstraps local stack from root

- **WHEN** a developer runs `supabase start`, then `pnpm setup:env`, then `pnpm samples:seed` from the repo root
- **THEN** env files exist for web and api
- **AND** local Supabase contains seeded CV and media rows for both fixture accounts

#### Scenario: E2E script delegates to API workspace

- **WHEN** a developer runs `pnpm test:e2e` from the repo root
- **THEN** Jest executes `apps/api` E2E config with `--runInBand`
- **AND** the command is NOT included in default `pnpm test` / `pnpm verify`

### Requirement: Generated local artifacts SHALL be gitignored

The repository MUST gitignore machine-local outputs:

- `.samples/e2e-fixture.state.json` (E2E ids written by seed)
- `.samples/local-credentials.json` (per-machine passwords)

Committed fixture data under `.samples/` (JSON resumes, media, `e2e-fixture.json`) MUST remain tracked.

#### Scenario: Fresh clone does not contain secrets

- **WHEN** a developer clones the repository
- **THEN** `.samples/local-credentials.json` and `.samples/e2e-fixture.state.json` are absent
- **AND** first `pnpm samples:seed` creates both files locally

### Requirement: The monorepo SHALL include an import agent workspace

The repository SHALL add `apps/import-agent` to `pnpm-workspace.yaml` with scripts for `typecheck`, `test`, and `build` (or `test` only if library-style) included in Turborepo pipelines. The repository SHALL add `packages/import-models` containing a pinned Mastra provider/model catalog and an optional sync script (e.g. `pnpm import-models:sync`) sourced from Mastra models.dev metadata. Root documentation SHALL list server env vars: `AI_AGENT_ENCRYPTION_KEY` (legacy alias `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`), `PDF_IMPORT_MAX_BYTES`, and `PDF_IMPORT_ENABLED`. Per-user LLM and Tavily/Firecrawl API keys are configured via the product UI, not committed env files.

#### Scenario: Root verify includes import-agent tests

- **WHEN** a developer runs `pnpm verify` at the repository root
- **THEN** Turborepo SHALL execute `apps/import-agent` test (and typecheck/build when defined) alongside other workspace packages

#### Scenario: Setup script documents UI-first keys

- **WHEN** a developer runs `pnpm setup:env` interactively or with `--non-interactive`
- **THEN** the generated `apps/api/.env` SHALL include `AI_AGENT_ENCRYPTION_KEY`
- **AND** SHALL NOT require or prompt for server-wide `SEARCH_API_KEY`

### Requirement: Resume template rendering SHALL live in a shared workspace package

The monorepo SHALL include a workspace package (e.g. `packages/resume-template`) consumed by `apps/api`, `apps/web` (if needed for types only), and root sample PDF scripts. The package SHALL export the MIT-format HTML renderer and Markdown field helper used by export. Root `pnpm samples:pdf` SHALL use this package instead of a scripts-only duplicate and SHALL produce PDFs consistent with the MIT layout spec (experience before education).

#### Scenario: Sample PDF script uses shared package

- **WHEN** a developer runs `pnpm samples:pdf`
- **THEN** generated HTML/PDF SHALL be produced via the shared resume-template package

### Requirement: API PDF export SHALL document Chromium requirements

`apps/api` documentation (README or `.env.example`) SHALL document optional `CHROMIUM_EXECUTABLE_PATH` (or equivalent) and note that PDF export requires a Chromium-compatible binary in the API runtime. HTML export SHALL NOT require Chromium.

#### Scenario: Local development without Chromium

- **WHEN** Chromium is not installed and a developer calls only the HTML export endpoint
- **THEN** HTML export SHALL succeed
- **AND** PDF export MAY return 503 per `cv-resume-export`

### Requirement: The `apps/api` watch-mode build SHALL preserve its incremental cache

`apps/api/nest-cli.json` SHALL set `compilerOptions.deleteOutDir = false`
so the watch-mode build (`nest start --watch`) does not delete
`apps/api/dist/` or the `tsconfig.build.tsbuildinfo` cache file on every
restart. The production build (`pnpm build`, which is run via Turborepo
and is not the watch-mode command) is unaffected; it deletes the output
directory explicitly via its own pipeline. `apps/api/tsconfig.json` SHALL
set `compilerOptions.rootDir = "./src"` so the build emits a stable
output layout (`dist/main.js` always resolves to `src/main.ts`) and the
`tsbuildinfo` cache file is no longer rewritten on every restart.

#### Scenario: Developer runs `pnpm dev:api` after a previous session

- **WHEN** the developer runs `pnpm dev:api` (which invokes `nest start --watch`) in `apps/api`
- **THEN** the previous `apps/api/dist/` is preserved between restarts
- **AND** the `tsconfig.build.tsbuildinfo` cache file is reused, so the first compile after a source edit is faster than a clean rebuild
- **AND** the production build (`pnpm build`) is not affected (it deletes `dist/` explicitly)

#### Scenario: Source edit triggers an incremental rebuild

- **WHEN** the developer edits a `.ts` file under `apps/api/src/` while the watch-mode server is running
- **THEN** the server rebuilds only the changed module and its dependents
- **AND** the `tsbuildinfo` cache file is updated in place (not deleted and recreated)
