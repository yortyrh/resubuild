## ADDED Requirements

### Requirement: Job application preparation SHALL run as a one-shot Mastra workflow in the import-agent workspace

The `apps/import-agent` package SHALL export a prepare-application workflow runner invoked by Nest with: normalized job posting input, optional user message, the user's CV summaries for matching, and the active account's Mastra `model_id` plus decrypted API key from `AiAgentCredentialService`. The workflow SHALL complete in a single run and SHALL NOT expose chat or multi-turn agents. The workflow SHALL NOT use server-wide LLM secrets for end-user runs.

#### Scenario: API invokes workflow with active AI agent account

- **WHEN** Nest starts a prepare job for an authenticated user with a valid active AI agent account
- **THEN** the workflow runner SHALL receive `model: { id, apiKey }` from that account

#### Scenario: Workflow modules are testable in isolation

- **WHEN** unit tests run in `apps/import-agent`
- **THEN** workflow steps SHALL be executable with mocked LLM and mocked fetch without starting Nest

### Requirement: The workflow SHALL normalize job postings from URL, text, PDF, and image inputs

The first workflow stage SHALL produce plain-text job description content suitable for downstream LLM steps. URL input SHALL fetch HTTPS content with size and timeout limits. PDF input SHALL reuse PDF text extraction tooling from resume import (max 5 MB). Image input SHALL use a vision-capable model step to transcribe job content (max 5 MB). Text input SHALL pass through unchanged.

#### Scenario: PDF job posting extracted

- **WHEN** the user uploads a PDF job description
- **THEN** the workflow SHALL extract text before summarize/tailor steps

#### Scenario: URL fetch failure surfaces error

- **WHEN** URL fetch fails or returns unusable content
- **THEN** the job SHALL fail with a structured error suggesting pasted text fallback

### Requirement: The workflow SHALL select the best-matching base CV for the user

When prepare intake does not include `sourceCvId`, given extracted job content, optional user message, and a list of the user's CVs (header fields plus concise section summaries), an LLM step SHALL choose one `source_cv_id`. The choice rationale SHALL be persisted on `job_application.selection_rationale`. When intake includes a valid user-owned `sourceCvId`, the workflow SHALL use it directly and skip ranking.

#### Scenario: Multiple CVs ranked

- **WHEN** a user owns two or more CVs, submits a frontend-developer job posting, and does not pick a base CV
- **THEN** the workflow SHALL select the CV whose content best matches the posting
- **AND** SHALL record which id was selected

#### Scenario: User-selected base CV

- **WHEN** prepare intake includes `sourceCvId` for a CV owned by the user
- **THEN** the workflow SHALL use that id as `source_cv_id`
- **AND** SHALL NOT invoke the rank step

#### Scenario: Single CV auto-selected

- **WHEN** a user owns exactly one CV and does not pick a base CV
- **THEN** the workflow SHALL select that CV without user intervention

### Requirement: Source-CV utilities SHALL load sections from the original CV

The workflow and API SHALL provide read utilities for Work, Volunteer, Project, and basics from `source_cv_id` without mutating the source. The application workspace SHALL use the same data (via existing `GET /cv/:sourceCvId/...` routes) for read-only preview and copy-into-clone flows.

#### Scenario: Tailor reads source before editing clone highlights

- **WHEN** the tailor step evaluates which bullets to drop from the clone
- **THEN** it MAY load highlight text from the source CV for comparison
- **AND** SHALL apply changes only by updating the clone's `highlights` arrays

### Requirement: The workflow SHALL clone and tailor the selected CV

After selection, the server SHALL deep-copy normalized CV rows to a new clone linked by `source_cv_id`. A tailor step SHALL apply structured patches **on the clone only**: update `basics.label`, add Markdown bold in summaries/highlights, and set reduced `highlights` arrays (irrelevant bullets omitted). All mutations SHALL pass schema validation. The source CV SHALL NOT be modified.

#### Scenario: Label updated for target role

- **WHEN** the job posting title is "Senior Product Designer" and the base CV label differs
- **THEN** the tailored clone SHALL update `basics.label` toward the posting-aligned headline

#### Scenario: Irrelevant highlight dropped from clone

- **WHEN** a work highlight does not support the target job
- **THEN** on the clone the string SHALL be absent from that row's `highlights` array
- **AND** the source CV's `highlights` SHALL remain unchanged

#### Scenario: Relevant highlight bolded

- **WHEN** a highlight mentions a skill required in the job posting
- **THEN** the tailored clone MAY wrap matching phrases in Markdown bold without breaking JSON Resume string type

### Requirement: The workflow SHALL draft a cover letter as Markdown

After tailoring, an LLM step SHALL generate a cover letter using the job summary and tailored CV content. The letter SHALL be written in the **job posting language** detected during normalize/summarize unless the optional user message explicitly requests another language. The letter SHALL be stored on `job_application.cover_letter` as **Markdown** suitable for rich-text clipboard copy or PDF export.

#### Scenario: Letter persisted on success

- **WHEN** the workflow completes
- **THEN** `cover_letter` SHALL contain a multi-paragraph Markdown draft in the posting language (or user-requested language from message)

#### Scenario: User message overrides letter language

- **WHEN** the optional user message asks for the letter in a specific language
- **THEN** the draft step SHALL generate the letter in that language regardless of posting language
