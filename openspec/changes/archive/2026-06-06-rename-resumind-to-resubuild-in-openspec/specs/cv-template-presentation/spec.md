## MODIFIED Requirements

### Requirement: The system SHALL persist per-CV template presentation settings

The database SHALL store presentation configuration per `(cv_id, template_id)` in `cv_template_presentation.config` (JSONB). Row-level security SHALL restrict access to CVs owned by `auth.uid()`. When no row exists, the API and renderer SHALL use `getDefaultPresentationConfig(templateId)` from `@resubuild/resume-template`.

#### Scenario: Default config when no row

- **WHEN** `GET /cv/:id/template-presentation?template=classic` is called and no row exists
- **THEN** the response SHALL return the default presentation config for `classic`
- **AND** SHALL NOT create a database row until the client PATCHes

#### Scenario: Upsert presentation config

- **WHEN** an authenticated user sends `PATCH /cv/:id/template-presentation?template=modern` with a valid `CvTemplatePresentationConfig` body
- **THEN** the config SHALL be stored for that CV and template id
- **AND** subsequent export HTML for `modern` SHALL reflect the saved section order and field visibility
