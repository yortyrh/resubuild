## ADDED Requirements

### Requirement: Authenticated clients SHALL start Markdown import via multipart upload

The API SHALL expose `POST /cv/import/markdown` guarded by the same Supabase auth strategy as `/cv`. The handler SHALL accept a multipart field `file` with MIME type `text/markdown` or `text/plain`, enforce a configurable maximum size (`MARKDOWN_IMPORT_MAX_BYTES`, default 512 KB), and respond with `202 Accepted` and body `{ jobId: string }`. Invalid MIME type, missing file, or oversize payload SHALL yield `400`. Missing or invalid per-user LLM configuration per `import-llm-config` SHALL yield `403` or `422` with a clear message. The handler SHALL use the user's saved model id and decrypted API key for the agent run.

#### Scenario: Successful Markdown import job start

- **WHEN** an authenticated client uploads a valid Markdown file within size limits
- **THEN** the API SHALL enqueue an import job, return `202` with a `jobId`, and begin processing asynchronously

#### Scenario: Non-Markdown upload rejected

- **WHEN** a client uploads a file that is not `text/markdown` or `text/plain`
- **THEN** the API SHALL respond with `400` and SHALL NOT create a job

### Requirement: Markdown import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL read the file as UTF-8 text, map content to JSON Resume shape via the shared text import agent workflow, run verification (schema validation, date normalization), and pass the result through `prepareImportedResume` before invoking the same create semantics as `POST /cv`. The pipeline SHALL NOT persist a CV unless final schema validation succeeds.

#### Scenario: Valid Markdown yields persisted CV

- **WHEN** processing completes for a Markdown file with extractable résumé content
- **THEN** the service SHALL create exactly one CV row owned by the caller
- **AND** persisted data SHALL pass the shared resume schema validator

#### Scenario: Empty Markdown fails job

- **WHEN** the uploaded file is empty or whitespace-only
- **THEN** the job SHALL end in `failed` with a descriptive error
- **AND** no CV row SHALL be created

### Requirement: The web app SHALL expose Markdown import on a dedicated route

`/dashboard/cv/new/import/markdown` SHALL provide Markdown résumé import. Markdown import SHALL be **disabled** until the user completes import LLM configuration per `import-llm-config`, showing a setup link instead of upload when unset. When configured, the client SHALL upload the Markdown file only after explicit user confirmation, poll job status until terminal state, navigate to `/dashboard/cv/:id` on success, and display job errors on failure. Visiting the page alone SHALL NOT start an import or create a CV. The page SHALL use the shared import file upload component per `import-file-upload`.

#### Scenario: User imports Markdown successfully

- **WHEN** a signed-in user with valid import LLM settings selects a Markdown file and confirms import
- **THEN** the client SHALL call `POST /cv/import/markdown`, poll until `succeeded`, and navigate to the returned CV editor route

#### Scenario: User without LLM config sees setup instead of upload

- **WHEN** a signed-in user opens `/dashboard/cv/new/import/markdown` without saved LLM settings
- **THEN** the UI SHALL NOT show the file input
- **AND** SHALL prompt the user to open import LLM settings
