## ADDED Requirements

### Requirement: The API SHALL expose authenticated PDF import job endpoints

Under `/cv/import`, authenticated handlers SHALL provide `POST /cv/import/pdf` (multipart PDF upload, returns `{ jobId }` with 202) and `GET /cv/import/:jobId` (job status for the owning user). Handlers MUST use the caller's Supabase user client for ownership checks on created CVs. Import success SHALL create a CV through the same service path as `POST /cv` after `prepareImportedResume` and schema validation inside the agent finalize step. Import SHALL require valid per-user LLM configuration per `import-llm-config`.

Under `/import/llm`, authenticated handlers SHALL provide:

- `GET /import/llm/providers` — supported providers with API key field labels
- `GET /import/llm/providers/:providerId/models` — allowlisted Mastra model ids for that provider
- `GET /import/llm/config` — current user config status (model id, configured flag; never raw API key)
- `PUT /import/llm/config` — save model + API key with catalog validation and key probe

#### Scenario: Import creates CV via shared create semantics

- **WHEN** a PDF import job completes successfully
- **THEN** the persisted CV SHALL match the same meta, validation, and title derivation rules as direct `POST /cv`

#### Scenario: Import job unauthorized

- **WHEN** a client calls import routes without a bearer token
- **THEN** the response SHALL be 401

#### Scenario: Invalid model rejected on config save

- **WHEN** a client calls `PUT /import/llm/config` with a model id not in the pinned catalog
- **THEN** the API SHALL return `400` and SHALL NOT persist settings

## MODIFIED Requirements

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a row with empty `data`, merge schema meta via shared `@resumind/types` helpers, validate, then update the row with the validated document in a second step. The final update SHALL set `title` from `deriveCvTitleFromBasics` applied to the validated `data.basics` (ignoring client-supplied `title` when basics are present). The same insert–validate–update sequence SHALL apply when PDF import finalize invokes the create service internally.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics`
- **THEN** the response SHALL include the new row with persisted `data` including applied meta and schema-valid content
- **AND** `title` SHALL reflect the derived value from basics

#### Scenario: PDF import finalize uses create flow

- **WHEN** a PDF import job reaches finalize with schema-valid prepared data
- **THEN** the service SHALL persist the CV using the same create implementation as `POST /cv`
- **AND** the job result SHALL include the new `cvId`
