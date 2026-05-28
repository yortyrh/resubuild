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

The API SHALL expose `GET /cv/import/:jobId` for the authenticated job owner. Responses SHALL include `status` (`queued` | `running` | `succeeded` | `failed`), optional `progress` (human-readable step label), optional `cvId` on success, and optional `errors` (string array or structured validation messages) on failure. Jobs SHALL NOT be readable by other users. Unknown or expired job ids SHALL return `404`.

#### Scenario: Successful import completion

- **WHEN** a client polls a job that finished successfully
- **THEN** the response SHALL have `status: succeeded` and `cvId` set to the created CV id

#### Scenario: Failed import

- **WHEN** extraction, agent, or schema validation ultimately fails
- **THEN** the response SHALL have `status: failed` and non-empty `errors` describing the failure

#### Scenario: Job not found

- **WHEN** a client requests a job id that does not exist or expired
- **THEN** the API SHALL respond with `404`

### Requirement: PDF import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract text from the PDF, map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup tools), and pass the result through `prepareImportedResume` before invoking the same create semantics as `POST /cv` (meta application, AJV validation, title derivation). The pipeline SHALL NOT persist a CV unless final schema validation succeeds.

#### Scenario: Valid PDF yields persisted CV

- **WHEN** processing completes for a text-based PDF with extractable content
- **THEN** the service SHALL create exactly one CV row owned by the caller
- **AND** persisted `data` SHALL pass the shared resume schema validator

#### Scenario: Unextractable PDF fails job

- **WHEN** the PDF yields no extractable text (e.g. scanned image-only)
- **THEN** the job SHALL end in `failed` with an error indicating the PDF could not be parsed
- **AND** no CV row SHALL be created

### Requirement: The web app SHALL expose PDF import on the new CV route

`/dashboard/cv/new` SHALL include an **Import from PDF** path alongside manual create and JSON import. PDF import SHALL be **disabled** until the user completes import LLM configuration per `import-llm-config`, showing a setup link instead of upload when unset. When configured, the client SHALL upload the PDF only after explicit user confirmation, poll job status until terminal state, navigate to `/dashboard/cv/:id` on success, and display job errors on failure. Visiting the page alone SHALL NOT start an import or create a CV.

#### Scenario: User imports PDF successfully

- **WHEN** a signed-in user selects a PDF and confirms import
- **THEN** the client SHALL call `POST /cv/import/pdf`, poll until `succeeded`, and navigate to the returned CV editor route

#### Scenario: User abandons import in progress

- **WHEN** a user navigates away while a job is running
- **THEN** the client MAY stop polling
- **AND** the server job MAY continue; no duplicate CV SHALL be created for a single job id

#### Scenario: User without LLM config sees setup instead of upload

- **WHEN** a signed-in user opens the PDF import section without saved LLM settings
- **THEN** the UI SHALL NOT show the PDF file input
- **AND** SHALL prompt the user to open import LLM settings
