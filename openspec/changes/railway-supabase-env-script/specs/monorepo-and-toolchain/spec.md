# Monorepo and toolchain

## MODIFIED Requirements

### Requirement: Root scripts SHALL support local Supabase setup, E2E execution, and local API debug helpers

The repository root `package.json` MUST expose:

- **`pnpm setup:env`** — writes `apps/api/.env` and `apps/web/.env` from `supabase status` (via `scripts/setup-local-env.sh`).
- **`pnpm samples:seed`** — populates local Supabase with fixture accounts, CVs, and media (via `scripts/seed-e2e-fixture.mjs`).
- **`pnpm local:credentials`** — prints developer and E2E login credentials for the current machine.
- **`pnpm test:e2e`** — runs Nest integration tests in `apps/api/test/e2e/` against local Supabase.
- **`pnpm dev:api:debug`** — runs `apps/api` with the Node Inspector enabled on `0.0.0.0:9229` under watch mode, delegating to the workspace `start:debug` script.
- **`pnpm local:devtools`** — opens the `@nestjs/devtools-integration` UI in the developer's default browser once the API is running locally.
- **`pnpm railway:env`** — runs `scripts/generate-railway-supabase-env.mjs` to print (or write) the env vars a developer must paste into the Railway per-service variable panel when deploying self-hosted Supabase + Resumind to Railway. The script is **not** part of `pnpm verify` and is **not** run in CI; the verify pipeline and CI jobs (format, lint, typecheck, test, build) stay unchanged.

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

#### Scenario: Developer generates Railway env vars from the root

- **WHEN** a developer runs `pnpm railway:env` from the repo root with no flags
- **THEN** the script prints a `dotenv`-formatted env-var set to stdout
- **AND** exits 0
- **AND** the generated env-var set includes `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE`, `PG_META_CRYPTO_KEY`, `AI_AGENT_ENCRYPTION_KEY`, plus the per-service `SUPABASE_URL`, `NEXT_PUBLIC_*`, `CORS_ORIGIN`, `MEDIA_BUCKET`, `MCP_EXPORT_BUCKET` values
- **AND** the command is NOT included in default `pnpm test` / `pnpm verify`
- **AND** the existing `pnpm setup:env` script and local workflow are unchanged

## REMOVED Requirements

_(none)_
