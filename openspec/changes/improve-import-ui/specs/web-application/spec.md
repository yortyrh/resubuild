## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting JSON Resume `basics` fields only—**without** a separate CV title field. The client SHALL invoke `createCv` with resume `data` containing `basics` only (no `meta`) when the user activates an explicit Save (or Create) control; the API SHALL derive `cv.title` from the submitted basics. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row.

The new CV route SHALL expose three creation paths on the same page—**Import from PDF**, **Create manually**, and **Import from JSON**—presented as tabs in that order (PDF first). The default selected tab SHALL be PDF import. JSON import uses client-side parse + `prepareImportedResume` + `createCv`. PDF import requires a valid **active AI agent account** per `ai-agent-accounts`, then uploads to `POST /cv/import/pdf`, polls job status, and navigates to the editor when the job succeeds with a `cvId`. AI agent settings SHALL be reachable from the dashboard user menu and `/dashboard/settings/ai-agent` per `ai-agent-settings-menu`. Manual create, JSON import, and PDF import are separate paths; none SHALL POST or start import until the user confirms. JSON and PDF import flows SHALL use the shared import file upload component per `import-file-upload`.

The per-CV editor bootstrap (`GET /cv/:id`) SHALL merge slim `data.basics` into local editor state and SHALL NOT depend on `data.meta` or `meta.version` for saves.

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

- **WHEN** a signed-in user with a valid active AI agent account selects a PDF on `/dashboard/cv/new` and confirms import
- **THEN** the client SHALL start a PDF import job, poll until success or failure, and navigate to `/dashboard/cv/:id` on success

#### Scenario: User configures AI agent before PDF import

- **WHEN** a signed-in user opens AI agent settings from the user menu or setup prompt
- **THEN** the UI SHALL present account management with provider selection, model selection from server catalog, and provider-labeled API key entry
- **AND** on successful save with an active account SHALL enable PDF import on the new CV page

#### Scenario: New CV page defaults to PDF import tab

- **WHEN** a signed-in user opens `/dashboard/cv/new` without a tab query or fragment
- **THEN** the PDF import tab SHALL be selected by default
- **AND** tab order SHALL list PDF import before manual create and JSON import
