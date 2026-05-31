## MODIFIED Requirements

### Requirement: Import flows SHALL expose a shared Edit dialog with consistent labeling

File and URL import forms SHALL expose an **Edit** outline button with a left-aligned edit icon. The button SHALL open `ImportJsonEditDialog`. The dialog title SHALL be **Edit**. Saving SHALL update the parent import source string and re-run `parseImportJsonSource`.

#### Scenario: Edit button label and icon

- **WHEN** any import form renders the Edit control
- **THEN** the visible label SHALL be `Edit`
- **AND** an edit icon SHALL appear to the left of the label

#### Scenario: Edit after agent success

- **WHEN** a PDF, Markdown, image, DOCX, or HTML URL import job succeeds with `previewData`
- **AND** the user opens Edit and saves changes
- **THEN** the parent form preview state SHALL reflect the edited JSON
- **AND** validation errors from invalid edits SHALL appear inline without creating a CV

### Requirement: Import forms SHALL use Import then Save as primary actions

File and URL import forms SHALL render **Import** (fetch or start agent job) while no valid preview exists, then **Save** (call `createCv`) once preview is valid. Preview and Edit SHALL follow the same disabled rules as before. Progress SHALL appear in a bar below the action row only while fetch, agent job, or save is active. File import SHALL support JSON, PDF, Markdown, Word (`.docx`), and image (PNG/JPEG/WebP) formats.

#### Scenario: File PDF two-step flow

- **WHEN** a user selects a PDF and activates Import
- **THEN** the client SHALL start the agent job and show progress
- **AND WHEN** `previewData` is ready the primary button label SHALL change to Save

#### Scenario: File image two-step flow

- **WHEN** a user selects a résumé image and activates Import
- **THEN** the client SHALL call `POST /cv/import/image`, poll until `previewData` is ready, then enable Save

#### Scenario: File DOCX two-step flow

- **WHEN** a user selects a `.docx` file and activates Import
- **THEN** the client SHALL call `POST /cv/import/docx`, poll until `previewData` is ready, then enable Save

#### Scenario: URL JSON two-step flow

- **WHEN** a user enters a JSON Resume URL and activates Import
- **THEN** the client SHALL fetch synchronously with progress feedback
- **AND WHEN** preview is valid the primary button label SHALL change to Save

### Requirement: Agent-processed imports SHALL use toasts for success hints

When validation source is `agent` (PDF, Markdown, image, DOCX, HTML URL), schema-valid success messages and profile-photo hints SHALL appear as toasts, not inline form text. Inline validation errors SHALL still appear when the user edits JSON (`validationSource` `edited`) or imports JSON directly (`direct`).

#### Scenario: Agent success toast

- **WHEN** a PDF import job completes with valid `previewData`
- **THEN** the UI SHALL toast that the résumé is ready to import
- **AND** SHALL NOT show inline "JSON Resume data is valid" messaging

#### Scenario: Direct JSON validation inline

- **WHEN** a user uploads a `.json` file
- **THEN** parse and schema errors SHALL appear inline on the form
