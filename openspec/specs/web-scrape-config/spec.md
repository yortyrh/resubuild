# web-scrape-config Specification

## Purpose

TBD - created by archiving change url-import-web-scrape. Update Purpose after archive.

## Requirements

### Requirement: The system SHALL store per-user web scrape provider configuration with RLS

A table `public.web_scrape_config` MUST store at most one row per user with: `user_id` (uuid PK/FK to `auth.users`), `provider` (`firecrawl` | `tavily`), `api_key_encrypted` (text), `created_at`, and `updated_at`. RLS SHALL restrict SELECT, INSERT, UPDATE, and DELETE to rows where `auth.uid() = user_id`. API key plaintext MUST NOT be stored unencrypted.

#### Scenario: User reads own scrape config only

- **WHEN** a user's JWT queries `web_scrape_config`
- **THEN** only that user's row is visible

#### Scenario: Cross-tenant scrape config isolation

- **WHEN** user A attempts to read or update user B's configuration via Supabase with user A's token
- **THEN** no row for user B SHALL be returned or modified

### Requirement: The API SHALL expose authenticated web scrape configuration endpoints

Under `/web-scrape`, authenticated handlers SHALL provide:

- `GET /web-scrape/config` — `{ configured: boolean, provider?: 'firecrawl' | 'tavily' }` (never raw API key)
- `PUT /web-scrape/config` — body `{ provider: 'firecrawl' | 'tavily', apiKey: string }`; persist encrypted key
- `DELETE /web-scrape/config` — remove user's scrape configuration

The server SHALL encrypt API keys with the same application encryption key used for import LLM credentials (`AI_AGENT_ENCRYPTION_KEY` or legacy alias).

#### Scenario: Save Firecrawl configuration

- **WHEN** an authenticated user calls `PUT /web-scrape/config` with provider `firecrawl` and a non-empty API key
- **THEN** the API SHALL persist encrypted credentials
- **AND** subsequent `GET /web-scrape/config` SHALL return `configured: true` and `provider: firecrawl`

#### Scenario: Clear scrape configuration

- **WHEN** an authenticated user calls `DELETE /web-scrape/config`
- **THEN** the API SHALL remove the row
- **AND** `GET /web-scrape/config` SHALL return `configured: false`

### Requirement: The web app SHALL expose web scrape settings in AI agent settings

The dashboard settings surface for AI agent configuration SHALL include a **Website import (page extraction)** section where users select Firecrawl or Tavily and save an API key. When unset, URL import for HTML pages SHALL fall back to raw HTML fetch. The UI SHALL link from the URL import flow to this settings section.

#### Scenario: User configures Tavily for page extraction

- **WHEN** a signed-in user saves Tavily credentials in web scrape settings
- **THEN** the URL import form SHALL indicate Tavily is active for page extraction

#### Scenario: User clears scrape settings

- **WHEN** a signed-in user clears web scrape configuration
- **THEN** the URL import form SHALL indicate raw HTML extraction
