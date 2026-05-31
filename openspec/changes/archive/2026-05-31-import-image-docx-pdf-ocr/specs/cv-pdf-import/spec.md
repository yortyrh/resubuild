## MODIFIED Requirements

### Requirement: PDF import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract text from the PDF (using `pdf-parse` when a text layer exists, or vision OCR on rendered page images when no text layer is available and the user has a vision-capable model configured), map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup tools using the user's Tavily web scrape key when configured), and pass the result through `prepareImportedResume` and schema validation. The job SHALL store the prepared object as `previewData` and SHALL NOT persist a CV row. CV creation SHALL occur only when the client calls `POST /cv` after user confirmation with the prepared data (same meta, validation, and title derivation as direct create).

#### Scenario: Valid PDF yields preview data

- **WHEN** processing completes for a text-based PDF with extractable content
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Image-only PDF yields preview data via OCR

- **WHEN** the PDF yields no extractable text layer (e.g. scanned image-only)
- **AND** the import pipeline can transcribe page images with the user's configured vision-capable model
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Unreadable PDF fails job

- **WHEN** the PDF yields no extractable text and OCR transcription also fails or returns empty content
- **THEN** the job SHALL end in `failed` with an error indicating the PDF could not be parsed
- **AND** no CV row SHALL be created

### Requirement: The web app SHALL expose PDF import on the new CV route

PDF import SHALL be available through **Import from file** at `/dashboard/cv/new/import/file` alongside JSON, Markdown, Word, and image formats. PDF import SHALL be **disabled** until the user completes import LLM configuration per `import-llm-config`, showing a setup link instead of upload when unset. When configured, the client SHALL upload the PDF only after explicit Import confirmation, poll job status until `previewData` is available, then allow Preview, Edit, and Save per `import-preview-ui`. Save SHALL call `createCv` with the prepared data and navigate to `/dashboard/cv/:id` on success. Job errors SHALL display on failure. Visiting the page alone SHALL NOT start an import or create a CV.

#### Scenario: User imports PDF successfully

- **WHEN** a signed-in user selects a PDF on the file import route, waits for agent success, and activates Save
- **THEN** the client SHALL call `POST /cv/import/pdf`, poll until `previewData` is available, then call `POST /cv` once and navigate to the new CV editor route

#### Scenario: User previews PDF import before create

- **WHEN** a PDF import job succeeds with `previewData`
- **AND** the user opens Preview without Save
- **THEN** the client SHALL show the import preview dialog
- **AND** SHALL NOT call `POST /cv`

#### Scenario: User abandons import in progress

- **WHEN** a user navigates away while a job is running
- **THEN** the client MAY stop polling
- **AND** the server job MAY continue; no CV SHALL be created until explicit client `POST /cv`

#### Scenario: User without LLM config sees setup instead of upload

- **WHEN** a signed-in user opens the file import section without saved LLM settings and selects a PDF
- **THEN** the UI SHALL NOT enqueue the PDF job
- **AND** SHALL prompt the user to open import LLM settings
