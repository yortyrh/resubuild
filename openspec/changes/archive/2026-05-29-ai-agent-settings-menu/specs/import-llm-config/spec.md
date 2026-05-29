## MODIFIED Requirements

### Requirement: PDF import SHALL remain unavailable until the user configures a valid LLM

The product SHALL treat PDF import as **inactive** for a user until they have an **active AI agent account** with a Mastra-compatible model id and valid API key (see `ai-agent-accounts`). The new-CV PDF import UI SHALL show a setup prompt linking to **AI agent settings** when no active account is configured. The API SHALL reject `POST /cv/import/pdf` with `403` or `422` and a clear message when no active account is available.

#### Scenario: User without LLM config sees setup prompt

- **WHEN** a signed-in user opens the PDF import path without an active AI agent account
- **THEN** the UI SHALL NOT offer file upload for import
- **AND** SHALL direct the user to AI agent settings via the user menu or inline link

#### Scenario: Import blocked without configuration

- **WHEN** a client calls `POST /cv/import/pdf` without a valid active AI agent account for that user
- **THEN** the API SHALL NOT enqueue a job
- **AND** SHALL return an error indicating AI agent configuration is required

### Requirement: The API SHALL expose provider and model catalogs aligned with Mastra

The API SHALL expose read-only authenticated endpoints to drive configuration UI. Primary routes live under `/ai/agents/providers` and `/ai/agents/providers/:providerId/models`. Deprecated aliases `/import/llm/providers` and `/import/llm/providers/:providerId/models` MAY delegate to the same catalog for backward compatibility. Model ids SHALL use Mastra string form. The server SHALL NOT accept arbitrary model strings outside the pinned catalog except where the catalog explicitly marks a provider as gateway-prefixed.

#### Scenario: Client loads provider list

- **WHEN** an authenticated user opens AI agent settings
- **THEN** the client SHALL fetch providers from `/ai/agents/providers` (or legacy alias) and render a provider picker before model selection

#### Scenario: Client loads models for selected provider

- **WHEN** the user selects provider `openai`
- **THEN** the client SHALL fetch only models listed for `openai` in the catalog
- **AND** SHALL NOT allow submitting a model id outside that list

### Requirement: Saved LLM settings SHALL validate model id and API key before activation

Account create/update endpoints under `/ai/agents/accounts` SHALL accept `{ modelId, apiKey?, keepExistingApiKey?, label?, setActive? }` where `modelId` is the full Mastra model string. The server SHALL parse, validate against catalog, probe keys, encrypt at rest, and support active selection. Legacy `PUT /import/llm/config` MAY map to create-or-update the sole/default account for compatibility.

#### Scenario: Invalid model id rejected

- **WHEN** a user submits `modelId` `gpt-4o-mini` without provider prefix
- **THEN** the API SHALL return `400` with a message that the model must use Mastra form `provider/model-name`

#### Scenario: Model not in catalog rejected

- **WHEN** a user submits `openai/nonexistent-model-xyz`
- **THEN** the API SHALL return `400` indicating the model is not supported

#### Scenario: Invalid API key rejected

- **WHEN** a user submits a catalog-valid model and an API key that fails the probe request
- **THEN** the API SHALL return `422` and SHALL NOT mark the account as usable

#### Scenario: Valid configuration saved

- **WHEN** model and API key pass validation and the account is set active
- **THEN** the API SHALL persist settings for that user
- **AND** subsequent PDF import requests SHALL use the active account’s model and decrypted key

### Requirement: The web app SHALL implement a provider-first configuration flow

AI agent settings UI SHALL follow provider → model → API key order. Copy SHALL name the expected credential per provider (e.g. “Anthropic API key”, “OpenAI API key”) and explain that users supply **API keys from providers they subscribe to** (BYOK). The UI SHALL use server-provided model lists, not unvalidated free text. Users SHALL manage multiple accounts and designate which is active.

#### Scenario: User completes setup in order

- **WHEN** a user configures AI for the first time
- **THEN** they SHALL select a provider, then a model from the loaded list, then enter the matching API key
- **AND** on success SHALL be able to use PDF import on `/dashboard/cv/new`

#### Scenario: User updates model without re-entering key

- **WHEN** a user edits an existing account and changes only the model within the same provider while omitting a new API key
- **THEN** the client MAY submit with `keepExistingApiKey: true`
- **AND** the server SHALL re-validate the new model against the catalog before saving
