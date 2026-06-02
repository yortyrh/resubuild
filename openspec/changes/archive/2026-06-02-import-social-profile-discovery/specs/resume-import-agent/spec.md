## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: The agent SHALL expose reusable tools for resume verification

The import agent package SHALL register tools usable by the PDF workflow and future workflows:

- **Extract PDF text** — deterministic parsing from buffer to plain text.
- **Validate resume schema** — AJV against `packages/schemas/resume.schema.json`, returning paths and messages.
- **Normalize dates** — coerce JSON Resume date fields toward ISO-8601 partial dates consistent with editor rules.
- **Web lookup** (optional) — when the user has configured a Tavily API key in web scrape settings, resolve company or institution names to canonical URLs or disambiguation hints; when not configured, the tool SHALL skip without failing the job.
- **Discover social profiles** (optional) — when the user has configured a Tavily API key, search for the candidate's public social network profiles from draft identity signals and return validated `{ network, username, url }` entries for merge into `basics.profiles`; when not configured, the tool SHALL skip without failing the job.
- **Fetch HTML / scrape page** — load public HTTPS page content for website import (`fetch-html`, optional Firecrawl or Tavily extract when configured).

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
