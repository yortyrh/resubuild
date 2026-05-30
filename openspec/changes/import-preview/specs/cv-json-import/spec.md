## MODIFIED Requirements

### Requirement: Signed-in users SHALL import a résumé file to create a new CV

The new-CV flow SHALL offer **Import from file** at `/dashboard/cv/new/import/file` that accepts JSON (`.json`), PDF (`.pdf`), or Markdown (`.md`/`.markdown`) and auto-detects format client-side. JSON files SHALL be read and validated locally. PDF and Markdown SHALL use agent import jobs returning `previewData` before Save. Manual JSON editing SHALL occur in the **Edit** dialog per `import-preview-ui`. Visual preview SHALL be available via the import preview dialog when data is valid. Save SHALL call `createCv` only after a valid prepared preview exists. On success, the UI SHALL navigate to `/dashboard/cv/:id`.

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

#### Scenario: PDF file two-step import

- **WHEN** a signed-in user selects a PDF and activates Import
- **THEN** the client SHALL start the agent job
- **AND WHEN** preview is valid the user activates Save
- **THEN** the client SHALL call `POST /cv` once

#### Scenario: User abandons import

- **WHEN** a user opens the file import UI and leaves without Save
- **THEN** no `POST /cv` call SHALL have been made for that attempt
