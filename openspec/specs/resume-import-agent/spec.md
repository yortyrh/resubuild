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

The import agent package SHALL register tools usable by the PDF workflow and future workflows:

- **Extract PDF text** — deterministic parsing from buffer to plain text.
- **Validate resume schema** — AJV against `packages/schemas/resume.schema.json`, returning paths and messages.
- **Normalize dates** — coerce JSON Resume date fields toward ISO-8601 partial dates consistent with editor rules.
- **Web lookup** (optional) — when search API key is configured, resolve company or institution names to canonical URLs or disambiguation hints; when not configured, the tool SHALL skip without failing the job.

#### Scenario: Schema validation tool rejects invalid draft

- **WHEN** the draft step produces JSON missing required shape
- **THEN** the validate tool SHALL return structured errors for the repair step

#### Scenario: Web lookup disabled

- **WHEN** no search API key is configured
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
