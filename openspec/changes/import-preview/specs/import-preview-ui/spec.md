## ADDED Requirements

### Requirement: Import flows SHALL expose a shared visual preview dialog

When an import form has a valid `ImportSourcePreview` (schema-valid prepared JSON Resume), the client SHALL offer a **Preview** control that opens a modal dialog. The dialog SHALL render the résumé using `@resumind/resume-template` `renderResumeHtml` with a template id selected from `listCvTemplates()`. The dialog SHALL include template selection only and SHALL NOT include layout/section toggles, print, download PDF, or template persistence. The dialog SHALL be dismissible without triggering import or CV creation.

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

#### Scenario: Preview unavailable before valid data

- **WHEN** the import form has no valid prepared JSON Resume
- **THEN** the Preview control SHALL be disabled
- **AND** activating Save SHALL NOT open the preview dialog

### Requirement: Import flows SHALL expose a shared Edit dialog with consistent labeling

File and URL import forms SHALL expose an **Edit** outline button with a left-aligned edit icon. The button SHALL open `ImportJsonEditDialog`. The dialog title SHALL be **Edit**. Saving SHALL update the parent import source string and re-run `parseImportJsonSource`.

#### Scenario: Edit button label and icon

- **WHEN** any import form renders the Edit control
- **THEN** the visible label SHALL be `Edit`
- **AND** an edit icon SHALL appear to the left of the label

#### Scenario: Edit after agent success

- **WHEN** a PDF, Markdown, or HTML URL import job succeeds with `previewData`
- **AND** the user opens Edit and saves changes
- **THEN** the parent form preview state SHALL reflect the edited JSON
- **AND** validation errors from invalid edits SHALL appear inline without creating a CV

### Requirement: Import forms SHALL use Import then Save as primary actions

File and URL import forms SHALL render **Import** (fetch or start agent job) while no valid preview exists, then **Save** (call `createCv`) once preview is valid. Preview and Edit SHALL follow the same disabled rules as before. Progress SHALL appear in a bar below the action row only while fetch, agent job, or save is active.

#### Scenario: File PDF two-step flow

- **WHEN** a user selects a PDF and activates Import
- **THEN** the client SHALL start the agent job and show progress
- **AND WHEN** `previewData` is ready the primary button label SHALL change to Save

#### Scenario: URL JSON two-step flow

- **WHEN** a user enters a JSON Resume URL and activates Import
- **THEN** the client SHALL fetch synchronously with progress feedback
- **AND WHEN** preview is valid the primary button label SHALL change to Save

### Requirement: Agent-processed imports SHALL use toasts for success hints

When validation source is `agent` (PDF, Markdown, HTML URL), schema-valid success messages and profile-photo hints SHALL appear as toasts, not inline form text. Inline validation errors SHALL still appear when the user edits JSON (`validationSource` `edited`) or imports JSON directly (`direct`).

#### Scenario: Agent success toast

- **WHEN** a PDF import job completes with valid `previewData`
- **THEN** the UI SHALL toast that the résumé is ready to import
- **AND** SHALL NOT show inline "JSON Resume data is valid" messaging

#### Scenario: Direct JSON validation inline

- **WHEN** a user uploads a `.json` file
- **THEN** parse and schema errors SHALL appear inline on the form

### Requirement: File import SHALL show stable layout while loading and selecting files

The file import form SHALL show a skeleton matching the loaded layout while AI agent settings load. The file dropzone SHALL use a fixed height in empty and selected states. Detected file kind SHALL appear as a badge top-right in the dropzone; clear control SHALL sit to the right of the badge.

#### Scenario: Loading skeleton

- **WHEN** the file import page loads and agent settings are pending
- **THEN** the UI SHALL show a skeleton dropzone and action placeholders
- **AND** SHALL NOT show "Checking import settings…" text only
