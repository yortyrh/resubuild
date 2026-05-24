# CV REST API

## Purpose

Specify the NestJS HTTP surface for listing, reading, creating, updating, and deleting CVs, including request validation, optimistic concurrency hints, and integration with Supabase for persistence.
## Requirements
### Requirement: All `/cv` routes MUST require authentication

The `CvController` SHALL apply the Supabase auth guard to every handler so unauthenticated requests never reach service logic.

#### Scenario: No bearer token

- **WHEN** a client calls any `/cv` route without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: The API SHALL expose CRUD endpoints for CVs scoped to the authenticated user

Handlers MUST implement `GET /cv`, `GET /cv/:id`, `POST /cv`, `PATCH /cv/:id`, and `DELETE /cv/:id`, using a per-user Supabase client created with the caller’s access token so RLS applies.

#### Scenario: List CVs

- **WHEN** an authenticated client calls `GET /cv`
- **THEN** the service SHALL return CV rows for that user ordered by `updated_at` descending

#### Scenario: Missing CV

- **WHEN** `GET /cv/:id` or a mutating operation targets an id that does not exist or is not owned (RLS empty result)
- **THEN** the API SHALL respond with 404 and a CV not found message where implemented

### Requirement: Create and update payloads MUST be validated with class-validator DTOs

`POST` bodies SHALL use `CreateCvDto` (optional `title`, required `data` object). `PATCH` bodies SHALL use `UpdateCvDto` (optional `title`, optional `data`). The global validation pipe SHALL strip unknown properties and reject invalid shapes.

#### Scenario: Invalid DTO

- **WHEN** the body violates DTO constraints (e.g. missing `data` on create)
- **THEN** the framework SHALL return 400 without persisting

### Requirement: Updates SHALL detect concurrent edits using resume meta version metadata

When `data` is PATCHed, the service SHALL compare resume meta version fields between the payload and the stored row; mismatch MUST yield 409 with a message instructing the client to reload before retrying.

#### Scenario: Conflicting version

- **WHEN** the client sends an outdated meta version while another session updated the CV
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the stale `data` overwrite

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a row with empty `data`, merge schema meta via shared `@resumind/types` helpers, validate, then update the row with the validated document in a second step.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `title` and `data`
- **THEN** the response SHALL include the new row with persisted `data` including applied meta and schema-valid content

### Requirement: Media routes MUST inherit CV-grade authentication on upload and public read on stream

Nest SHALL classify **`POST /media/upload`** under `MediaController` guarded by the identical Supabase-derived authentication strategy used for `/cv`. **`GET /media/:id`** SHALL be public (no Bearer) and stream stored objects by registry id. Upload handlers MUST remain tenant-isolated via authenticated user id embedded in Storage paths and registry rows.

#### Scenario: Auth parity with CV fetch on upload

- **WHEN** a valid bearer used for `GET /cv/:id` is replayed onto `POST /media/upload`
- **THEN** Nest SHALL authorize identically modulo multipart validation errors

#### Scenario: Public media stream without token

- **WHEN** any client requests `GET /media/{valid_uuid}` without Authorization
- **THEN** Nest SHALL return the image stream when the registry row exists

