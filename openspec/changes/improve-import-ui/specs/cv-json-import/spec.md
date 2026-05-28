## MODIFIED Requirements

### Requirement: Signed-in users SHALL import a JSON Resume file to create a new CV

The new-CV page SHALL offer an import path that reads a user-selected `.json` file via the shared import file upload component, parses JSON, runs `prepareImportedResume`, validates against the JSON Resume schema client-side where practical, and calls `createCv` with the resulting `data`. Manual JSON editing SHALL occur in a modal dialog opened from the import tab (e.g. **Edit JSON…**), not as an inline expandable editor on the main form. The dialog SHALL commit edited text back to the import flow only when the user saves in the dialog; canceling the dialog SHALL discard unsaved dialog edits. Import SHALL NOT occur until the user confirms (explicit Import control). On success, the UI SHALL navigate to `/dashboard/cv/:id`. On failure, the UI SHALL show a descriptive error without creating a row.

#### Scenario: Successful file import

- **WHEN** a signed-in user selects a valid JSON Resume file and confirms import
- **THEN** the client SHALL call `POST /cv` once with normalized `data`
- **AND THEN** on success SHALL navigate to the editor for the new CV id

#### Scenario: Invalid JSON file

- **WHEN** the selected file content is not valid JSON
- **THEN** the UI SHALL display an inline error
- **AND** SHALL NOT call `POST /cv`

#### Scenario: Schema validation failure

- **WHEN** the parsed document fails JSON Resume schema validation before or after API submission
- **THEN** the UI SHALL display validation error details
- **AND** SHALL NOT navigate to the editor

#### Scenario: User abandons import

- **WHEN** a user opens the import UI on `/dashboard/cv/new` and leaves without confirming import
- **THEN** no `POST /cv` call SHALL have been made for that import attempt

#### Scenario: User edits JSON in dialog

- **WHEN** a signed-in user opens the JSON edit dialog from the import tab, changes content, and saves
- **THEN** the import tab SHALL reflect the saved JSON for validation and import
- **AND** the main import tab SHALL NOT show the full code editor inline

#### Scenario: User cancels JSON edit dialog

- **WHEN** a user opens the JSON edit dialog, makes changes, and cancels without saving
- **THEN** the import tab JSON source SHALL remain unchanged from before the dialog opened
