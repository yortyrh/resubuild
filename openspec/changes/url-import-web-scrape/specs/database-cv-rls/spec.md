## MODIFIED Requirements

### Requirement: The system SHALL store per-user import LLM configuration with RLS

A table (e.g. `public.import_llm_config`) MUST store at most one row per user with: `user_id` (uuid PK/FK to `auth.users`), `model_id` (text, Mastra model string), `api_key_encrypted` (text), `configured_at` (timestamptz), and `updated_at`. RLS SHALL restrict SELECT, INSERT, UPDATE, and DELETE to rows where `auth.uid() = user_id`. API key plaintext MUST NOT be stored unencrypted.

A table `public.web_scrape_config` MUST store at most one row per user with encrypted Firecrawl or Tavily API keys per `web-scrape-config`. RLS policies SHALL mirror import LLM configuration isolation.

#### Scenario: User reads own config only

- **WHEN** a user's JWT queries `import_llm_config`
- **THEN** only that user's row is visible

#### Scenario: Cross-tenant config isolation

- **WHEN** user A attempts to read or update user B's configuration via Supabase with user A's token
- **THEN** no row for user B SHALL be returned or modified
