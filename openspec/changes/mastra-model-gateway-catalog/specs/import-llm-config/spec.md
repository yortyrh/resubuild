## MODIFIED Requirements

### Requirement: The import LLM model catalog SHALL be refreshable from models.dev

The API SHALL maintain an in-memory import model catalog built from the Mastra `MastraModelGateway`-accepted provider/model set, enriched with model metadata fetched from `https://models.dev/api.json` so the chat-capable filter and PDF-import score can be applied, and intersected with the gateway so the active catalog contains only providers and models the gateway accepts. A pinned fallback catalog loaded at startup SHALL be used if the metadata fetch fails. A scheduled job SHALL refresh the catalog daily. `GET /import/llm/providers/:providerId/models` SHALL return models from the active catalog. Configuration save (`PUT /import/llm/config`) SHALL validate model ids against the active catalog.

The `MastraModelGateway` SHALL be injectable (a `setGateway()` method or constructor argument) so tests and alternative backends (e.g. a Netlify gateway) can substitute the default `modelsDevGateway` without code changes. The default gateway implementation SHALL source its accepted provider/model list from `@mastra/core`'s public `PROVIDER_REGISTRY`.

Each provider entry in the active catalog SHALL use the gateway's `apiKeyEnvVar` (normalized to a string array) for its `env` field when present, falling back to the raw `models.dev` provider `env` array when the gateway exposes no value.

The runtime status `source` field SHALL be `'mastra-gateway'` when the catalog is built from the gateway-backed fetch, and `'fallback'` when the bundled catalog is used.

The `MODELS_DEV_API_URL` environment variable SHALL NOT be read by the API; the upstream URL is owned by the gateway.

#### Scenario: Startup with Mastra gateway available

- **WHEN** the API starts and the gateway-backed metadata fetch succeeds
- **THEN** the active catalog SHALL contain only providers whose id is in the gateway's accepted set
- **AND** for each accepted provider, only models whose id is in the gateway's accepted set SHALL be included
- **AND** each provider's `env` array SHALL equal the gateway's `apiKeyEnvVar` when present
- **AND** the status `source` SHALL be `'mastra-gateway'`
- **AND** `GET /import/llm/providers/:providerId/models` SHALL list models from that catalog

#### Scenario: Startup when metadata fetch fails

- **WHEN** the API starts and the gateway-backed fetch fails (network error, non-2xx response)
- **THEN** the active catalog SHALL use the fallback catalog
- **AND** import LLM routes SHALL remain available
- **AND** the status `source` SHALL be `'fallback'`

#### Scenario: Provider accepted by gateway but absent from models.dev metadata

- **WHEN** the gateway accepts a provider that models.dev has no entry for
- **THEN** that provider SHALL be excluded from the active catalog
- **AND** `/import/llm/providers` SHALL NOT list it

#### Scenario: Model accepted by gateway but absent from models.dev metadata

- **WHEN** the gateway accepts a model that models.dev has no metadata for
- **THEN** that model SHALL be excluded from the active catalog
- **AND** `/import/llm/providers/:providerId/models` SHALL NOT include it

#### Scenario: Invalid model rejected after refresh

- **WHEN** a client saves config with a model id not in the active catalog
- **THEN** the API SHALL return 400
