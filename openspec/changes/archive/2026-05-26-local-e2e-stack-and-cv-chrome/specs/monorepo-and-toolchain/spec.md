## ADDED Requirements

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
