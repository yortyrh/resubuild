## MODIFIED Requirements

### Requirement: The API SHALL expose authenticated PDF import job endpoints

Under `/cv/import`, authenticated handlers SHALL provide:

- `POST /cv/import/pdf` — multipart PDF upload, returns `{ jobId }` with 202
- `POST /cv/import/markdown` — multipart Markdown upload, returns `{ jobId }` with 202
- `POST /cv/import/from-url` — JSON body `{ url }`; returns either `{ kind: 'json', data }` with 200 when the URL yields valid JSON Resume synchronously, or `{ kind: 'job', jobId }` with 200 when an agent job is started for HTML/non-JSON pages
- `GET /cv/import/:jobId` — job status for the owning user, including optional `previewData` on website import success before CV create

Handlers MUST use the caller's Supabase user client for ownership checks on created CVs. Async PDF and Markdown import success SHALL create a CV through the same service path as `POST /cv` after `prepareImportedResume` and schema validation inside the agent finalize step. Website import jobs SHALL NOT create a CV automatically; they SHALL populate `previewData` for client-side confirmation. Agent-based imports (PDF, Markdown, HTML URL) SHALL require valid per-user LLM configuration per `import-llm-config`. Synchronous JSON URL import SHALL NOT require LLM configuration.

For `POST /cv/import/from-url`, when the URL host is `registry.jsonresume.org` and the pathname does not end with `.json`, the service SHALL fetch the URL with `.json` appended to the pathname before validation.

Under `/import/llm`, authenticated handlers SHALL provide:

- `GET /import/llm/providers` — supported providers with API key field labels
- `GET /import/llm/providers/:providerId/models` — allowlisted Mastra model ids for that provider
- `GET /import/llm/config` — current user config status (model id, configured flag; never raw API key)
- `PUT /import/llm/config` — save model + API key with catalog validation and key probe

Under `/web-scrape`, authenticated handlers SHALL provide web scrape configuration per `web-scrape-config`.

#### Scenario: Import creates CV via shared create semantics

- **WHEN** a PDF or Markdown import job completes successfully
- **THEN** the persisted CV SHALL match the same meta, validation, and title derivation rules as direct `POST /cv`

#### Scenario: Website import returns preview without CV

- **WHEN** a website import job completes successfully
- **THEN** `GET /cv/import/:jobId` SHALL have `status: succeeded` and `previewData` set
- **AND** SHALL NOT include `cvId` until the client creates a CV separately

#### Scenario: JSON URL import synchronous

- **WHEN** a client calls `POST /cv/import/from-url` with a URL returning valid JSON Resume
- **THEN** the API SHALL respond with `{ kind: 'json', data }` without enqueueing a job

#### Scenario: HTML URL starts agent job

- **WHEN** a client calls `POST /cv/import/from-url` with a URL returning HTML and the user has valid LLM configuration
- **THEN** the API SHALL respond with `{ kind: 'job', jobId }`
- **AND** SHALL start `runWebsiteImportWorkflow` asynchronously

#### Scenario: Import job unauthorized

- **WHEN** a client calls import routes without a bearer token
- **THEN** the response SHALL be 401

#### Scenario: Invalid model rejected on config save

- **WHEN** a client calls `PUT /import/llm/config` with a model id not in the pinned catalog
- **THEN** the API SHALL return `400` and SHALL NOT persist settings

#### Scenario: Registry profile URL import succeeds

- **WHEN** a client calls `POST /cv/import/from-url` with `{ url: "https://registry.jsonresume.org/thomasdavis" }`
- **THEN** the API SHALL fetch the corresponding `.json` endpoint and return `{ kind: 'json', data }`
