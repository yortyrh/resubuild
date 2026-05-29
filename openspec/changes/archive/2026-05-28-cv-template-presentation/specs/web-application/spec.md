## ADDED Requirements

### Requirement: The web app SHALL document preview and card surface tokens

`apps/web/DESIGN.md` SHALL describe `surface-soft` and related tokens used by CV preview chrome and the template layout panel. Preview and dashboard CV cards SHALL use these tokens instead of ad hoc `bg-white` / border combinations for consistency.

#### Scenario: Preview wrapper uses surface-soft

- **WHEN** a user views the CV preview page
- **THEN** the iframe container SHALL use the `surface-soft` utility class documented in `DESIGN.md`

### Requirement: The web API client SHALL support template presentation

`apps/web/src/lib/api.ts` SHALL expose `getCvTemplatePresentation` and `updateCvTemplatePresentation` with optional `template` query parameter, colocated with tests.

#### Scenario: Client fetches presentation before panel render

- **WHEN** the preview page mounts with a selected template
- **THEN** the client SHALL call the presentation GET endpoint before showing saved toggles in the layout panel
