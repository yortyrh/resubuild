## MODIFIED Requirements

### Requirement: PDF import SHALL run as a Mastra workflow in a dedicated workspace

The repository SHALL include `apps/import-agent` exporting a PDF import workflow invoked by `apps/api`. The workflow SHALL compose discrete steps (extract, draft, verify/repair loop, finalize) rather than a single monolithic prompt. Workflow code SHALL be unit-testable with mocked LLM and search dependencies. The text import draft step (shared by PDF, Markdown, DOCX, and image after transcription) SHALL instruct the LLM to place unpaid, volunteer, community-service, and pro-bono roles in `volunteer[]` and paid employment in `work[]`, using ISO-8601 partial dates for date fields.

#### Scenario: Workflow invoked from API

- **WHEN** the API starts a PDF import job
- **THEN** it SHALL call the exported workflow runner with the PDF buffer, user context, and the user's saved Mastra `model_id` plus API key passed as Mastra `model: { id, apiKey }`
- **AND** the runner SHALL update job progress labels through the job store

#### Scenario: Unit tests without live LLM

- **WHEN** developers run `apps/import-agent` tests in CI
- **THEN** tests SHALL use fixture PDF text and mocked model responses without requiring API keys

#### Scenario: Draft instructions separate volunteer from work

- **WHEN** `runTextImportWorkflow` generates a draft from plain text
- **THEN** the draft agent instructions SHALL require `volunteer[]` in the output shape
- **AND** SHALL direct volunteer/unpaid roles to `volunteer[]` rather than `work[]`

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
