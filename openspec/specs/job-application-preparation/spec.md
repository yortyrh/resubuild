# job-application-preparation Specification

## Purpose

TBD - created by archiving change prepare-job-application. Update Purpose after archive.

## Requirements

### Requirement: Signed-in users SHALL start Prepare Application with multimodal job input

The product SHALL expose a Prepare Application flow where the user submits exactly one job posting source among: HTTPS URL, plain text, PDF file (`application/pdf`, max 5 MB), or image file (PNG/JPEG/WebP screenshot, max 5 MB), plus an optional instruction message. The user MAY optionally select a base CV before submit; when provided, the workflow SHALL use that CV as `source_cv_id` and skip AI ranking. The client SHALL validate that at least one source is present before submit. The API SHALL reject requests with no extractable source with `400`.

#### Scenario: User submits job URL with instruction

- **WHEN** a signed-in user with a valid active AI agent account submits a job posting URL and optional message
- **THEN** the API SHALL accept the request and return an application id with queued status

#### Scenario: User submits pasted job text only

- **WHEN** a signed-in user submits plain text describing the job without a file or URL
- **THEN** the API SHALL accept the request and enqueue preparation using that text

#### Scenario: Missing job content rejected

- **WHEN** a client calls prepare with empty url, text, and no file
- **THEN** the API SHALL return `400` and SHALL NOT create an application row

#### Scenario: User picks base CV before prepare

- **WHEN** a signed-in user selects a library-visible CV on intake and submits valid job content
- **THEN** the prepare workflow SHALL use that CV as `source_cv_id`
- **AND** SHALL NOT run AI CV ranking for selection

#### Scenario: Oversize screenshot rejected

- **WHEN** a client uploads an image job posting larger than 5 MB
- **THEN** the API SHALL return `400` with a clear size limit message

### Requirement: Users MAY pick the base CV before prepare

The intake form SHALL default to AI selection. The user MAY choose a specific library-visible CV instead. When `sourceCvId` is provided on prepare, the workflow SHALL use it and skip AI ranking; `selection_rationale` MAY note user selection.

#### Scenario: AI picks when no CV selected

- **WHEN** a user submits prepare without choosing a base CV
- **THEN** the workflow SHALL run AI ranking to select `source_cv_id`

### Requirement: Prepare Application SHALL produce a job_application record with tailored artifacts in one run

On successful workflow completion, the system SHALL persist a `job_application` row containing: extracted job metadata (title, company when known), reference to the selected live `source_cv_id` when available, a persisted `source_cv_snapshot` JSON copy of the base CV used for tailoring, reference to a new `tailored_cv_id` clone, and a `cover_letter` **Markdown** draft in the job posting language unless the optional user message specifies another language. The application SHALL be owned by the authenticated user. The flow SHALL NOT require or expose AI chat for refinement.

#### Scenario: Successful prepare creates linked records

- **WHEN** the prepare workflow completes successfully
- **THEN** a `job_application` row SHALL exist for the user
- **AND** `tailored_cv_id` SHALL reference a CV clone derived from the selected base CV content
- **AND** `source_cv_snapshot` SHALL contain a persisted resume JSON copy used for future regeneration
- **AND** `cover_letter` SHALL contain non-empty Markdown draft text

#### Scenario: User views application workspace after prepare

- **WHEN** a signed-in user opens an application they own
- **THEN** the UI SHALL show the cover letter, tailored CV editor entry, job summary, and selection rationale
- **AND** SHALL NOT show an AI chat panel

### Requirement: Application clones SHALL be hidden from the main CV library by default

CV rows created as application clones SHALL have `kind = application_clone`. The dashboard CV list SHALL include only `kind = primary` CVs from `GET /cv` and SHALL NOT include application clones. Users SHALL open clones only via the application workspace or direct id URL.

#### Scenario: Dashboard list excludes application clone

- **WHEN** a user has one primary CV and one application clone
- **THEN** `GET /cv` and the dashboard list SHALL return only the primary CV

#### Scenario: Clone accessible from application workspace

