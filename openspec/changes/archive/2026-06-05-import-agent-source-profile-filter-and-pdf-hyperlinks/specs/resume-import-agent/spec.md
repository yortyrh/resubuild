## MODIFIED Requirements

### Requirement: PDF import SHALL run as a Mastra workflow in a dedicated workspace

The repository SHALL include `apps/import-agent` exporting a PDF import workflow invoked by `apps/api`. The workflow SHALL compose discrete steps (extract, draft, verify/repair loop, finalize) rather than a single monolithic prompt. Workflow code SHALL be unit-testable with mocked LLM and search dependencies. The text import draft step (shared by PDF, Markdown, DOCX, and image after transcription) SHALL instruct the LLM to place unpaid, volunteer, community-service, and pro-bono roles in `volunteer[]` and paid employment in `work[]`, using ISO-8601 partial dates for date fields. The PDF, website, and prepare-application workflow agents SHALL invoke `agent.generate(prompt)` and parse the JSON Resume object from `response.text` using the existing `parseJsonFromAgentText` / `indexOf('{') … lastIndexOf('}')` helper. The workflows SHALL NOT pass a `structuredOutput` option to `agent.generate(...)`; under `@mastra/core@1.38.0` the public `Agent#generate` overload used by these workflows does not expose a `structuredOutput` key, and any `structuredOutput` argument is silently ignored. The JSON-in-text parse path is the source of truth for the workflow output. The website import workflow's draft agent MAY still pass `{ maxSteps: MAX_AGENT_STEPS }` to `agent.generate`; the `maxSteps` option is on the supported v1 surface. The `agent.id` field requirement added by the `upgrade-mastra-v1-and-deps` change is preserved.

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
