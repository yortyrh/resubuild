## ADDED Requirements

### Requirement: The system SHALL persist per-CV template presentation settings

The database SHALL store presentation configuration per `(cv_id, template_id)` in `cv_template_presentation.config` (JSONB). Row-level security SHALL restrict access to CVs owned by `auth.uid()`. When no row exists, the API and renderer SHALL use `getDefaultPresentationConfig(templateId)` from `@resumind/resume-template`.

#### Scenario: Default config when no row

- **WHEN** `GET /cv/:id/template-presentation?template=classic` is called and no row exists
- **THEN** the response SHALL return the default presentation config for `classic`
- **AND** SHALL NOT create a database row until the client PATCHes

#### Scenario: Upsert presentation config

- **WHEN** an authenticated user sends `PATCH /cv/:id/template-presentation?template=modern` with a valid `CvTemplatePresentationConfig` body
- **THEN** the config SHALL be stored for that CV and template id
- **AND** subsequent export HTML for `modern` SHALL reflect the saved section order and field visibility

### Requirement: Presentation config SHALL control export rendering

`renderResumeHtml` SHALL accept optional `presentationConfig` in render options. The renderer SHALL merge defaults, stored config, and call `visibleSectionOrder` before emitting section HTML. Hidden sections SHALL be omitted; custom `sectionLabels` SHALL appear in headings.

#### Scenario: Hidden section omitted

- **WHEN** presentation config lists `projects` in `hiddenSections`
- **THEN** export HTML SHALL NOT contain a Projects section even if resume data includes projects

#### Scenario: Custom section order

- **WHEN** presentation config sets `sectionOrder` with education before work
- **THEN** export HTML section sequence SHALL match that order for visible sections

### Requirement: Presentation config SHALL validate on write

The API SHALL reject PATCH bodies that are not valid `CvTemplatePresentationConfig` shapes (unknown section keys, invalid field keys). Invalid template query parameters SHALL return 400.

#### Scenario: Unknown template on presentation endpoint

- **WHEN** `PATCH /cv/:id/template-presentation?template=unknown-id` is sent
- **THEN** the API SHALL respond with 400