- **WHEN** a user opens an application with a tailored clone
- **THEN** the UI SHALL link to the standard CV editor routes for `tailored_cv_id`

### Requirement: Users SHALL promote an application clone to the main library

The API SHALL expose an authenticated action that deep-clones the application's tailored CV into a new row with `kind = primary` and `source_cv_id` referencing the application clone. The original application clone SHALL remain `kind = application_clone` and SHALL stay off the library list.

#### Scenario: Promote clone to library

- **WHEN** a user promotes an application clone
- **THEN** subsequent `GET /cv` responses SHALL include the new primary CV
- **AND** that row's `source_cv_id` SHALL reference the application clone
- **AND** the application clone SHALL still be excluded from `GET /cv`

### Requirement: Users SHALL copy and export the cover letter for email or PDF

The application workspace SHALL store and display `cover_letter` as Markdown. The UI SHALL provide a single copy action that writes **rich text** to the clipboard (`text/html` derived from rendered Markdown, with `text/plain` fallback) so one paste into an email client or document preserves formatting. The API SHALL expose authenticated letter export routes returning HTML and PDF (Markdown rendered to HTML) using the same server-side PDF engine as CV export. Letter PDF export MAY return `503` when the PDF engine is unavailable, matching CV export behavior.

#### Scenario: Copy letter as rich text for email or document

- **WHEN** a user clicks copy on the cover letter in the workspace
- **THEN** the clipboard SHALL include HTML rich text derived from the Markdown letter
- **AND** SHALL include a plain-text fallback for clients that ignore HTML

#### Scenario: Download letter PDF

- **WHEN** a user requests letter PDF export for their application
- **THEN** the API SHALL return `application/pdf` bytes generated from rendered letter HTML

### Requirement: Prepare Application SHALL require a valid active AI agent account

Prepare Application intake SHALL be unavailable until the user has an active AI agent account with a Mastra-compatible model id and valid API key per `ai-agent-accounts`. The intake UI SHALL link to AI agent settings or the dashboard user menu when unconfigured. The API SHALL reject `POST /applications/prepare` with `403` or `422` when no active account is available.

#### Scenario: Prepare blocked without active account

- **WHEN** a client calls `POST /applications/prepare` without a valid active AI agent account
- **THEN** the API SHALL NOT enqueue a job
- **AND** SHALL return an error indicating AI agent configuration is required

### Requirement: Users SHALL list and revisit past applications

The API SHALL expose `GET /applications` returning only active, list-visible applications for the authenticated user ordered by `updated_at` descending with summary fields (job title, company, status, timestamps). Update replacement drafts and failed/incomplete staged rows SHALL be excluded from the default listing. The web app SHALL provide a list/history view and deep link to each listed workspace.

#### Scenario: Application history list excludes staged replacement draft

- **WHEN** a signed-in user has one active application and one staged replacement draft linked to it
- **THEN** the applications list SHALL show only the active application row
- **AND** the staged replacement draft SHALL NOT appear in the default list

### Requirement: Application regeneration SHALL fallback to saved base CV snapshots

Retry and update flows SHALL regenerate from the persisted `source_cv_snapshot` when live base CV rows are no longer available. When fallback is used, the workflow SHALL keep regeneration functional without requiring the original source CV id to remain in the user library. For update flows, snapshot-based regeneration SHALL run against a staged replacement draft while preserving the currently active application until swap success.

#### Scenario: Retry succeeds after base CV deletion

- **WHEN** an application has no resolvable live `source_cv_id` but has a valid `source_cv_snapshot`
- **THEN** retry SHALL regenerate the tailored CV and cover letter from the snapshot
- **AND** SHALL set source metadata so clients can indicate saved-copy fallback

#### Scenario: Update succeeds after base CV deletion

- **WHEN** update is requested for a ready application whose live source CV has been deleted
- **THEN** update SHALL use `source_cv_snapshot` as the base resume input
- **AND** SHALL produce a new staged tailored clone without requiring a live source CV row
- **AND** SHALL keep the original application active until staged update completion swaps records
