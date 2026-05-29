## MODIFIED Requirements

### Requirement: Resume template rendering SHALL live in a shared workspace package

The monorepo SHALL include a workspace package (e.g. `packages/resume-template`) consumed by `apps/api` and root sample PDF scripts. The package SHALL export a **template registry**, the default `mit-classic` renderer, all CAPD template modules, and shared Markdown field helpers used by export. The web app MAY import **types only** from this package but SHALL NOT bundle template renderers for preview layout. Root `pnpm samples:pdf` SHALL use this package and SHALL support generating output per template id.

#### Scenario: Sample PDF script uses shared package

- **WHEN** a developer runs `pnpm samples:pdf`
- **THEN** generated HTML/PDF SHALL be produced via the shared resume-template package

#### Scenario: Sample script can target a template

- **WHEN** a developer runs sample PDF generation with a specific template id flag or env
- **THEN** output SHALL use that registered template's layout

## ADDED Requirements

### Requirement: Template authoring SHALL follow a documented extension contract

Package documentation SHALL describe how to add a template: implement `ResumeTemplate`, register in `registry.ts`, add unit test with sample resume, and optionally reference a CAPD PDF page. Template ids SHALL be kebab-case and stable once shipped.

#### Scenario: Contributor adds template per contract

- **WHEN** a new template module is added following the documented steps
- **THEN** it SHALL appear in `listTemplates()` without modifying NestJS export controller code
