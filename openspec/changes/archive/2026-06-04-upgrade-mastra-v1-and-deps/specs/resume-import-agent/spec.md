## MODIFIED Requirements

### Requirement: PDF import SHALL run as a Mastra workflow in a dedicated workspace

The repository SHALL include `apps/import-agent` exporting a PDF import workflow invoked by `apps/api`. The workflow SHALL compose discrete steps (extract, draft, verify/repair loop, finalize) rather than a single monolithic prompt. Workflow code SHALL be unit-testable with mocked LLM and search dependencies. The text import draft step (shared by PDF, Markdown, DOCX, and image after transcription) SHALL instruct the LLM to place unpaid, volunteer, community-service, and pro-bono roles in `volunteer[]` and paid employment in `work[]`, using ISO-8601 partial dates for date fields.

`apps/import-agent` SHALL consume `@mastra/core@^1.38.0` (or any v1 release). All `Agent` instances constructed by the package SHALL be imported from the v1 subpath `@mastra/core/agent` (the v1 top-level `@mastra/core` entry exports only `Mastra` and `Config`; `Agent` is no longer available at the top-level). All `Agent` constructors SHALL provide the v1-required `id` field in addition to the existing `name`, `instructions`, and `model` fields. The `model` field SHALL continue to accept `{ id: string, apiKey: string }` for the model-router use case; no change to the public `runTextImportWorkflow` / `runPdfImportWorkflow` / `runImageImportWorkflow` / `runWebsiteImportWorkflow` / `runPrepareApplicationWorkflow` / `runUpdateApplicationWorkflow` signatures or return types.

#### Scenario: Workflow invoked from API

- **WHEN** the API starts a PDF import job
- **THEN** it SHALL call the exported workflow runner with the PDF buffer, user context, and the user's saved Mastra `model_id` plus API key passed as Mastra `model: { id, apiKey }`
- **AND** the runner SHALL update job progress labels through the job store
- **AND** the underlying `Agent` instance SHALL be constructed with the v1-required `id` field

#### Scenario: Unit tests without live LLM

- **WHEN** developers run `apps/import-agent` tests in CI
- **THEN** tests SHALL use fixture PDF text and mocked model responses without requiring API keys
- **AND** test imports SHALL use the v1 subpath `@mastra/core/agent` (or, if the package re-exports a re-typed wrapper, that wrapper SHALL itself re-export from `@mastra/core/agent`)

#### Scenario: Draft instructions separate volunteer from work

- **WHEN** `runTextImportWorkflow` generates a draft from plain text
- **THEN** the draft agent instructions SHALL require `volunteer[]` in the output shape
- **AND** SHALL direct volunteer/unpaid roles to `volunteer[]` rather than `work[]`

### Requirement: The agent SHALL expose reusable tools for resume verification

The import agent package SHALL register tools usable by the PDF workflow and future workflows:

- **Extract PDF text** — deterministic parsing from buffer to plain text.
- **Validate resume schema** — AJV against `packages/schemas/resume.schema.json`, returning paths and messages.
- **Normalize dates** — coerce JSON Resume date fields toward ISO-8601 partial dates consistent with editor rules.
- **Web lookup** (optional) — when the user has configured a Tavily API key in web scrape settings, resolve company or institution names to canonical URLs or disambiguation hints; when not configured, the tool SHALL skip without failing the job.
- **Discover social profiles** (optional) — when the user has configured a Tavily API key, search for the candidate's public social network profiles from draft identity signals and return validated `{ network, username, url }` entries for merge into `basics.profiles`; when not configured, the tool SHALL skip without failing the job.
- **Fetch HTML / scrape page** — load public HTTPS page content for website import (`fetch-html`, optional Firecrawl or Tavily extract when configured).

All `Agent` instances constructed inside these tool modules (e.g. `transcribeImageResumeTool`, `transcribePdfWithVisionTool`, the OCR fallback) SHALL be imported from the v1 subpath `@mastra/core/agent` and SHALL provide the v1-required `id` field. The `createTool` migration to the v1 `(inputData, context)` signature is **not** required by this change (the package does not use `createTool` today; it composes `Agent` + plain async functions); it becomes required only if a future change introduces `createTool`-based tools.

#### Scenario: Schema validation tool rejects invalid draft

- **WHEN** the draft step produces JSON missing required shape
- **THEN** the validate tool SHALL return structured errors for the repair step

#### Scenario: Web lookup disabled

- **WHEN** the user has not configured a Tavily key in web scrape settings
- **THEN** the workflow SHALL continue without web enrichment

#### Scenario: Agent construction in image and PDF OCR tools uses v1 contract

- **WHEN** `transcribeImageResumeTool` or `transcribePdfWithVisionTool` constructs a Mastra `Agent`
- **THEN** the import SHALL come from `@mastra/core/agent`
- **AND** the constructor SHALL include the `id` field
- **AND** the call to `agent.generate([...])` SHALL continue to work with the v1 message-content shape
