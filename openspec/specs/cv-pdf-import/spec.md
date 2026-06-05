# CV PDF import

## Purpose

Specify server and client behavior for uploading a PDF résumé, running an agent pipeline to produce a JSON Resume document, and creating a CV through the existing persistence path.

## Requirements

### Requirement: Authenticated clients SHALL start PDF import via multipart upload

The API SHALL expose `POST /cv/import/pdf` guarded by the same Supabase auth strategy as `/cv`. The handler SHALL accept a multipart field `file` with MIME type `application/pdf`, enforce a configurable maximum size (`PDF_IMPORT_MAX_BYTES`, default 5 MB), and respond with `202 Accepted` and body `{ jobId: string }`. Invalid MIME type, missing file, or oversize payload SHALL yield `400`. Missing or invalid per-user LLM configuration per `import-llm-config` SHALL yield `403` or `422` with a clear message. The handler SHALL use the user's saved Mastra `model_id` and decrypted API key for the agent run—not server-wide env LLM keys.

#### Scenario: Successful import job start

- **WHEN** an authenticated client uploads a valid PDF within size limits
- **THEN** the API SHALL enqueue an import job, return `202` with a `jobId`, and begin processing asynchronously

#### Scenario: Unauthenticated import attempt

- **WHEN** a client calls `POST /cv/import/pdf` without a bearer token
- **THEN** the response SHALL be `401`

#### Scenario: Non-PDF upload rejected

- **WHEN** a client uploads a file that is not `application/pdf`
- **THEN** the API SHALL respond with `400` and SHALL NOT create a job

#### Scenario: Import rejected without LLM configuration

- **WHEN** a client uploads a valid PDF but the user has not saved valid import LLM settings
- **THEN** the API SHALL NOT enqueue a job
- **AND** SHALL respond with an error directing the user to configure provider, model, and API key

### Requirement: Clients SHALL poll import job status until terminal state

The API SHALL expose `GET /cv/import/:jobId` for the authenticated job owner. Responses SHALL include `status` (`queued` | `running` | `succeeded` | `failed`), optional `progress` (human-readable step label), optional `previewData` (prepared JSON Resume object) on PDF, Markdown, and website URL import success before client create, and optional `errors` (string array or structured validation messages) on failure. On success, `cvId` SHALL be absent until the client explicitly creates a CV via `POST /cv`. Jobs SHALL NOT be readable by other users. Unknown or expired job ids SHALL return `404`.

#### Scenario: Successful PDF import preview

- **WHEN** a client polls a PDF import job that finished successfully
- **THEN** the response SHALL have `status: succeeded` and `previewData` containing schema-valid prepared JSON
- **AND** `cvId` SHALL be absent

#### Scenario: Successful Markdown import preview

- **WHEN** a client polls a Markdown import job that finished successfully
- **THEN** the response SHALL have `status: succeeded` and `previewData` containing schema-valid prepared JSON
- **AND** `cvId` SHALL be absent

#### Scenario: Successful website import preview

- **WHEN** a client polls a website URL import job that finished successfully
- **THEN** the response SHALL have `status: succeeded` and `previewData` containing schema-valid prepared JSON
- **AND** `cvId` SHALL be absent

#### Scenario: Failed import

- **WHEN** extraction, agent, or schema validation ultimately fails
- **THEN** the response SHALL have `status: failed` and non-empty `errors` describing the failure

#### Scenario: Job not found

- **WHEN** a client requests a job id that does not exist or expired
- **THEN** the API SHALL respond with `404`

### Requirement: PDF import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract text from the PDF, map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup tools using the user's Tavily web scrape key when configured), optionally discover and merge social profiles into `basics.profiles` when Tavily is configured, and pass the result through `prepareImportedResume` and schema validation. The job SHALL store the prepared object as `previewData` and SHALL NOT persist a CV row. CV creation SHALL occur only when the client calls `POST /cv` after user confirmation with the prepared data (same meta, validation, and title derivation as direct create). When discovery adds profiles, the job response MAY include `discoveredProfilesCount` indicating how many profiles were auto-added. The PDF text extraction step (`extractPdfTextTool`) MUST call `parser.getText({ parseHyperlinks: true })` so that hyperlink annotations in the source PDF are returned as Markdown inline links (e.g. `[yorty](https://linkedin.com/in/yorty)`) in the extracted text; this preserves the icon-to-URL mapping that the LLM draft step needs to populate `basics.profiles` and is otherwise lost when `pdf-parse@2` strips icons to plain text.

#### Scenario: Valid PDF yields preview data

- **WHEN** processing completes for a text-based PDF with extractable content
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Preview includes discovered profiles

- **WHEN** a PDF import job succeeds after social profile discovery added two profiles
- **THEN** `previewData.basics.profiles` SHALL include those profiles
- **AND** `discoveredProfilesCount` MAY equal `2`

#### Scenario: Unextractable PDF fails job

- **WHEN** the PDF yields no extractable text (e.g. scanned image-only)
- **THEN** the job SHALL end in `failed` with an error indicating the PDF could not be parsed
- **AND** no CV row SHALL be created

#### Scenario: Hyperlink annotations surface as Markdown links in the extracted text

- **WHEN** the source PDF contains a hyperlink annotation that maps the icon next to a candidate's name to a LinkedIn profile URL
- **THEN** `extractPdfTextTool` SHALL return text containing a Markdown inline link in the form `[<label>](<url>)` for that annotation
- **AND** the LLM draft step SHALL be able to derive the URL from the extracted text

#### Scenario: PDFs without hyperlink annotations are unaffected

- **WHEN** the source PDF contains no hyperlink annotations
- **THEN** `extractPdfTextTool` SHALL return the same plain text it would have returned before this change
- **AND** the import pipeline SHALL continue to produce a schema-valid draft

#### Scenario: Vision-OCR fallback path is unaffected

- **WHEN** the PDF yields no extractable text and the vision-OCR fallback runs
- **THEN** the OCR transcription path is unchanged
- **AND** the final `previewData` SHALL still satisfy the JSON Resume schema

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

### Requirement: Markdown import SHALL follow preview-then-create semantics

Markdown import jobs SHALL use the same agent pipeline completion rules as PDF import: prepared JSON Resume in `previewData`, no automatic CV row, client `POST /cv` on Save. Markdown SHALL be accepted on the unified file import route at `/dashboard/cv/new/import/file` with the same Preview, Edit, and Save action row as PDF and URL imports per `import-preview-ui`.

#### Scenario: Successful Markdown import via client create

- **WHEN** a signed-in user uploads Markdown on the file import route, the job succeeds with `previewData`, and the user activates Save
- **THEN** the client SHALL call `POST /cv` once with the prepared data
- **AND** SHALL navigate to `/dashboard/cv/:id`

#### Scenario: Markdown job does not auto-create CV

- **WHEN** a Markdown import job completes successfully
- **THEN** `GET /cv/import/:jobId` SHALL NOT include `cvId`
- **AND** SHALL include `previewData`
