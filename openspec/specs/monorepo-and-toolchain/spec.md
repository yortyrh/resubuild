# Monorepo and toolchain

## Purpose

Document how the Resumind repository is organized and which tools enforce quality, so agents and humans can navigate the codebase and run the same checks as CI.

## Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import **and job application preparation** consumed by `apps/api`. The repository MUST expose a root-level `pnpm icons:generate` script that runs `node scripts/generate-icons.mjs`, and the root `pnpm build` script MUST chain `pnpm icons:generate && turbo build` so the web icon pipeline always runs to completion before Turborepo orchestrates the workspace builds.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README

#### Scenario: `pnpm build` regenerates web icons before building the web app

- **WHEN** a developer runs `pnpm build` after editing `apps/web/public/icon.svg` or `scripts/generate-icons.config.mjs`
- **THEN** the root `build` script invokes `pnpm icons:generate` first
- **AND** Turborepo then orchestrates the workspace builds with the regenerated PNG/ICO artifacts already in place

### Requirement: Formatting and linting SHALL use Prettier and Biome at the repository root

Prettier (`pnpm format`, `pnpm format:check`) handles formatting, including Markdown and Tailwind class sorting via `prettier-plugin-tailwindcss`. Biome (`pnpm lint`, `pnpm lint:fix`) handles linting and import organization repo-wide via `biome.json`. ESLint MUST NOT be configured in workspace packages.

#### Scenario: Developer fixes lint and format issues locally

- **WHEN** they run `pnpm lint:fix` and `pnpm format` from the repository root
- **THEN** Biome and Prettier apply fixes according to `biome.json` and Prettier configuration without per-package ESLint configs

### Requirement: Git hooks SHALL run staged checks before commit and the full verify pipeline before push

The repository MUST use Lefthook (`lefthook.yml`, installed via `pnpm install` →
`prepare`) to run Biome then Prettier on staged files on **pre-commit**, and `pnpm verify` on **pre-push** with the same placeholder public env vars used in CI. Biome is used as-is (~250 MB peak). The Turborepo tasks invoked by `pnpm verify`
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

### Requirement: Root scripts SHALL support local Supabase setup, E2E execution, and local API debug helpers

The repository root `package.json` MUST expose:

- **`pnpm setup:env`** — writes `apps/api/.env` and `apps/web/.env` from `supabase status` (via `scripts/setup-local-env.sh`).
- **`pnpm setup:env:prod`** — writes a single root-level `.env.prod` consumed by `docker-compose.prod.yml` for the release-1 cloud Supabase target. Delegates to a Node ESM module at `scripts/setup-prod-env.mjs` that reads a JSON manifest via `--from <path>`, prompts interactively when no manifest is supplied, and shares its manifest schema with `.cursor/skills/setup-prod-env/SKILL.md` and the `/opsx:setup-prod-env` cursor command via `scripts/lib/env-prod-schema.mjs`. See `openspec/specs/prod-env-bootstrap-helper/spec.md` for the full contract.
- **`pnpm samples:seed`** — populates local Supabase with fixture accounts, CVs, and media (via `scripts/seed-e2e-fixture.mjs`).
- **`pnpm local:credentials`** — prints developer and E2E login credentials for the current machine.
- **`pnpm test:e2e`** — runs Nest integration tests in `apps/api/test/e2e/` against local Supabase.
- **`pnpm dev:api:debug`** — runs `apps/api` with the Node Inspector enabled on `0.0.0.0:9229` under watch mode, delegating to the workspace `start:debug` script.
- **`pnpm local:devtools`** — opens the `@nestjs/devtools-integration` UI in the developer's default browser once the API is running locally.

Optional: **`pnpm samples:pdf`** generates HTML/PDF previews from sample resumes.

#### Scenario: Developer bootstraps local stack from root

- **WHEN** a developer runs `supabase start`, then `pnpm setup:env`, then `pnpm samples:seed` from the repo root
- **THEN** env files exist for web and api
- **AND** local Supabase contains seeded CV and media rows for both fixture accounts

#### Scenario: E2E script delegates to API workspace

- **WHEN** a developer runs `pnpm test:e2e` from the repo root
- **THEN** Jest executes `apps/api` E2E config with `--runInBand`
- **AND** the command is NOT included in default `pnpm test` / `pnpm verify`

#### Scenario: Developer attaches a debugger to the API from the root

- **WHEN** a developer (or an agent) runs `pnpm dev:api:debug` from the repo root
- **THEN** the API starts in watch mode with the Node Inspector listening on `0.0.0.0:9229`
- **AND** the existing `pnpm dev:api` script is unchanged and does not open the Inspector port

#### Scenario: Developer opens the Nest Devtools UI from the root

