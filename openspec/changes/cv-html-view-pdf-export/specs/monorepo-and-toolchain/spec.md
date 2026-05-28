## ADDED Requirements

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
