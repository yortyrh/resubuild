## MODIFIED Requirements

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
