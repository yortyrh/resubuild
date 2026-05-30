## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: The agent SHALL expose reusable tools for resume verification

The import agent package SHALL register tools usable by the PDF workflow and future workflows:

- **Extract PDF text** — deterministic parsing from buffer to plain text.
- **Validate resume schema** — AJV against `packages/schemas/resume.schema.json`, returning paths and messages.
- **Normalize dates** — coerce JSON Resume date fields toward ISO-8601 partial dates consistent with editor rules.
- **Web lookup** (optional) — when the user has configured a Tavily API key in web scrape settings, resolve company or institution names to canonical URLs or disambiguation hints; when not configured, the tool SHALL skip without failing the job.
- **Fetch HTML / scrape page** — load public HTTPS page content for website import (`fetch-html`, optional Firecrawl or Tavily extract when configured).

#### Scenario: Schema validation tool rejects invalid draft

- **WHEN** the draft step produces JSON missing required shape
- **THEN** the validate tool SHALL return structured errors for the repair step

#### Scenario: Web lookup disabled

- **WHEN** the user has not configured a Tavily key in web scrape settings
- **THEN** the workflow SHALL continue without web enrichment
