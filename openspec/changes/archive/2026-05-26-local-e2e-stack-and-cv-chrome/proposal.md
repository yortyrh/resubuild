## Why

Resumind lacked a reproducible local Supabase workflow and integration-test harness: developers had to configure cloud projects manually, and API contracts (auth, CV REST, media) were only covered by unit tests with mocks. In parallel, the CV editor chrome still placed the section-nav toggle inside the sidebar (away from breadcrumbs) and Wysimark toolbar CSS leaked rounded corners and inconsistent heights. This change retroactively documents and lands the local E2E stack plus targeted editor/dashboard polish already implemented in the working tree.

## What Changes

- **Local Supabase dev workflow**: `pnpm setup:env` writes `apps/api/.env` and `apps/web/.env` from `supabase status`; README reordered to local-first setup.
- **Sample fixture & seed**: Committed `.samples/e2e-fixture.json` with 10 JSON Resume files, 20 profile images, developer + E2E accounts; `pnpm samples:seed` seeds Auth, Postgres, and Storage directly (no Nest process); per-machine passwords in gitignored `.samples/local-credentials.json`; `pnpm local:credentials` reprints them.
- **E2E test suite**: `apps/api/test/e2e/` boots Nest in-process via Supertest against real local Supabase; `pnpm test:e2e` (11 tests: auth, CV REST, media); global setup fails fast without seed state.
- **OpenSpec E2E contract**: New `e2e-testing` capability spec; `openspec/config.yaml` rules require E2E test impact sections in change tasks.
- **CV editor chrome**: Section-nav collapse toggle moves to the breadcrumb row (`CvSectionNavToggle` via React context); section body wrapped in `CvSectionContent` with consistent left padding; Wysimark shell CSS uses direct-child selectors and square corners.
- **Dashboard layout**: Page header (`My CVs`, New CV button) moves into `CvList` so empty and populated states share the same chrome.

## Capabilities

### New Capabilities

- `e2e-testing`: Local Supabase fixture, seed script, in-process Nest E2E suite, and OpenSpec task impact conventions.

### Modified Capabilities

- `monorepo-and-toolchain`: Root scripts for local env setup, sample seeding, credentials display, and E2E test execution.
- `cv-editor-ui`: Section-nav toggle placement in breadcrumb row; section content padding; Wysimark editor shell styling.
- `web-application`: Dashboard CV list owns page heading and primary actions.

## Impact

- **Root**: `package.json` scripts (`setup:env`, `samples:seed`, `samples:pdf`, `local:credentials`, `test:e2e`); devDeps `@supabase/supabase-js`, `puppeteer`; `.env.example`, `.gitignore`, `README.md`.
- **scripts/**: `setup-local-env.sh`, `seed-e2e-fixture.mjs`, `show-local-credentials.mjs`, `generate-sample-pdfs.mjs`, shared libs.
- **`.samples/`**: fixture JSON, resume JSON files, media assets (PDFs optional via `samples:pdf`).
- **apps/api**: `test/e2e/*`, `test:e2e` script in `package.json`.
- **apps/web**: `cv-section-layout.tsx`, `cv-section-content.tsx`, `cv-sections.tsx`, `cv-list.tsx`, `dashboard/page.tsx`, `globals.css`, colocated tests.
- **supabase/config.toml**: local stack tuning.
- **openspec**: new `e2e-testing` spec, updated `config.yaml`.
- **CI**: unchanged — E2E remains local-only, not in `pnpm verify`.
