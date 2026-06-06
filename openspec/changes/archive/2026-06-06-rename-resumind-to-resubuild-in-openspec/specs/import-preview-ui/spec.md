## MODIFIED Requirements

### Requirement: Import flows SHALL expose a shared visual preview dialog

When an import form has a valid `ImportSourcePreview` (schema-valid prepared JSON Resume), the client SHALL offer a **Preview** control that opens a modal dialog. The dialog SHALL render the résumé using `@resubuild/resume-template` `renderResumeHtml` with a template id selected from `listCvTemplates()`. The dialog SHALL include template selection only and SHALL NOT include layout/section toggles, print, download PDF, or template persistence. The dialog SHALL be dismissible without triggering import or CV creation.

#### Scenario: User opens preview from JSON import

- **WHEN** a signed-in user has loaded a valid JSON Resume file on the file import form
- **AND** activates Preview
- **THEN** a dialog SHALL display the rendered résumé in an iframe
- **AND** a template dropdown SHALL default to `classic` (or the first catalog entry)

#### Scenario: User changes template in preview dialog

- **WHEN** the import preview dialog is open
- **AND** the user selects a different template from the dropdown
- **THEN** the iframe content SHALL re-render with the new template
- **AND** no API call SHALL persist template choice