- **WHEN** a developer has the API running locally and runs `pnpm local:devtools`
- **THEN** the documented Devtools URL opens in the developer's default browser
- **AND** the module graph and route table are visible there

#### Scenario: Operator runs the prod env generator for the release-1 deploy target

- **WHEN** an operator runs `pnpm setup:env:prod` (or `pnpm setup:env:prod --from prod-secrets.json`) from the repo root
- **THEN** the script writes a single `.env.prod` at the repo root with every variable the `docker-compose.prod.yml` services need
- **AND** the script auto-generates `AI_AGENT_ENCRYPTION_KEY` when the operator does not supply one
- **AND** the script exits non-zero if any required value is the literal `change-me-to-a-long-random-secret` placeholder (unless `--force` is passed)
- **AND** the existing `pnpm setup:env` flow for the local Supabase stack is unchanged

### Requirement: The `apps/api` documentation SHALL document Chromium requirements and the release-1 pass-through

`apps/api` documentation (README or `.env.example`) SHALL document optional `CHROMIUM_EXECUTABLE_PATH` (or equivalent) and note that PDF export requires a Chromium-compatible binary in the API runtime. HTML export SHALL NOT require Chromium. The release-1 prod env generator (`pnpm setup:env:prod`) MUST forward the operator's `CHROMIUM_EXECUTABLE_PATH` value to the api image (via `docker-compose.prod.yml` `environment:` override on top of `env_file: .env.prod`) without forcing the api to set the variable when the operator does not supply one — local development keeps the default of letting Puppeteer download its own browser.

#### Scenario: Local development without Chromium

- **WHEN** Chromium is not installed and a developer calls only the HTML export endpoint
- **THEN** HTML export SHALL succeed
- **AND** PDF export MAY return 503 per `cv-resume-export`

#### Scenario: Release-1 deploy forwards the operator's Chromium path

- **WHEN** an operator runs `pnpm setup:env:prod` and supplies a `CHROMIUM_EXECUTABLE_PATH`
- **THEN** the generated `.env.prod` includes that path
- **AND** `docker-compose.prod.yml` propagates it to the `api` service container
- **AND** the api's Puppeteer launch uses the operator's Chromium instead of the bundled browser
- **AND** when the operator omits `CHROMIUM_EXECUTABLE_PATH`, the generated file does not set it and the api falls back to Puppeteer's bundled browser (which is allowed to fail with 503 per the local-dev scenario above)

### Requirement: The repository README SHALL document the release-1 cloud Supabase + docker compose flow

The root `README.md` MUST contain a \*\*Release 1: cloud Supabase

- docker compose\*\* section that:

* Lists the env vars the operator should pre-gather from the
  Supabase dashboard (Project Settings → API: project URL,
  anon key, service role key; any operator-chosen bucket names;
  the public domains the operator owns for `CORS_ORIGIN`,
  `APP_URL`, `PUBLIC_API_URL`, and `NEXT_PUBLIC_API_URL`).
* Walks the operator through the three steps: (1) collect
  credentials, (2) run `pnpm setup:env:prod` (or drive the
  generator from the `setup-prod-env` SKILL / the
  `/opsx:setup-prod-env` cursor command), (3) bring up the
  stack with
  `docker compose -f docker-compose.prod.yml up`.
* Links to the script, the SKILL, the cursor command, and
  `docker-compose.prod.yml`.
* Explicitly documents the **intentionally minimal** scope (no
  TLS terminator, no reverse proxy, no registry push) and points
  at the follow-on release-1 changes for those concerns.
* Does NOT duplicate the local-development walkthrough in the
  existing **Local development (Supabase CLI)** section; it
  points back to that section for the `supabase link` /
  `supabase db push` step that applies migrations to the cloud
  project.

The Release 1 section MUST live in the same README file as the
local-development section (the root `README.md`) and MUST NOT
be split into a separate document.

#### Scenario: Operator follows the README to first release-1 deploy

- **WHEN** an operator reads the root `README.md` and searches
  for "Release 1" or "production" or "cloud"
- **THEN** they find the **Release 1: cloud Supabase + docker
  compose** section
- **AND** the section names every env var the generator
  prompts for
- **AND** the section names both the deterministic script and
  the LLM-driven flow (SKILL + cursor command)
- **AND** the section explicitly says the compose file is the
  minimum viable prod target and links to the follow-on
  release-1 work for TLS, reverse proxy, and registry push

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

### Requirement: The root scripts SHALL include a Railway deploy preflight wrapper

The repository root `package.json` MUST expose a
`pnpm deploy:railway` script. The script MUST be a thin
wrapper that:

