## ADDED Requirements

### Requirement: The system SHALL provide an extensible resume template registry

A shared workspace package SHALL expose a template registry that maps stable string ids to template implementations. Each template SHALL implement a common interface including `id`, human-readable `label`, `description`, optional `category`, optional CAPD reference page number, and a `render(resume, options)` function returning a complete HTML document. Core export code SHALL resolve templates only through the registry (`getTemplate`, `listTemplates`, `renderResumeHtml`) and SHALL NOT hard-code layout markup for individual templates.

#### Scenario: Registry lists all built-in templates

- **WHEN** `listTemplates()` is invoked
- **THEN** the result SHALL include at least one entry for each CAPD sample page in `sampe-resumes-capd.pdf` (14 layouts) plus the default `mit-classic` template
- **AND** each entry SHALL include a unique `id` and `label`

#### Scenario: Unknown template id

- **WHEN** `getTemplate('nonexistent')` is invoked
- **THEN** the registry SHALL return undefined or throw a typed not-found error consumed by the API as 400

#### Scenario: New template without modifying export service

- **WHEN** a developer adds a new file under `packages/resume-template/src/templates/` and registers it in the package registry barrel
- **THEN** export endpoints SHALL render the new template when its id is requested without editing `CvExportService` control flow

### Requirement: Each CAPD sample layout SHALL be implemented as a registered template

The product SHALL ship template implementations visually aligned with MIT CAPD sample résumés: first-year (tabular and leadership variants), undergraduate (mixed and standard), design, global, masters (icons and skills-first variants), PhD (academic, summary, consulting variants), and alum layouts, as documented in the change design catalog. All templates SHALL consume the same assembled JSON Resume object and SHALL omit empty sections.

#### Scenario: CAPD first-year template renders

- **WHEN** `capd-first-year-leadership` renders a sample resume with work and education
- **THEN** the HTML SHALL include distinct LEADERSHIP or WORK section headings consistent with the CAPD first-year sample (page 2)
- **AND** SHALL NOT throw for schema-valid sample data

#### Scenario: CAPD alum template section order

- **WHEN** `capd-alum` renders a resume with summary, work, and education
- **THEN** the HTML source order SHALL place EXPERIENCE content before EDUCATION content
- **AND** SHALL include a SUMMARY section when basics summary is present

#### Scenario: Section order differs between templates

- **WHEN** the same resume is rendered with `capd-undergraduate-standard` and `capd-undergraduate-mixed`
- **THEN** the relative order of Education and Experience sections MAY differ between the two HTML outputs

### Requirement: Template rendering SHALL remain server-side only

Resume layout HTML for preview, print, and PDF SHALL be produced only in `packages/resume-template` and invoked from `apps/api`. The web application SHALL NOT implement parallel React components that duplicate CAPD layout markup for export or preview.

#### Scenario: Web preview uses API HTML

- **WHEN** a user views `/dashboard/cv/[id]/preview`
- **THEN** the visible resume layout SHALL originate from `GET /cv/:id/export/html` response bytes
- **AND** the web app SHALL NOT call `renderResumeHtml` from client bundles

### Requirement: CVs SHALL persist a selected template id

The database SHALL store `template_id` on each CV row. New CVs SHALL default to `mit-classic`. The API SHALL allow updating `templateId` via authenticated `PATCH /cv/:id`.

#### Scenario: Default template on create

- **WHEN** a CV is created through `POST /cv`
- **THEN** the stored `template_id` SHALL be `mit-classic`

#### Scenario: Update template on CV

- **WHEN** an authenticated user sends `PATCH /cv/:id` with `{ "templateId": "capd-alum" }`
- **THEN** subsequent export without query override SHALL use `capd-alum`

#### Scenario: Invalid template id on patch

- **WHEN** `PATCH /cv/:id` includes an unknown `templateId`
- **THEN** the API SHALL respond with 400

### Requirement: Export routes SHALL accept an optional template query parameter

`GET /cv/:id/export/html` and `GET /cv/:id/export/pdf` SHALL accept optional query parameter `template`. Resolution order SHALL be: explicit query param, then CV stored `template_id`, then `mit-classic`. PDF generation SHALL use the same template resolution as HTML.

#### Scenario: Export with query override

- **WHEN** a CV has stored template `mit-classic` and the client requests `GET /cv/:id/export/html?template=capd-global`
- **THEN** the response HTML SHALL be rendered with the global CAPD template

#### Scenario: Export without query uses stored template

- **WHEN** a CV has `template_id` `capd-masters-icons` and export is requested without `template` query
- **THEN** the HTML SHALL use `capd-masters-icons`

#### Scenario: Invalid template query

- **WHEN** export is requested with `?template=invalid`
- **THEN** the API SHALL respond with 400

### Requirement: The API SHALL expose a template catalog endpoint

Authenticated `GET /cv/export/templates` SHALL return metadata for every registered template (id, label, description, category, capdPage when applicable) without rendering full HTML.

#### Scenario: List templates

- **WHEN** an authenticated client calls `GET /cv/export/templates`
- **THEN** the response SHALL include a `templates` array with at least 15 entries (14 CAPD + mit-classic)
- **AND** each entry SHALL include `id` and `label`

#### Scenario: Unauthenticated catalog request

- **WHEN** the request lacks a bearer token
- **THEN** the response SHALL be 401
