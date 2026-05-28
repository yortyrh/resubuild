## ADDED Requirements

### Requirement: The API SHALL expose authenticated job application routes

Under `/applications`, authenticated handlers SHALL provide:

- `POST /applications/prepare` — multipart intake (optional `url`, `text`, `message`, file pdf|image); returns `{ applicationId, status }` with `202` when queued
- `GET /applications` — list user's applications (summary fields, ordered by `updated_at` desc)
- `GET /applications/:id` — application detail including status, job metadata, `sourceCvId`, `tailoredCvId`, `coverLetter`, and prepare progress while running
- `POST /applications/:id/chat` — body `{ message: string }`; runs one chat turn; returns updated application state and assistant message
- `POST /applications/:id/promote-clone` — sets tailored clone `visible_in_library = true`
- `GET /applications/:id/export/letter/html` and `GET /applications/:id/export/letter/pdf` — presentation letter export

All routes SHALL require the same Supabase auth guard as `/cv`. Prepare and chat SHALL require a valid **active AI agent account** per `ai-agent-accounts`.

#### Scenario: Prepare enqueues application job

- **WHEN** an authenticated user with a valid active AI agent account submits valid job intake
- **THEN** the API SHALL return `202` with an application id and queued status

#### Scenario: Chat updates application artifacts

- **WHEN** an authenticated user posts a chat message on their application
- **THEN** the API SHALL persist user and assistant messages and return updated letter and/or tailored CV references

#### Scenario: Unauthorized application access

- **WHEN** a client requests an application id not owned by the user
- **THEN** the API SHALL respond with `404`

### Requirement: The API SHALL deep-clone a CV for application tailoring

The service SHALL expose an internal clone operation that copies the `cv` header row and all normalized child rows to a new `cv.id`, setting `source_cv_id`, `kind = application_clone`, and `visible_in_library = false`. The clone SHALL validate as JSON Resume after assembly.

#### Scenario: Clone preserves section content

- **WHEN** a base CV with work and skills rows is cloned
- **THEN** the new CV SHALL contain equivalent section rows with new primary keys

## MODIFIED Requirements

### Requirement: The API SHALL expose CRUD endpoints for CVs scoped to the authenticated user

Handlers MUST implement `GET /cv`, `GET /cv/:id`, `POST /cv`, `PATCH /cv/:id`, and `DELETE /cv/:id`, using a per-user Supabase client created with the caller's access token so RLS applies. `GET /cv` SHALL return only CV rows where `visible_in_library = true` (excluding non-promoted application clones). `GET /cv/:id` and mutating operations SHALL still apply to any CV owned by the user, including application clones, when the id is known.

#### Scenario: List CVs

- **WHEN** an authenticated client calls `GET /cv`
- **THEN** the service SHALL return CV rows for that user with `visible_in_library = true` ordered by `updated_at` descending

#### Scenario: List excludes application clone

- **WHEN** a user owns a primary CV and a non-promoted application clone
- **THEN** `GET /cv` SHALL return only the primary CV

#### Scenario: Get application clone by id

- **WHEN** an authenticated client calls `GET /cv/:id` with an application clone id
- **THEN** the service SHALL return that CV if owned by the user

#### Scenario: Missing CV

- **WHEN** `GET /cv/:id` or a mutating operation targets an id that does not exist or is not owned (RLS empty result)
- **THEN** the API SHALL respond with 404 and a CV not found message where implemented

### Requirement: Parent create and update payloads for work, volunteer, education, and projects SHALL accept full highlights and courses string arrays as jsonb fields on the parent row

Parent entity tables MUST store these JSON Resume string arrays as jsonb on the parent row. For work, volunteer, and project entities, PATCH payloads MAY additionally include `inactiveHighlights` string arrays stored in `inactive_highlights`. Assembly and export SHALL emit only the `highlights` column as JSON Resume `highlights`. The API SHALL NOT expose separate nested routes for individual highlight or course strings.

#### Scenario: Update work entry with highlights array

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a payload containing a full `highlights` string array
- **THEN** the service SHALL replace `cv_work.highlights` jsonb with that array atomically
- **AND** SHALL NOT require nested highlight sub-routes

#### Scenario: Update work entry with inactive highlights

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with `inactiveHighlights` array
- **THEN** the service SHALL replace `cv_work.inactive_highlights` atomically
- **AND** assembled JSON Resume output for export SHALL exclude inactive strings