1. Validates that `.env.prod` exists at the repo root and
   contains every required key listed in
   `openspec/specs/prod-env-bootstrap-helper/spec.md` (the
   same set the docker compose target consumes). The
   validation reuses `scripts/lib/env-prod-schema.mjs`'s
   manifest validator — the script does not duplicate the
   validation logic.
2. Exits non-zero with a one-line error when the
   validation fails (naming the missing or invalid keys).
3. On success, prints two lines: one describing the api
   service deploy (`railway up --service api`) and one
   describing the web service deploy
   (`railway up --service web`). The script does NOT
   invoke `railway up` itself — the operator runs the
   commands interactively so they can watch the build log
   and respond to any platform prompts.

The `pnpm deploy:railway` script MUST NOT be included in
`pnpm verify` or `pnpm test` (it is a deploy-time
preflight, not a quality gate).

#### Scenario: Operator runs the preflight before deploying

- **WHEN** an operator runs `pnpm deploy:railway` from
  the repo root with a valid `.env.prod` present
- **THEN** the script prints the two `railway up` commands
  and exits zero
- **AND** does not start a deploy

#### Scenario: Operator runs the preflight without `.env.prod`

- **WHEN** an operator runs `pnpm deploy:railway` from the
  repo root and `.env.prod` is missing or invalid
- **THEN** the script exits non-zero with a one-line error
  naming the missing or invalid keys
- **AND** prints a one-line note pointing at
  `pnpm setup:env:prod --target railway --from
prod-secrets.json` as the fix
- **AND** does not print the `railway up` commands (the
  preflight failed)

### Requirement: The repository SHALL ship Railway deployment config files for both services

The repository MUST contain:

- **`railway.json` at each service's root directory** (one
  per service, two total: `apps/api/railway.json` and
  `apps/web/railway.json`) — JSON config consumed by the
  Railway CLI to determine the build, the start command,
  and the healthcheck for each service. The api service's
  `railway.json` MUST pin the build to its service-local
  `Dockerfile` and the start command to
  `node apps/api/dist/main`. The web service's
  `railway.json` MUST pin the build to its service-local
  `Dockerfile` and the start command to
  `pnpm --filter @resubuild/web start`. Both MUST
  declare a `healthcheckPath` (`/_health` for the api
  service, `/` for the web service).
- **`.railwayignore` at the repo root** — a
  `.dockerignore`-style file at the repo root that excludes
  `node_modules`, `.turbo`, `.next`, `.git`, `coverage`, and
  `**/dist` from the Railway build context.

The deployable shape (Dockerfile + co-located
`railway.json` + repo-root `.railwayignore`) MUST stay in
lockstep with the docker compose target. A rename or move of
`apps/api/Dockerfile` MUST require an update to
`apps/api/railway.json`'s `build.dockerfilePath` (the path
is resolved relative to the **repo root** by Railway — the
Root Directory service setting does not apply to paths
inside `railway.json`). The same applies to the web service
and `apps/web/`. The unit test
`scripts/lib/railway-config.spec.mjs` (a new colocated
test under `scripts/lib/`) MUST verify the shape of both
`railway.json` files (including that `dockerfilePath`
resolves to a real file via repo-root resolution) and MUST
be wired into the root `pnpm test` pipeline.

#### Scenario: CI catches a `railway.json` shape regression

- **WHEN** a developer removes the `healthcheckPath` field
  from one of the `railway.json` files in a PR
- **THEN** the unit test in
  `scripts/lib/railway-config.spec.mjs` fails on the PR's
  CI run
- **AND** the failure message names the file and the
  missing field
- **AND** the developer fixes the regression before the PR
  can be merged

#### Scenario: `.railway/` directory is gitignored

- **WHEN** the Railway CLI writes its local metadata
  (`.railway/config.json`, `.railway/environment.json`,
  etc.) to the repo root after `railway link` runs
- **THEN** `.gitignore` includes a `.railway/` entry so
  the local metadata never enters version control
- **AND** `git status` does not surface the directory after
  a successful `railway link`

### Requirement: The `.gitignore` SHALL exclude Railway and prod env artifacts

The root `.gitignore` MUST list `.railway/`, `.env.prod`,
and `prod-secrets.json` (the latter two are already listed
by the `prod-env-bootstrap-helper` change — they are
re-asserted here so an operator auditing `.gitignore`
sees the full set of deploy-time machine-local artifacts
in one place). The entries MUST be alphabetically
ordered within their group, with a short comment grouping
them with the other machine-local artifacts.

#### Scenario: Operator audits `.gitignore` for deploy-time secrets

- **WHEN** an operator opens `.gitignore` and searches for
  deploy-related entries
- **THEN** the three entries (`.railway/`, `.env.prod`,
  `prod-secrets.json`) are visible in a single contiguous
  block
- **AND** each entry is followed by a short comment
  explaining what it covers
