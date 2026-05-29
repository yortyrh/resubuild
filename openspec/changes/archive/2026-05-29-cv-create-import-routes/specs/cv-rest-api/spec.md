## MODIFIED Requirements

### Requirement: The API SHALL expose authenticated PDF import job endpoints

Under `/cv/import`, authenticated handlers SHALL provide:

- `POST /cv/import/pdf` — multipart PDF upload, returns `{ jobId }` with 202
- `POST /cv/import/markdown` — multipart Markdown upload, returns `{ jobId }` with 202
- `POST /cv/import/from-url` — JSON body `{ url }`, returns `{ data }` with 200 (synchronous fetch + validate)
- `GET /cv/import/:jobId` — job status for the owning user

Handlers MUST use the caller's Supabase user client for ownership checks on created CVs. Async import success (PDF, Markdown) SHALL create a CV through the same service path as `POST /cv` after `prepareImportedResume` and schema validation inside the agent finalize step. Import SHALL require valid per-user LLM configuration per `import-llm-config` for async agent imports. URL import SHALL NOT require LLM configuration.

For `POST /cv/import/from-url`, when the URL host is `registry.jsonresume.org` and the pathname does not end with `.json`, the service SHALL fetch the URL with `.json` appended to the pathname before validation.

Under `/import/llm`, authenticated handlers SHALL provide:

- `GET /import/llm/providers` — supported providers with API key field labels
- `GET /import/llm/providers/:providerId/models` — allowlisted Mastra model ids for that provider
- `GET /import/llm/config` — current user config status (model id, configured flag; never raw API key)
- `PUT /import/llm/config` — save model + API key with catalog validation and key probe

#### Scenario: Import creates CV via shared create semantics

- **WHEN** a PDF or Markdown import job completes successfully
- **THEN** the persisted CV SHALL match the same meta, validation, and title derivation rules as direct `POST /cv`

#### Scenario: Import job unauthorized

- **WHEN** a client calls import routes without a bearer token
- **THEN** the response SHALL be 401

#### Scenario: Invalid model rejected on config save

- **WHEN** a client calls `PUT /import/llm/config` with a model id not in the pinned catalog
- **THEN** the API SHALL return `400` and SHALL NOT persist settings

#### Scenario: Registry profile URL import succeeds

- **WHEN** a client calls `POST /cv/import/from-url` with `{ url: "https://registry.jsonresume.org/thomasdavis" }`
- **THEN** the API SHALL fetch the corresponding `.json` endpoint and return normalized `{ data }`

#### Scenario: Markdown import job start

- **WHEN** an authenticated client uploads a valid Markdown file to `POST /cv/import/markdown`
- **THEN** the API SHALL return `202` with `{ jobId }`
