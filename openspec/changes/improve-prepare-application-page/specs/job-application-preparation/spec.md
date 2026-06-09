## MODIFIED Requirements

### Requirement: Signed-in users SHALL start Prepare Application with multimodal job input

The product SHALL expose a Prepare Application flow where the user submits exactly one job posting source among: HTTPS URL, plain text, PDF file (`application/pdf`, max 5 MB), or image file (PNG/JPEG/WebP screenshot, max 5 MB), plus an optional instruction message. The user MAY optionally select a base CV before submit; when provided, the workflow SHALL use that CV as `source_cv_id` and skip AI ranking. The client SHALL validate that at least one source is present before submit. The API SHALL reject requests with no extractable source with `400`.

The intake form at `/dashboard/applications/new` SHALL render a `Breadcrumb` chrome (Applications › Preparing application…) instead of a "Back to applications" link, and a top-right Cancel button in the page header that navigates back to `/dashboard/applications`. The three Job source modes SHALL be presented as a single segmented control (URL / Text / PDF or screenshot) in one row. The Text job description and the Optional instruction inputs SHALL use the project's Markdown editor (block variant with the standard toolbar) so the value submitted to the API is Markdown. The PDF or screenshot mode SHALL use a styled file picker (Choose file button + selected file metadata + Remove action) with client-side validation enforcing the 5 MB cap and the supported MIME types.

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

#### Scenario: Intake page renders the breadcrumb chrome

- **WHEN** a signed-in user opens `/dashboard/applications/new`
- **THEN** the page SHALL render a `Breadcrumb` with `Applications` (linked to `/dashboard/applications`) and `Preparing application…` (current)
- **AND** SHALL NOT render a separate "Back to applications" link

#### Scenario: Intake page presents a top-right Cancel button

- **WHEN** a signed-in user opens `/dashboard/applications/new`
- **THEN** the page header SHALL render a `Cancel` button (shadcn `Button`, variant `outline`) at the top-right
- **AND** activating it SHALL navigate to `/dashboard/applications` without submitting the form

#### Scenario: Intake page presents Job source as a segmented row

- **WHEN** a signed-in user opens `/dashboard/applications/new`
- **THEN** the Job source fieldset SHALL show `URL`, `Text`, and `PDF or screenshot` as a single segmented control
- **AND** exactly one mode SHALL be selected by default
- **AND** the matching input (URL `Input`, Text Markdown editor, or styled file picker) SHALL render directly below the row

#### Scenario: Intake text and instruction are Markdown editors

- **WHEN** a signed-in user authors the Text job description and the Optional instruction on `/dashboard/applications/new`
- **THEN** both inputs SHALL render the project's `MarkdownEditor` (block variant) with the standard toolbar
- **AND** the values submitted to `POST /applications/prepare` SHALL be the editor's Markdown output
