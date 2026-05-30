## MODIFIED Requirements

### Requirement: Signed-in users SHALL import a JSON Resume file to create a new CV

The new-CV page SHALL offer an import path that reads a user-selected `.json` file (or pasted JSON text when manual edit is enabled), parses JSON, runs `prepareImportedResume`, validates against the JSON Resume schema client-side where practical, and calls `createCv` with the resulting `data`. Manual JSON editing SHALL occur in a modal dialog opened from **Edit** (with edit icon) per `import-preview-ui`. Visual preview SHALL be available via the import preview dialog when data is valid. Import SHALL NOT occur until the user confirms (explicit Import control). On success, the UI SHALL navigate to `/dashboard/cv/:id`. On failure, the UI SHALL show a descriptive error without creating a row.

#### Scenario: Successful file import

- **WHEN** a signed-in user selects a valid JSON Resume file and confirms import
- **THEN** the client SHALL call `POST /cv` once with normalized `data`
- **AND THEN** on success SHALL navigate to the editor for the new CV id

#### Scenario: User previews before import

- **WHEN** a valid JSON Resume is loaded on the import form
- **AND** the user opens Preview without confirming Import
- **THEN** the import preview dialog SHALL render the résumé
- **AND** SHALL NOT call `POST /cv`

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
