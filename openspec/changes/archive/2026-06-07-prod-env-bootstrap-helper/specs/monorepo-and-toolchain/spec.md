## MODIFIED Requirements

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

## ADDED Requirements

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
