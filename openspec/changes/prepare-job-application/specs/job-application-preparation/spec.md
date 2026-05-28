## ADDED Requirements

### Requirement: Signed-in users SHALL start Prepare Application with multimodal job input

The product SHALL expose a Prepare Application flow where the user submits exactly one job posting source among: HTTPS URL, plain text, PDF file (`application/pdf`), or image file (PNG/JPEG/WebP screenshot), plus an optional instruction message. The client SHALL validate that at least one source is present before submit. The API SHALL reject requests with no extractable source with `400`.

#### Scenario: User submits job URL with instruction

- **WHEN** a signed-in user with a valid active AI agent account submits a job posting URL and optional message
- **THEN** the API SHALL accept the request and return an application id with queued status

#### Scenario: User submits pasted job text only

- **WHEN** a signed-in user submits plain text describing the job without a file or URL
- **THEN** the API SHALL accept the request and enqueue preparation using that text

#### Scenario: Missing job content rejected

- **WHEN** a client calls prepare with empty url, text, and no file
- **THEN** the API SHALL return `400` and SHALL NOT create an application row

### Requirement: Prepare Application SHALL produce a job_application record with tailored artifacts

On successful workflow completion, the system SHALL persist a `job_application` row containing: extracted job metadata (title, company when known), reference to the selected `source_cv_id`, reference to a new `tailored_cv_id` clone, and a `cover_letter` text draft. The application SHALL be owned by the authenticated user.

#### Scenario: Successful prepare creates linked records

- **WHEN** the prepare workflow completes successfully
- **THEN** a `job_application` row SHALL exist for the user
- **AND** `tailored_cv_id` SHALL reference a CV clone with `source_cv_id` pointing to the selected base CV
- **AND** `cover_letter` SHALL contain non-empty draft text

#### Scenario: User views application workspace after prepare

- **WHEN** a signed-in user opens an application they own
- **THEN** the UI SHALL show the cover letter, tailored CV editor entry, job summary, and chat panel

### Requirement: Application clones SHALL be hidden from the main CV library by default

CV rows created as application clones SHALL have `kind = application_clone` and `visible_in_library = false`. The dashboard CV list SHALL NOT include these clones. Users SHALL open clones only via the application workspace or direct id URL.

#### Scenario: Dashboard list excludes application clone

- **WHEN** a user has one primary CV and one application clone
- **THEN** `GET /cv` and the dashboard list SHALL return only the primary CV

#### Scenario: Clone accessible from application workspace

- **WHEN** a user opens an application with a tailored clone
- **THEN** the UI SHALL link to the standard CV editor routes for `tailored_cv_id`

### Requirement: Users SHALL promote an application clone to the main library

The API SHALL expose an authenticated action to set `visible_in_library = true` on an application clone owned by the user. After promotion, the clone SHALL appear in `GET /cv` and the dashboard list like a primary CV.

#### Scenario: Promote clone to library

- **WHEN** a user promotes an application clone
- **THEN** subsequent `GET /cv` responses SHALL include that CV
- **AND** `source_cv_id` SHALL remain set for lineage

### Requirement: Users SHALL copy and export the presentation letter

The application workspace SHALL provide copy-to-clipboard for `cover_letter` text. The API SHALL expose authenticated letter export routes returning HTML and PDF using the same server-side PDF engine as CV export. Letter PDF export MAY return `503` when the PDF engine is unavailable, matching CV export behavior.

#### Scenario: Copy letter text

- **WHEN** a user clicks copy on the presentation letter in the workspace
- **THEN** the full current letter text SHALL be copied to the clipboard

#### Scenario: Download letter PDF

- **WHEN** a user requests letter PDF export for their application
- **THEN** the API SHALL return `application/pdf` bytes generated from letter HTML

### Requirement: Prepare Application SHALL require a valid active AI agent account

Prepare Application intake and chat SHALL be unavailable until the user has an active AI agent account with a Mastra-compatible model id and valid API key per `ai-agent-accounts`. The intake UI SHALL link to AI agent settings or the dashboard user menu when unconfigured. The API SHALL reject `POST /applications/prepare` and `POST /applications/:id/chat` with `403` or `422` when no active account is available.

#### Scenario: Prepare blocked without active account

- **WHEN** a client calls `POST /applications/prepare` without a valid active AI agent account
- **THEN** the API SHALL NOT enqueue a job
- **AND** SHALL return an error indicating AI agent configuration is required

#### Scenario: Chat blocked without active account

- **WHEN** a client calls `POST /applications/:id/chat` without a valid active AI agent account
- **THEN** the API SHALL NOT run a chat turn
- **AND** SHALL return an error indicating AI agent configuration is required

### Requirement: Users SHALL list and revisit past applications

The API SHALL expose `GET /applications` returning the user's applications ordered by `updated_at` descending with summary fields (job title, company, status, timestamps). The web app SHALL provide a list/history view and deep link to each workspace.

#### Scenario: Application history list

- **WHEN** a signed-in user opens the applications list
- **THEN** the UI SHALL show their applications with status and last updated time
