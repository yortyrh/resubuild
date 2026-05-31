# Resume import agent

## Purpose

Define the Mastra-based agent infrastructure for PDF (and future) resume import: workflows, tools, and extension points for verification, incremental section writes, and user chat.

## Requirements

### Requirement: PDF import SHALL run as a Mastra workflow in a dedicated workspace

The repository SHALL include `apps/import-agent` exporting a PDF import workflow invoked by `apps/api`. The workflow SHALL compose discrete steps (extract, draft, verify/repair loop, finalize) rather than a single monolithic prompt. Workflow code SHALL be unit-testable with mocked LLM and search dependencies.

#### Scenario: Workflow invoked from API

- **WHEN** the API starts a PDF import job
- **THEN** it SHALL call the exported workflow runner with the PDF buffer, user context, and the user's saved Mastra `model_id` plus API key passed as Mastra `model: { id, apiKey }`
- **AND** the runner SHALL update job progress labels through the job store

#### Scenario: Unit tests without live LLM

- **WHEN** developers run `apps/import-agent` tests in CI
- **THEN** tests SHALL use fixture PDF text and mocked model responses without requiring API keys

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

- **WHEN** the user has not configured a Tavily key in web scrape settings
- **THEN** the workflow SHALL continue without web enrichment

### Requirement: Verify step SHALL retry repair up to a bounded limit

After the initial draft, the workflow SHALL enter a verify loop: validate schema, apply date normalization, optionally run web lookup, and invoke an LLM repair step with validator feedback until the document passes schema validation or a configured maximum iteration count (default 3) is reached. Exceeding the limit SHALL fail the job with aggregated errors.

#### Scenario: Repair succeeds within limit

- **WHEN** the first draft fails validation but a repair pass produces a valid document
- **THEN** the workflow SHALL proceed to finalize without further repair iterations

#### Scenario: Repair exhausts iterations

- **WHEN** the document remains invalid after the maximum repair attempts
- **THEN** the workflow SHALL fail with validator errors included in the job result

### Requirement: Agent architecture SHALL support future incremental and chat workflows

The import agent package SHALL export a tool registry (or equivalent registration API) and shared workflow context types so additional workflows (e.g. per-section persistence via item CRUD, conversational CV refinement) can reuse the same tools without duplicating validation or date logic. v1 MAY ship only the PDF import workflow; extension interfaces SHALL be documented in code comments or README in `apps/import-agent`.

#### Scenario: Future workflow reuses validate tool

- **WHEN** a new workflow is added that patches a single resume section
- **THEN** it SHALL be able to import and invoke the same schema validation tool used by PDF import

### Requirement: Model resolution SHALL accept Mastra model router strings validated upstream

Workflow agents SHALL receive model configuration only after `import-llm-config` validation. The workflow SHALL NOT hardcode a deployment-wide model; it SHALL use the per-user `model_id` string (`provider/model` or `gateway/provider/model`) compatible with Mastra's model router.

#### Scenario: Agent uses user-configured model

- **WHEN** a PDF import job runs for a user with saved settings `openai/gpt-4o-mini`
- **THEN** the draft and repair agents SHALL invoke Mastra with that exact model id and the user's decrypted API key

### Requirement: The import agent SHALL expose a website import workflow

The `apps/import-agent` package SHALL export `runWebsiteImportWorkflow` accepting a source URL, Mastra model configuration, scrape tool configuration, and progress callback. The workflow SHALL: load page content via configured scrape tools or raw HTML fetch, draft JSON Resume via LLM, then run the same verify/repair loop (schema validation, date normalization, optional web lookup) as PDF import up to a bounded retry limit.

#### Scenario: Website workflow produces draft JSON

- **WHEN** `runWebsiteImportWorkflow` runs with mocked page content and LLM fixture
- **THEN** unit tests SHALL assert a draft object is returned or structured errors are collected

#### Scenario: Scrape tools registered per provider

- **WHEN** `toolsConfig.scrapeProvider` is `firecrawl` or `tavily` with API key
- **THEN** the workflow agent SHALL register the matching scrape tool alongside `fetch-html`

### Requirement: Web lookup SHALL use the user's Tavily scrape key

When the user has saved web scrape settings with `provider: tavily`, PDF, text, and website import workflows SHALL pass that decrypted key as `searchApiKey` to the web lookup tool. When Tavily is not configured, web lookup SHALL no-op without failing the job.

#### Scenario: PDF import without Tavily settings

- **WHEN** a PDF import job runs and the user has no Tavily web scrape configuration
- **THEN** web lookup SHALL be skipped
- **AND** the job MAY still succeed

#### Scenario: PDF import with Tavily settings

- **WHEN** a PDF import job runs and the user has Tavily web scrape configuration
- **THEN** the workflow SHALL pass the user's Tavily key to web lookup

### Requirement: The import agent SHALL expose image and shared text import workflows

The package SHALL export `runTextImportWorkflow` for Markdown, DOCX (after extraction), PDF (after extraction/OCR), and image (after transcription). The package SHALL export `runImageImportWorkflow` that transcribes a résumé image then delegates to `runTextImportWorkflow`.

#### Scenario: Image workflow reuses text pipeline

- **WHEN** `runImageImportWorkflow` completes transcription
- **THEN** it SHALL delegate to `runTextImportWorkflow` with the transcribed plain text
