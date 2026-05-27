## ADDED Requirements

### Requirement: The system SHALL normalize external JSON Resume documents before create

A shared function in `@resumind/types` (e.g. `prepareImportedResume`) SHALL accept parsed JSON and return a plain object suitable for `POST /cv` `data`. It MUST reject non-object roots. It SHALL remove top-level `$schema` and `meta` from the import (Resumind meta is applied server-side on create). It SHALL ensure all standard JSON Resume array sections exist, defaulting missing or non-array values to empty arrays for: `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, and `projects`. It SHALL preserve `basics` and section item content without renaming JSON Resume fields.

#### Scenario: Full sample file normalizes successfully

- **WHEN** `prepareImportedResume` receives a parsed object equivalent to `.samples/resumes/jsonresume/Jane Doe - Senior Software Engineer.json`
- **THEN** the result SHALL include all resume sections with array fields
- **AND** the result SHALL NOT include `$schema` or `meta`

#### Scenario: Minimal object gets empty arrays

- **WHEN** `prepareImportedResume` receives `{ "basics": { "name": "Alex" } }`
- **THEN** the result SHALL include `basics.name` equal to `Alex`
- **AND** `work`, `education`, and other array sections SHALL be empty arrays

#### Scenario: Non-object input rejected

- **WHEN** `prepareImportedResume` receives an array or string
- **THEN** it SHALL throw an error indicating the resume must be a JSON object

### Requirement: Signed-in users SHALL import a JSON Resume file to create a new CV

The new-CV page SHALL offer an import path that reads a user-selected `.json` file (or pasted JSON text), parses JSON, runs `prepareImportedResume`, and calls `createCv` with the resulting `data`. Import SHALL NOT occur until the user confirms (explicit Import/Save control). On success, the UI SHALL navigate to `/dashboard/cv/:id`. On failure, the UI SHALL show a descriptive error without creating a row.

#### Scenario: Successful file import

- **WHEN** a signed-in user selects a valid JSON Resume file and confirms import
- **THEN** the client SHALL call `POST /cv` once with normalized `data`
- **AND THEN** on success SHALL navigate to the editor for the new CV id

#### Scenario: Invalid JSON file

- **WHEN** the selected file content is not valid JSON
- **THEN** the UI SHALL display an inline error
- **AND** SHALL NOT call `POST /cv`

#### Scenario: Schema validation failure

- **WHEN** the parsed document fails API JSON Resume validation
- **THEN** the UI SHALL display validation error details from the API response
- **AND** SHALL NOT navigate to the editor

#### Scenario: User abandons import

- **WHEN** a user opens the import UI on `/dashboard/cv/new` and leaves without confirming import
- **THEN** no `POST /cv` call SHALL have been made for that import attempt

### Requirement: Import file selection SHALL enforce reasonable size limits

The client SHALL reject files exceeding a documented size limit (e.g. 1 MB) before reading content, with a clear error message.

#### Scenario: Oversized file rejected

- **WHEN** a user selects a file larger than the configured limit
- **THEN** the UI SHALL show a file-too-large error
- **AND** SHALL NOT attempt to parse or upload the file
