## MODIFIED Requirements

### Requirement: Root scripts SHALL support local Supabase setup, E2E execution, and local API debug helpers

The repository root `package.json` MUST expose:

- **`pnpm setup:env`** — writes `apps/api/.env` and `apps/web/.env` from `supabase status` (via `scripts/setup-local-env.sh`).
- **`pnpm samples:seed`** — populates local Supabase with fixture accounts, CVs, and media (via `scripts/seed-e2e-fixture.mjs`).
- **`pnpm local:credentials`** — prints developer and E2E login credentials for the current machine.
- **`pnpm test:e2e`** — runs Nest integration tests in `apps/api/test/e2e/` against local Supabase.
- **`pnpm dev:api:debug`** — runs `apps/api` with the Node inspector enabled on `0.0.0.0:9229` under watch mode, delegating to the workspace `start:debug` script.
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
- **THEN** the API starts in watch mode with the Node inspector listening on `0.0.0.0:9229`
- **AND** the existing `pnpm dev:api` script is unchanged and does not open the inspector port

#### Scenario: Developer opens the Nest Devtools UI from the root

- **WHEN** a developer has the API running locally and runs `pnpm local:devtools`
- **THEN** the documented Devtools URL opens in the developer's default browser
- **AND** the module graph and route table are visible there
