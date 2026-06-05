# Resume import agent

## Purpose

Define the Mastra-based agent infrastructure for PDF (and future) resume import: workflows, tools, and extension points for verification, incremental section writes, and user chat.

## Requirements

### Requirement: PDF import SHALL run as a Mastra workflow in a dedicated workspace

The repository SHALL include `apps/import-agent` exporting a PDF import workflow invoked by `apps/api`. The workflow SHALL compose discrete steps (extract, draft, verify/repair loop, finalize) rather than a single monolithic prompt. Workflow code SHALL be unit-testable with mocked LLM and search dependencies. The text import draft step (shared by PDF, Markdown, DOCX, and image after transcription) SHALL instruct the LLM to place unpaid, volunteer, community-service, and pro-bono roles in `volunteer[]` and paid employment in `work[]`, using ISO-8601 partial dates for date fields. The PDF, website, and prepare-application workflow agents SHALL invoke `agent.generate(prompt)` and parse the JSON Resume object from `response.text` using the existing `parseJsonFromAgentText` / `indexOf('{') … lastIndexOf('}')` helper. The workflows SHALL NOT pass a `structuredOutput` option to `agent.generate(...)`; under `@mastra/core@1.38.0` the public `Agent#generate` overload used by these workflows does not expose a `structuredOutput` key, and any `structuredOutput` argument is silently ignored. The JSON-in-text parse path is the source of truth for the workflow output. The website import workflow's draft agent MAY still pass `{ maxSteps: MAX_AGENT_STEPS }` to `agent.generate`; the `maxSteps` option is on the supported v1 surface. The `agent.id` field requirement added by the `upgrade-mastra-v1-and-deps` change is preserved.

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

#### Scenario: PDF draft step parses JSON from response text

- **WHEN** `runTextImportWorkflow` (and by extension the PDF import workflow) calls the draft agent
- **THEN** the agent SHALL be invoked with `agent.generate(prompt)` (no `structuredOutput`)
- **AND** the draft object SHALL be derived from the JSON substring of `response.text`

#### Scenario: Website draft agent keeps `maxSteps` option

- **WHEN** `generateWebsiteDraft` invokes the website draft agent
- **THEN** the agent SHALL be invoked with `agent.generate(prompt, { maxSteps: 12 })` (no `structuredOutput`)
- **AND** the website repair agent SHALL be invoked with `agent.generate(prompt)` (no `structuredOutput`, no `maxSteps`)

#### Scenario: Prepare-application JSON draft step parses JSON from response text

- **WHEN** `prepare-application.workflow.ts` invokes the JSON draft agent
- **THEN** the agent SHALL be invoked with `agent.generate(prompt)` (no `structuredOutput`)
- **AND** the draft object SHALL be derived from the JSON substring of `response.text`

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

#### Scenario: Social profile discovery disabled

- **WHEN** the user has not configured a Tavily key in web scrape settings
- **THEN** social profile discovery SHALL be skipped
- **AND** the workflow SHALL continue without failing the job

#### Scenario: Agent construction in image and PDF OCR tools uses v1 contract

- **WHEN** `transcribeImageResumeTool` or `transcribePdfWithVisionTool` constructs a Mastra `Agent`
- **THEN** the import SHALL come from `@mastra/core/agent`
- **AND** the constructor SHALL include the `id` field
- **AND** the call to `agent.generate([...])` SHALL continue to work with the v1 message-content shape

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

The `apps/import-agent` package SHALL export `runWebsiteImportWorkflow` accepting a source URL, Mastra model configuration, scrape tool configuration, and progress callback. The workflow SHALL: load page content via configured scrape tools or raw HTML fetch, draft JSON Resume via LLM, then run the same verify/repair loop (schema validation, date normalization, optional web lookup) as PDF import up to a bounded retry limit. Website draft instructions SHALL match text import rules for placing volunteer vs paid employment in `volunteer[]` and `work[]`.

#### Scenario: Website workflow produces draft JSON

- **WHEN** `runWebsiteImportWorkflow` completes a successful draft
- **THEN** the draft SHALL be a JSON object suitable for schema validation
- **AND** volunteer roles described on the page SHOULD appear in `volunteer[]` when the LLM follows instructions

#### Scenario: Website draft instructions separate volunteer from work

- **WHEN** `runWebsiteImportWorkflow` generates a draft
- **THEN** the website draft agent instructions SHALL require `volunteer[]` in the output shape
- **AND** SHALL direct volunteer/unpaid roles to `volunteer[]` rather than `work[]`

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

### Requirement: The import agent SHALL expose a social profile discovery tool

The import agent package SHALL register a **Discover social profiles** tool usable by PDF, text, and website import workflows. The tool SHALL accept the current draft `basics` (name, email, optional location), optional current employer from `work[0].name`, existing `basics.profiles`, and `searchApiKey`. It SHALL return an array of candidate profile objects and a count of profiles accepted after validation. When `searchApiKey` is absent, the tool SHALL return an empty result without throwing.

#### Scenario: Tool registered in tool registry

- **WHEN** a developer imports `toolRegistry` from `apps/import-agent`
- **THEN** a `discoverSocialProfiles` entry SHALL be available alongside existing tools

#### Scenario: Tool skips without API key

- **WHEN** `discoverSocialProfiles` is invoked without `searchApiKey`
- **THEN** it SHALL return `{ profiles: [], discoveredCount: 0, skipped: true }`

### Requirement: Text and PDF import workflows SHALL invoke social profile discovery before finalize

`runTextImportWorkflow` and workflows that delegate to it (PDF import, Markdown/free-text import) SHALL call social profile discovery after schema validation succeeds and before the finalize/progress `finalizing` step. The workflow SHALL merge returned profiles into the draft using shared merge logic that preserves existing entries.

#### Scenario: PDF workflow enriches profiles

- **WHEN** `runPdfImportWorkflow` completes with valid draft and Tavily key
- **THEN** the returned draft SHALL reflect merged discovered profiles when search finds matches

#### Scenario: Website workflow uses same discovery step

- **WHEN** `runWebsiteImportWorkflow` completes with valid draft and Tavily key
- **THEN** social profile discovery SHALL run with the same rules as PDF/text import
