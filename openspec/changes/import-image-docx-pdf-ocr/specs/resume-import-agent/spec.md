## MODIFIED Requirements

### Requirement: The agent SHALL expose reusable tools for resume verification

The import agent package SHALL register tools usable by import workflows and future workflows:

- **Extract PDF text** — deterministic parsing from buffer to plain text; when no text layer exists and LLM credentials are supplied, fall back to rendering pages and vision OCR.
- **Extract DOCX text** — deterministic plain-text extraction from `.docx` buffers via `mammoth`.
- **Transcribe résumé image** — vision LLM transcription from PNG/JPEG/WebP buffers.
- **Validate resume schema** — AJV against `packages/schemas/resume.schema.json`, returning paths and messages.
- **Normalize dates** — coerce JSON Resume date fields toward ISO-8601 partial dates consistent with editor rules.
- **Web lookup** (optional) — when the user has configured a Tavily API key in web scrape settings, resolve company or institution names to canonical URLs or disambiguation hints; when not configured, the tool SHALL skip without failing the job.
- **Fetch HTML / scrape page** — load public HTTPS page content for website import (`fetch-html`, optional Firecrawl or Tavily extract when configured).

#### Scenario: PDF OCR fallback

- **WHEN** `extractPdfTextTool` receives a scanned PDF buffer and valid `modelId` + `apiKey`
- **THEN** it SHALL render page images and return transcribed plain text for the text import workflow

#### Scenario: Schema validation tool rejects invalid draft

- **WHEN** the draft step produces JSON missing required shape
- **THEN** the validate tool SHALL return structured errors for the repair step

#### Scenario: Web lookup disabled

- **WHEN** no Tavily search key is configured
- **THEN** the web lookup tool SHALL return `{ skipped: true }` without failing the job

### Requirement: Text import workflow SHALL be shared across non-PDF sources

The package SHALL export `runTextImportWorkflow` used by PDF (after extraction/OCR), Markdown (file body), image (after transcription), and DOCX (after mammoth extraction). The package SHALL export `runImageImportWorkflow` for image-only intake.

#### Scenario: Image workflow reuses text pipeline

- **WHEN** `runImageImportWorkflow` completes transcription
- **THEN** it SHALL delegate to `runTextImportWorkflow` with the transcribed plain text
