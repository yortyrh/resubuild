# Database CV storage and RLS

## Purpose

Define the canonical shape of persisted CV records and the Postgres row-level guarantees so each user only reads and writes their own data when the API uses a user-scoped Supabase client.

## Requirements

### Requirement: The system SHALL store each CV as a row in `public.cv` with JSON document body

The `public.cv` table MUST include `id` (uuid PK), `user_id` (uuid FK to `auth.users`), JSON Resume `basics` scalar columns (`name`, `label`, `image`, `email`, `phone`, `url`, `summary`), `location jsonb` (default `'{}'::jsonb`), optional legacy columns (`meta_version`, `meta_canonical`, `meta_last_modified`), and `created_at` / `updated_at` timestamps with an index on `(user_id, updated_at desc)` and a trigger to maintain `updated_at` on update. Current application code SHALL NOT populate the `meta_*` columns on insert or update. The table SHALL NOT include a `title` column after cutover. Multi-valued resume sections MUST live in normalized child tables (see `cv-normalized-schema`), not in a `data` jsonb column after cutover.

#### Scenario: Schema matches migration

- **WHEN** migrations are applied as in `supabase/migrations/`
- **THEN** the `public.cv` table exists with the header columns described above, normalized section tables exist with foreign keys to `cv.id`, and `updated_at` is set automatically on row updates

#### Scenario: No jsonb document column after cutover

- **WHEN** the normalized storage migration is complete
- **THEN** `public.cv` SHALL NOT contain a `data` jsonb column
- **AND** `public.cv` SHALL NOT contain a `title` column

#### Scenario: Meta columns unused by management layer

- **WHEN** a CV is created or updated through Nest management APIs
- **THEN** `meta_version`, `meta_canonical`, and `meta_last_modified` SHALL remain null or unchanged from prior values
- **AND** API responses SHALL NOT expose JSON Resume `meta` derived from those columns

### Requirement: Row Level Security MUST restrict `public.cv` to the owning user

RLS SHALL be enabled on `public.cv` and every normalized CV child table with policies for SELECT, INSERT, UPDATE, and DELETE such that only rows linked to a `cv` record where `auth.uid() = user_id` are visible or mutable, using `WITH CHECK` on insert/update as appropriate.

#### Scenario: Cross-tenant isolation on cv header

- **WHEN** a user's JWT is presented to Supabase for queries against `cv`
- **THEN** the user SHALL only see or modify rows whose `user_id` matches their `auth.uid()`, regardless of knowing another row's `id`

#### Scenario: Cross-tenant isolation on section rows

- **WHEN** a user's JWT is presented for queries against `cv_work` (or any other normalized section table)
- **THEN** the user SHALL only see or modify rows whose parent `cv.user_id` matches their `auth.uid()`

### Requirement: The system SHALL store per-user import LLM configuration with RLS

A table (e.g. `public.import_llm_config`) MUST store at most one row per user with: `user_id` (uuid PK/FK to `auth.users`), `model_id` (text, Mastra model string), `api_key_encrypted` (text), `configured_at` (timestamptz), and `updated_at`. RLS SHALL restrict SELECT, INSERT, UPDATE, and DELETE to rows where `auth.uid() = user_id`. API key plaintext MUST NOT be stored unencrypted.

A table `public.web_scrape_config` MUST store at most one row per user with encrypted Firecrawl or Tavily API keys per `web-scrape-config`. RLS policies SHALL mirror import LLM configuration isolation.

#### Scenario: User reads own config only

- **WHEN** a user's JWT queries `import_llm_config`
- **THEN** only that user's row is visible

#### Scenario: Cross-tenant config isolation

- **WHEN** user A attempts to read or update user B's configuration via Supabase with user A's token
- **THEN** no row for user B SHALL be returned or modified
