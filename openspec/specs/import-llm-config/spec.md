# Import LLM configuration

## Purpose

Specify per-user LLM settings required to activate PDF import: provider and model selection validated against the Mastra model router catalog, plus provider-scoped API key storage and verification.

## Requirements

### Requirement: PDF import SHALL remain unavailable until the user configures a valid LLM

The product SHALL treat PDF import as **inactive** for a user until they save a complete import LLM configuration: a Mastra-compatible model id (`provider/model-name` or `gateway/provider/model-name`), and an API key for the resolved provider. The new-CV PDF import UI SHALL show a setup prompt linking to configuration when settings are missing or invalid. The API SHALL reject `POST /cv/import/pdf` with `403` or `422` and a clear message when configuration is incomplete.

#### Scenario: User without LLM config sees setup prompt

- **WHEN** a signed-in user opens the PDF import path without saved LLM settings
- **THEN** the UI SHALL NOT offer file upload for import
- **AND** SHALL direct the user to configure provider, model, and API key

#### Scenario: Import blocked without configuration

- **WHEN** a client calls `POST /cv/import/pdf` without valid saved LLM settings for that user
- **THEN** the API SHALL NOT enqueue a job
- **AND** SHALL return an error indicating LLM configuration is required

### Requirement: The API SHALL expose provider and model catalogs aligned with Mastra

The API SHALL expose read-only endpoints (authenticated) to drive configuration UI:

- `GET /import/llm/providers` — curated list of supported providers/gateways with display name and required API key field label (mapped from Mastra `ProviderConfig.apiKeyEnvVar`, e.g. `OPENAI_API_KEY` → “OpenAI API key”).
- `GET /import/llm/providers/:providerId/models` — models allowed for that provider from a pinned catalog derived from Mastra’s model router / models.dev registry (not free-text entry).

Model ids returned SHALL use Mastra string form (`provider/model-name`). The server SHALL NOT accept arbitrary model strings outside the pinned catalog except where the catalog explicitly marks a provider as gateway-prefixed (`gateway/provider/model`).

#### Scenario: Client loads provider list

- **WHEN** an authenticated user opens import LLM settings
- **THEN** the client SHALL fetch providers and render a provider picker before model selection

#### Scenario: Client loads models for selected provider

- **WHEN** the user selects provider `openai`
- **THEN** the client SHALL fetch only models listed for `openai` in the catalog
- **AND** SHALL NOT allow submitting a model id outside that list

### Requirement: Saved LLM settings SHALL validate model id and API key before activation

`PUT /import/llm/config` (or equivalent) SHALL accept `{ modelId: string, apiKey: string }` where `modelId` is the full Mastra model string. The server SHALL:

1. Parse `modelId` into provider (and optional gateway) segments per Mastra routing rules.
2. Reject unknown providers or models not present in the pinned catalog (`400`).
3. Reject malformed model ids that do not match Mastra’s `provider/model` or `gateway/provider/model` pattern (`400`).
4. Verify the API key with a minimal provider probe (e.g. short `agent.generate` or provider list/models call via Mastra router) before persisting (`422` on auth failure).
5. Persist the API key encrypted at rest; responses SHALL never return the raw key.

#### Scenario: Invalid model id rejected

- **WHEN** a user submits `modelId` `gpt-4o-mini` without provider prefix
- **THEN** the API SHALL return `400` with a message that the model must use Mastra form `provider/model-name`

#### Scenario: Model not in catalog rejected

- **WHEN** a user submits `openai/nonexistent-model-xyz`
- **THEN** the API SHALL return `400` indicating the model is not supported for PDF import

#### Scenario: Invalid API key rejected

- **WHEN** a user submits a catalog-valid model and an API key that fails the probe request
- **THEN** the API SHALL return `422` and SHALL NOT mark PDF import as enabled

#### Scenario: Valid configuration saved

- **WHEN** model and API key pass validation
- **THEN** the API SHALL persist settings for that user
- **AND** subsequent PDF import requests SHALL use the saved `modelId` and decrypted key for Mastra agent runs

### Requirement: The web app SHALL implement a provider-first configuration flow

Import LLM settings UI SHALL follow provider → model → API key order (not API key before provider). Copy SHALL name the expected credential per provider (e.g. “OpenAI API key”, “Anthropic API key”) matching Mastra’s documented env var mapping. The UI SHALL use server-provided model lists (combobox/select), not unvalidated free text, for v1.

#### Scenario: User completes setup in order

- **WHEN** a user configures PDF import for the first time
- **THEN** they SHALL select a provider, then a model from the loaded list, then enter the matching API key
- **AND** on success SHALL be able to use PDF import on `/dashboard/cv/new`

#### Scenario: User updates model without re-entering key

- **WHEN** a user changes only the model within the same provider and omits a new API key
- **THEN** the client MAY resubmit with a sentinel indicating “keep existing key”
- **AND** the server SHALL re-validate the new model against the catalog before saving

### Requirement: The import LLM model catalog SHALL be refreshable from models.dev

The API SHALL maintain an in-memory import model catalog built from the models.dev registry when network access is available, with a pinned fallback catalog loaded at startup if fetch fails. A scheduled job SHALL refresh the catalog daily. `GET /import/llm/providers/:providerId/models` SHALL return models from the active catalog. Configuration save (`PUT /import/llm/config`) SHALL validate model ids against the active catalog.

Environment variable `IMPORT_MODELS_STATIC_ONLY=true` SHALL skip network fetch and use only the fallback catalog.

#### Scenario: Startup with models.dev available

- **WHEN** the API starts and models.dev is reachable
- **THEN** the active catalog SHALL be built from the remote registry
- **AND** `GET /import/llm/providers/:providerId/models` SHALL list models from that catalog

#### Scenario: Startup when models.dev fails

- **WHEN** the API starts and models.dev is unreachable
- **THEN** the active catalog SHALL use the fallback catalog
- **AND** import LLM routes SHALL remain available

#### Scenario: Invalid model rejected after refresh

- **WHEN** a client saves config with a model id not in the active catalog
- **THEN** the API SHALL return 400
