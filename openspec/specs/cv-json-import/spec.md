# CV JSON import

## Purpose

Specify client and shared-library behavior for importing JSON Resume documents (and unified file-import JSON path) into new CVs via preview-then-create.

## Requirements

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

The new-CV flow SHALL offer **Import from file** at `/dashboard/cv/new/import/file` that accepts JSON (`.json`), PDF (`.pdf`), and Markdown (`.md`/`.markdown`) with client-side format detection. JSON files SHALL be read and validated locally. PDF and Markdown SHALL use agent import jobs returning `previewData` before Save per `cv-pdf-import` and `import-preview-ui`. Manual JSON editing SHALL occur in the **Edit** dialog. Visual preview SHALL be available via the import preview dialog when data is valid. Save SHALL call `createCv` only after a valid prepared preview exists. On success, the UI SHALL navigate to `/dashboard/cv/:id`.

#### Scenario: Successful JSON file import

- **WHEN** a signed-in user selects a valid JSON Resume file and activates Save
- **THEN** the client SHALL call `POST /cv` once with normalized `data`
- **AND THEN** on success SHALL navigate to the editor for the new CV id

#### Scenario: User previews before save

- **WHEN** a valid JSON Resume is loaded on the file import form
- **AND** the user opens Preview without Save
- **THEN** the import preview dialog SHALL render the résumé
- **AND** SHALL NOT call `POST /cv`

#### Scenario: Invalid JSON file

- **WHEN** the selected JSON file content is not valid JSON
- **THEN** the UI SHALL display an inline error
- **AND** Save SHALL remain disabled

#### Scenario: Schema validation failure

- **WHEN** the parsed document fails JSON Resume schema validation before or after API submission
- **THEN** the UI SHALL display validation error details
- **AND** SHALL NOT navigate to the editor

#### Scenario: User abandons import

- **WHEN** a user opens the file import UI and leaves without Save
- **THEN** no `POST /cv` call SHALL have been made for that attempt

### Requirement: Import file selection SHALL enforce reasonable size limits

The client SHALL reject files exceeding a documented size limit (e.g. 1 MB) before reading content, with a clear error message.

#### Scenario: Oversized file rejected

- **WHEN** a user selects a file larger than the configured limit
- **THEN** the UI SHALL show a file-too-large error
- **AND** SHALL NOT attempt to parse or upload the file
