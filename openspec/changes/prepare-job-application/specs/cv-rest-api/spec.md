## ADDED Requirements

### Requirement: The API SHALL expose authenticated job application routes

Under `/applications`, authenticated handlers SHALL provide:

- `POST /applications/prepare` — multipart intake (optional `url`, `text`, `message`, optional `sourceCvId`, file pdf|image max 5 MB each); returns `{ applicationId, status }` with `202` when queued
- `GET /applications` — list user's applications (summary fields, ordered by `updated_at` desc)
- `GET /applications/:id` — application detail including status, job metadata, `sourceCvId`, `tailoredCvId`, `coverLetter` Markdown, `selectionRationale`, and prepare progress while running
- `PATCH /applications/:id` — optional body `{ coverLetter: string }` for manual Markdown edits (no AI)
- `POST /applications/:id/promote-clone` — deep-clones the tailored CV as `kind = primary` with `source_cv_id` pointing at the clone
- `GET /applications/:id/export/letter/html` and `GET /applications/:id/export/letter/pdf` — cover letter export (Markdown rendered to HTML/PDF)

All routes SHALL require the same Supabase auth guard as `/cv`. Prepare SHALL require a valid **active AI agent account** per `ai-agent-accounts`.

#### Scenario: Prepare enqueues application job

- **WHEN** an authenticated user with a valid active AI agent account submits valid job intake
- **THEN** the API SHALL return `202` with an application id and queued status

#### Scenario: User-provided source CV honored

- **WHEN** prepare intake includes `sourceCvId` owned by the user
- **THEN** the workflow SHALL use that CV and skip AI ranking

#### Scenario: Oversize file rejected

- **WHEN** prepare intake includes a PDF or image file larger than 5 MB
- **THEN** the API SHALL return `400`

#### Scenario: Manual letter update

- **WHEN** an authenticated user PATCHes `coverLetter` on their application
- **THEN** the API SHALL persist the Markdown text without invoking AI

#### Scenario: Unauthorized application access

- **WHEN** a client requests an application id not owned by the user
- **THEN** the API SHALL respond with `404`

### Requirement: The API SHALL deep-clone a CV for application tailoring

The service SHALL expose an internal clone operation that copies the `cv` header row and all normalized child rows to a new `cv.id`, setting `source_cv_id` and `kind = application_clone`. The clone SHALL validate as JSON Resume after assembly. Child row order within each section SHALL be preserved so the UI can match clone entries to source entries by index.

#### Scenario: Clone preserves section content

- **WHEN** a base CV with work and skills rows is cloned
- **THEN** the new CV SHALL contain equivalent section rows with new primary keys in the same order

### Requirement: The API SHALL load sections from a source CV for preview and workflow

The service SHALL expose read helpers keyed by `source_cv_id` to fetch basics and Work/Volunteer/Project items from the original CV without mutating it. The application workspace SHALL load source sections via existing authenticated `GET /cv/:sourceCvId/...` routes using `sourceCvId` from application detail.

#### Scenario: Load source work items for preview

- **WHEN** the workspace requests work entries for the source CV id on an application
- **THEN** the API SHALL return the source CV's work rows unchanged

## MODIFIED Requirements

### Requirement: The API SHALL expose CRUD endpoints for CVs scoped to the authenticated user

Handlers MUST implement `GET /cv`, `GET /cv/:id`, `POST /cv`, `PATCH /cv/:id`, and `DELETE /cv/:id`, using a per-user Supabase client created with the caller's access token so RLS applies. `GET /cv` SHALL return only CV rows where `kind = primary` (excluding application clones). `GET /cv/:id` and mutating operations SHALL still apply to any CV owned by the user, including application clones and source CVs referenced by applications, when the id is known.

#### Scenario: List CVs

- **WHEN** an authenticated client calls `GET /cv`
- **THEN** the service SHALL return CV rows for that user with `kind = primary` ordered by `updated_at` descending

#### Scenario: List excludes application clone

- **WHEN** a user owns a primary CV and an application clone
- **THEN** `GET /cv` SHALL return only the primary CV

#### Scenario: Get application clone by id

- **WHEN** an authenticated client calls `GET /cv/:id` with an application clone id
- **THEN** the service SHALL return that CV if owned by the user

#### Scenario: Get source CV by id for application preview

- **WHEN** an authenticated client calls `GET /cv/:id` with the source CV id from an application they own
- **THEN** the service SHALL return that CV and its sections for read-only preview

#### Scenario: Missing CV

- **WHEN** `GET /cv/:id` or a mutating operation targets an id that does not exist or is not owned (RLS empty result)
- **THEN** the API SHALL respond with 404 and a CV not found message where implemented
