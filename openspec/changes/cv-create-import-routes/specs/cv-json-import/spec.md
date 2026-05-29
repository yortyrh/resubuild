## MODIFIED Requirements

### Requirement: Signed-in users SHALL import a JSON Resume file to create a new CV

The route `/dashboard/cv/new/import/json` SHALL offer an import path that reads a user-selected `.json` file (or pasted JSON text via edit dialog), parses JSON, runs `prepareImportedResume`, validates against the JSON Resume schema client-side where practical, and calls `createCv` with the resulting `data`. Import SHALL NOT occur until the user confirms (explicit Import control). On success, the UI SHALL navigate to `/dashboard/cv/:id`. On failure, the UI SHALL show a descriptive error without creating a row. URL-based import SHALL NOT appear on this page (see `cv-website-import`).

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

- **WHEN** a user opens `/dashboard/cv/new/import/json` and leaves without confirming import
- **THEN** no `POST /cv` call SHALL have been made for that import attempt
