## ADDED Requirements

### Requirement: AI agent accounts SHALL be stored with RLS per user

The database SHALL provide `public.ai_agent_account` with columns: `id` (uuid PK, default `gen_random_uuid()`), `user_id` (uuid FK to `auth.users`, not null), `label` (text, nullable), `provider_id` (text, not null), `model_id` (text, not null), `api_key_encrypted` (text, not null), `created_at` (timestamptz), and `updated_at` (timestamptz). Users MAY have multiple account rows. Plaintext API keys MUST NOT be stored. RLS SHALL restrict SELECT, INSERT, UPDATE, and DELETE to rows where `auth.uid() = user_id`.

#### Scenario: User reads own accounts only

- **WHEN** a user's JWT queries `ai_agent_account`
- **THEN** only rows with matching `user_id` SHALL be visible

#### Scenario: User cannot read another user's accounts

- **WHEN** user A's JWT attempts to select user B's account id
- **THEN** the query SHALL return no rows

### Requirement: Active AI agent selection SHALL be stored per user

The database SHALL provide `public.ai_agent_preference` with `user_id` (uuid PK FK to `auth.users`) and `active_account_id` (uuid FK to `ai_agent_account`, nullable, ON DELETE SET NULL), plus `updated_at`. RLS SHALL restrict all operations to `auth.uid() = user_id`. At most one preference row exists per user.

#### Scenario: Setting active account updates preference

- **WHEN** the API sets active account for a user
- **THEN** `ai_agent_preference.active_account_id` SHALL reference the chosen account or be null when unset

## MODIFIED Requirements

### Requirement: Import LLM configuration SHALL be stored with RLS per user

The legacy table `public.import_llm_config` SHALL be migrated into `ai_agent_account` and `ai_agent_preference` and MAY be dropped after successful migration. New features SHALL NOT write to `import_llm_config`. Encryption requirements for API keys remain unchanged.

#### Scenario: Migration preserves encrypted key

- **WHEN** deployment runs the AI agent accounts migration
- **THEN** each existing `import_llm_config` row SHALL become an `ai_agent_account` with the same `model_id` and `api_key_encrypted` payload
- **AND** SHALL be referenced as the user's active account in `ai_agent_preference`
