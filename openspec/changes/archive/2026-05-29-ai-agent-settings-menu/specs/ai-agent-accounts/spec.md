## ADDED Requirements

### Requirement: Users SHALL manage multiple AI agent accounts with one active selection

The system SHALL allow each authenticated user to create, list, update, and delete **AI agent accounts**. Each account SHALL include an optional user-defined label, a catalog-valid `provider_id`, a Mastra-compatible `model_id`, and an encrypted API key. Exactly one account MAY be marked **active** per user via `ai_agent_preference.active_account_id`. All Mastra agent runs for that user (PDF import, future application/chat flows) SHALL use the active account’s `model_id` and decrypted API key. If no active account exists or the active account cannot be decrypted, AI features SHALL be treated as unconfigured.

#### Scenario: User adds a second provider account

- **WHEN** a signed-in user saves a new account with provider `google`, a catalog model, and a valid API key
- **THEN** the API SHALL persist the account encrypted at rest
- **AND** SHALL return the account in `GET /ai/agents/accounts` without the raw key

#### Scenario: User switches active account

- **WHEN** a user with two saved accounts calls `PUT /ai/agents/active` with a different `accountId`
- **THEN** subsequent agent runs SHALL use the newly selected account’s model and key

#### Scenario: Deleting the active account clears configuration

- **WHEN** a user deletes the currently active account and no other account is selected
- **THEN** `GET /ai/agents/active` SHALL report `configured: false`
- **AND** gated AI features SHALL reject requests until a new active account is set

### Requirement: The API SHALL expose a provider catalog for popular agentic stacks

Authenticated read endpoints SHALL list supported providers and models from the pinned `@resumind/import-models` catalog, including at minimum **Anthropic (Claude)**, **OpenAI (GPT / Codex-class models)**, **Google (Gemini)**, and **OpenRouter** as a gateway. Model ids SHALL use Mastra string form. The server SHALL NOT accept model ids outside the catalog.

#### Scenario: Client loads expanded provider list

- **WHEN** an authenticated user opens AI agent settings
- **THEN** `GET /ai/agents/providers` SHALL include anthropic, openai, google, and openrouter entries with human-readable names and API key field labels

#### Scenario: OpenRouter models use gateway prefix

- **WHEN** a user selects provider `openrouter` and a listed model
- **THEN** the saved `model_id` SHALL use the `openrouter/...` Mastra gateway form accepted by validation

### Requirement: Account save SHALL validate model and probe API key before persistence

Creating or updating an account with a new API key SHALL validate `model_id` against the catalog, run a minimal Mastra probe (`agent.generate('ping')` or equivalent), and return `422` on authentication failure. Responses SHALL never include plaintext keys. Updates MAY omit a new key when `keepExistingApiKey: true` and a decryptable key exists.

#### Scenario: Invalid key rejected on create

- **WHEN** a user submits a catalog-valid model and an API key that fails the probe
- **THEN** the API SHALL return `422`
- **AND** SHALL NOT persist the account

#### Scenario: Successful account saved and optionally activated

- **WHEN** model and key pass validation on create with `setActive: true`
- **THEN** the account SHALL be persisted
- **AND** SHALL become the user’s active account

### Requirement: Legacy import LLM config SHALL migrate to AI agent accounts

Existing rows in `import_llm_config` SHALL be migrated into `ai_agent_account` with label `Default` and set as the user’s active account. After migration, PDF import and other AI gates SHALL use the active account abstraction rather than reading `import_llm_config` directly.

#### Scenario: Existing PDF import user retains access after migration

- **WHEN** a user had valid `import_llm_config` before deployment
- **THEN** after migration they SHALL have `configured: true` on `GET /ai/agents/active` without re-entering their key
