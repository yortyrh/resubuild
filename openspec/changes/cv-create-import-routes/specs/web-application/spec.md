## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, dedicated new-CV create/import routes under `/dashboard/cv/new/`, and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

Create and import paths SHALL each have an independent URL:

- `/dashboard/cv/new/create` — manual basics form per simplified create flow
- `/dashboard/cv/new/import/pdf` — PDF import per `cv-pdf-import`
- `/dashboard/cv/new/import/json` — JSON import per `cv-json-import`
- `/dashboard/cv/new/import/website` — website URL import per `cv-website-import`
- `/dashboard/cv/new/import/markdown` — Markdown import per `cv-markdown-import`

`/dashboard/cv/new` SHALL redirect to `/dashboard/cv/new/import/pdf` (default entry). A shared layout under `/dashboard/cv/new/` SHALL provide page title, subtitle, and cancel navigation to `/dashboard`. None of these routes SHALL call `POST /cv` or start an async import job on page load.

The manual create route SHALL collect JSON Resume `basics` fields only—**without** a separate CV title field. The client SHALL invoke `createCv` with resume `data` containing `basics` only (no `meta`) when the user activates an explicit Save control; the API SHALL derive `cv.title` from the submitted basics. On successful create, the UI SHALL navigate to `/dashboard/cv/:id`. Navigating away or canceling before Save SHALL NOT create a CV row.

The dashboard CV list SHALL expose a **New CV** dropdown menu (shadcn `DropdownMenu`) instead of a single link. Each menu item SHALL navigate to one of the dedicated create/import routes above. The empty-state **Create CV** control SHALL use the same dropdown.

Import flows requiring LLM configuration (PDF, Markdown) SHALL gate upload until import LLM settings per `import-llm-config` are complete. File-based imports SHALL use the shared import file upload component per `import-file-upload` where applicable.

The per-CV editor bootstrap (`GET /cv/:id`) SHALL merge slim `data.basics` into local editor state and SHALL NOT depend on `data.meta` or `meta.version` for saves.

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract
- **AND** SHALL NOT read or write `data.meta` for concurrency or display

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control and saves basics
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure

#### Scenario: User opens new CV index without saving

- **WHEN** a signed-in user visits `/dashboard/cv/new` and is redirected without confirming any create/import action
- **THEN** the client SHALL NOT have called `POST /cv` for that visit
- **AND THEN** no new CV row SHALL appear in the dashboard list attributable to that visit

#### Scenario: User creates CV from simplified form

- **WHEN** a signed-in user fills basics on `/dashboard/cv/new/create` and clicks Save
- **THEN** the client SHALL call `createCv` once with resume `data` containing the entered `basics` and SHALL NOT require a separate title field
- **AND THEN** on success SHALL navigate to `/dashboard/cv/:id` for the created CV with a server-derived title visible in the shell and list

#### Scenario: User imports CV from JSON file

- **WHEN** a signed-in user selects a valid JSON Resume file on `/dashboard/cv/new/import/json` and confirms import
- **THEN** the client SHALL normalize the document, call `createCv` with full resume `data`, and navigate to `/dashboard/cv/:id` on success

#### Scenario: User imports CV from PDF file

- **WHEN** a signed-in user with valid import LLM settings selects a PDF on `/dashboard/cv/new/import/pdf` and confirms import
- **THEN** the client SHALL start a PDF import job, poll until success or failure, and navigate to `/dashboard/cv/:id` on success

#### Scenario: User opens New CV dropdown

- **WHEN** a signed-in user clicks the New CV dropdown on the dashboard
- **THEN** the menu SHALL list create manually, import PDF, import JSON, import website, and import Markdown
- **AND** each item SHALL navigate to its dedicated route

#### Scenario: User configures import LLM before agent import

- **WHEN** a signed-in user opens import LLM settings
- **THEN** the UI SHALL present provider selection, then model selection from server catalog, then provider-labeled API key entry
- **AND** on successful save SHALL enable PDF and Markdown import routes

## ADDED Requirements

### Requirement: The new CV layout SHALL provide shared page chrome

The layout at `/dashboard/cv/new/layout.tsx` SHALL render a consistent heading ("Create a new CV"), descriptive subtitle explaining that nothing is saved until confirm, and a cancel action returning to `/dashboard`. Child routes SHALL render only their form content inside this layout.

#### Scenario: User navigates between import routes

- **WHEN** a user moves from `/dashboard/cv/new/import/pdf` to `/dashboard/cv/new/import/json` via browser navigation or dropdown
- **THEN** the shared heading and subtitle SHALL remain visible
- **AND** only the form content SHALL change
