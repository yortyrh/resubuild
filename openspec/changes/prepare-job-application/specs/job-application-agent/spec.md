## ADDED Requirements

### Requirement: Job application preparation SHALL run as Mastra workflows in the import-agent workspace

The `apps/import-agent` package SHALL export a prepare-application workflow runner invoked by Nest with: normalized job posting input, optional user message, the user's CV summaries for matching, and the active account's Mastra `model_id` plus decrypted API key from `AiAgentCredentialService`. The workflow SHALL NOT use server-wide LLM secrets for end-user runs.

#### Scenario: API invokes workflow with active AI agent account

- **WHEN** Nest starts a prepare job for an authenticated user with a valid active AI agent account
- **THEN** the workflow runner SHALL receive `model: { id, apiKey }` from that account

#### Scenario: Workflow modules are testable in isolation

- **WHEN** unit tests run in `apps/import-agent`
- **THEN** workflow steps SHALL be executable with mocked LLM and mocked fetch without starting Nest

### Requirement: The workflow SHALL normalize job postings from URL, text, PDF, and image inputs

The first workflow stage SHALL produce plain-text job description content suitable for downstream LLM steps. URL input SHALL fetch HTTPS content with size and timeout limits. PDF input SHALL reuse PDF text extraction tooling from resume import. Image input SHALL use a vision-capable model step to transcribe job content. Text input SHALL pass through unchanged.

#### Scenario: PDF job posting extracted

- **WHEN** the user uploads a PDF job description
- **THEN** the workflow SHALL extract text before summarize/tailor steps

#### Scenario: URL fetch failure surfaces error

- **WHEN** URL fetch fails or returns unusable content
- **THEN** the job SHALL fail with a structured error suggesting pasted text fallback

### Requirement: The workflow SHALL select the best-matching base CV for the user

Given extracted job content, optional user message, and a list of the user's CVs (header fields plus concise section summaries), an LLM step SHALL choose one `source_cv_id`. The choice rationale SHALL be included in the first assistant chat message.

#### Scenario: Multiple CVs ranked

- **WHEN** a user owns two or more CVs and submits a frontend-developer job posting
- **THEN** the workflow SHALL select the CV whose content best matches the posting
- **AND** SHALL record which id was selected

#### Scenario: Single CV auto-selected

- **WHEN** a user owns exactly one CV
- **THEN** the workflow SHALL select that CV without user intervention

### Requirement: The workflow SHALL clone and tailor the selected CV

After selection, the server SHALL deep-copy normalized CV rows to a new clone linked by `source_cv_id`. A tailor step SHALL apply structured patches: update `basics.label` to align with the job title when appropriate, add Markdown bold emphasis to relevant summary and highlight strings, and move irrelevant highlight strings from `highlights` to `inactive_highlights`. All mutations SHALL pass schema validation before persist.

#### Scenario: Label updated for target role

- **WHEN** the job posting title is "Senior Product Designer" and the base CV label differs
- **THEN** the tailored clone SHALL update `basics.label` toward the posting-aligned headline

#### Scenario: Irrelevant highlight deactivated

- **WHEN** a work highlight does not support the target job
- **THEN** the string SHALL be removed from `highlights` and stored in `inactive_highlights` for that row

#### Scenario: Relevant highlight bolded

- **WHEN** a highlight mentions a skill required in the job posting
- **THEN** the tailored clone MAY wrap matching phrases in Markdown bold without breaking JSON Resume string type

### Requirement: The workflow SHALL draft a presentation letter

After tailoring, an LLM step SHALL generate a presentation letter using the job summary and tailored CV content. The letter SHALL be stored on `job_application.cover_letter` as plain text (Markdown allowed).

#### Scenario: Letter persisted on success

- **WHEN** the workflow completes
- **THEN** `cover_letter` SHALL contain a multi-paragraph draft suitable for copy or PDF export

### Requirement: Chat turns SHALL revise the letter and tailored CV through validated tools

`POST /applications/:id/chat` SHALL append a user message, run a Mastra agent turn with tools to patch `cover_letter` and apply CV patches to `tailored_cv_id`, validate results, persist assistant reply and mutations, and return updated application state. Chat SHALL require the same active AI agent account as prepare per `ai-agent-accounts`.

#### Scenario: User asks to shorten the letter

- **WHEN** a user sends a chat message requesting a shorter presentation letter
- **THEN** the assistant response SHALL reflect an updated `cover_letter` stored on the application

#### Scenario: User asks to emphasize a skill on the clone

- **WHEN** a user asks to highlight a specific technology on the tailored CV
- **THEN** the agent SHALL apply validated CV patches to the clone and confirm in the assistant message

#### Scenario: Chat blocked without active AI agent account

- **WHEN** a user without an active AI agent account sends a chat message
- **THEN** the API SHALL reject the request with `403` or `422` and a configuration-required message
