## ADDED Requirements

### Requirement: Import flows SHALL expose a shared visual preview dialog

When an import form has a valid `ImportSourcePreview` (schema-valid prepared JSON Resume), the client SHALL offer a **Preview** control that opens a modal dialog. The dialog SHALL render the résumé using `@resumind/resume-template` `renderResumeHtml` with a template id selected from `listCvTemplates()`. The dialog SHALL include template selection only and SHALL NOT include layout/section toggles, print, download PDF, or template persistence. The dialog SHALL be dismissible without triggering import or CV creation.

#### Scenario: User opens preview from JSON import

- **WHEN** a signed-in user has loaded a valid JSON Resume file on the JSON import form
- **AND** activates Preview
- **THEN** a dialog SHALL display the rendered résumé in an iframe
- **AND** a template dropdown SHALL default to `classic` (or the first catalog entry)

#### Scenario: User changes template in preview dialog

- **WHEN** the import preview dialog is open
- **AND** the user selects a different template from the dropdown
- **THEN** the iframe content SHALL re-render with the new template
- **AND** no API call SHALL persist template choice

#### Scenario: Preview unavailable before valid data

- **WHEN** the import form has no valid prepared JSON Resume
- **THEN** the Preview control SHALL be disabled or hidden
- **AND** activating Import SHALL NOT open the preview dialog

### Requirement: Import flows SHALL expose a shared Edit dialog with consistent labeling

All import forms (JSON file, PDF, Markdown, URL) SHALL expose an **Edit** outline button with a left-aligned edit icon (e.g. Lucide `Pencil`). The button SHALL open the existing JSON edit dialog (`ImportJsonEditDialog` or successor). The dialog title SHALL be **Edit** (not "Edit JSON Resume"). Saving in the dialog SHALL update the parent import source string and re-run `parseImportJsonSource`; canceling SHALL discard unsaved dialog edits.

#### Scenario: Edit button label and icon

- **WHEN** any import form renders the Edit control
- **THEN** the visible label SHALL be `Edit`
- **AND** an edit icon SHALL appear to the left of the label

#### Scenario: Edit after PDF agent success

- **WHEN** a PDF import job succeeds with `previewData`
- **AND** the user opens Edit and saves changes
- **THEN** the parent form preview state SHALL reflect the edited JSON
- **AND** validation errors from invalid edits SHALL appear on the form without creating a CV

#### Scenario: Edit on URL import after fetch

- **WHEN** URL fetch produced valid preview data
- **AND** the user edits and saves JSON in the dialog
- **THEN** subsequent Preview and Import actions SHALL use the edited prepared object

### Requirement: Import forms SHALL use a consistent primary action row

JSON, PDF, Markdown, and URL import forms SHALL render actions in order: **Import** (primary), **Preview** (outline, when preview valid), **Edit** (outline with icon), **Cancel** (outline). Import SHALL remain disabled until preview is valid and no import/fetch job is in progress.

#### Scenario: Action order on valid JSON import

- **WHEN** JSON import validation succeeds
- **THEN** buttons SHALL appear in order Import, Preview, Edit, Cancel

#### Scenario: Import disabled during PDF job

- **WHEN** a PDF import job is queued or running
- **THEN** Import, Preview, and Edit SHALL be disabled
- **AND** progress status SHALL be visible
