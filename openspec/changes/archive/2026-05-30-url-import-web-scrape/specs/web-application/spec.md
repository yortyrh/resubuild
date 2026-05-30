## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting JSON Resume `basics` fields only—**without** a separate CV title field. The client SHALL invoke `createCv` with resume `data` containing `basics` only (no `meta`) when the user activates an explicit Save (or Create) control; the API SHALL derive `cv.title` from the submitted basics. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row.

The new CV route SHALL ALSO expose **Import from JSON** per `cv-json-import`, **Import from PDF** per `cv-pdf-import`, and **Import from URL** at `/dashboard/cv/new/import/url`. JSON import uses client-side parse + `prepareImportedResume` + `createCv`. PDF import requires completed **Import LLM settings** per `import-llm-config`, then uploads to `POST /cv/import/pdf`, polls job status, and navigates to the editor when the job succeeds with a `cvId`. URL import SHALL call `POST /cv/import/from-url`: JSON responses show preview immediately; HTML responses poll until `previewData` is available, then the user confirms Import to call `createCv`. The dashboard SHALL expose AI agent settings (including web scrape provider configuration per `web-scrape-config`) for provider → model → API key and optional Firecrawl/Tavily keys. Manual create, JSON import, PDF import, and URL import are separate paths; none SHALL POST or start import until the user confirms.

The per-CV editor bootstrap (`GET /cv/:id`) SHALL merge slim `data.basics` into local editor state and SHALL NOT depend on `data.meta` or `meta.version` for saves.

#### Scenario: User imports CV from URL (JSON)

- **WHEN** a signed-in user enters a JSON Resume URL and fetches successfully
- **THEN** the client SHALL show a preview and create a CV only after explicit Import confirmation

#### Scenario: User imports CV from URL (HTML)

- **WHEN** a signed-in user with AI agent configuration enters an HTML résumé URL
- **THEN** the client SHALL poll the import job until `previewData` is available
- **AND** SHALL create a CV only after explicit Import confirmation

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract
- **AND** SHALL NOT read or write `data.meta` for concurrency or display

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control and saves basics
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure

#### Scenario: User opens new CV without saving

- **WHEN** a signed-in user visits `/dashboard/cv/new` and leaves without clicking Save
- **THEN** the client SHALL NOT have called `POST /cv` for that visit
- **AND THEN** no new CV row SHALL appear in the dashboard list attributable to that visit

#### Scenario: User creates CV from simplified form

- **WHEN** a signed-in user fills basics on `/dashboard/cv/new` and clicks Save
- **THEN** the client SHALL call `createCv` once with resume `data` containing the entered `basics` and SHALL NOT require a separate title field
- **AND THEN** on success SHALL navigate to `/dashboard/cv/:id` for the created CV with a server-derived title visible in the shell and list

#### Scenario: User imports CV from JSON file

- **WHEN** a signed-in user selects a valid JSON Resume file on `/dashboard/cv/new` and confirms import
- **THEN** the client SHALL normalize the document, call `createCv` with full resume `data`, and navigate to `/dashboard/cv/:id` on success

#### Scenario: User imports CV from PDF file

- **WHEN** a signed-in user with valid import LLM settings selects a PDF on `/dashboard/cv/new` and confirms import
- **THEN** the client SHALL start a PDF import job, poll until success or failure, and navigate to `/dashboard/cv/:id` on success

#### Scenario: User configures import LLM before PDF import

- **WHEN** a signed-in user opens import LLM settings
- **THEN** the UI SHALL present provider selection, then model selection from server catalog, then provider-labeled API key entry
- **AND** on successful save SHALL enable PDF import on the new CV page
