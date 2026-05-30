## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting JSON Resume `basics` fields only—**without** a separate CV title field. The client SHALL invoke `createCv` with resume `data` containing `basics` only (no `meta`) when the user activates an explicit Save (or Create) control; the API SHALL derive `cv.title` from the submitted basics. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row.

The new CV route SHALL ALSO expose **Import from JSON** per `cv-json-import`, **Import from PDF** per `cv-pdf-import`, **Import from Markdown** at `/dashboard/cv/new/import/markdown`, and **Import from URL** at `/dashboard/cv/new/import/url`. All import paths SHALL converge on a client-side prepared JSON Resume before `createCv`. JSON and synchronous URL JSON responses use client-side parse + `prepareImportedResume` + preview per `import-preview-ui` + `createCv` on confirm. PDF and Markdown import require completed **Import LLM settings** per `import-llm-config`, upload to the respective import endpoint, poll until `previewData` is available, then offer Preview, Edit, and Import before `createCv`. URL HTML import polls until `previewData` is available with the same review UX. The dashboard SHALL expose AI agent settings (including web scrape provider configuration per `web-scrape-config`) for provider → model → API key and optional Firecrawl/Tavily keys. Manual create and all import paths SHALL NOT POST or start import until the user confirms the relevant action.

The per-CV editor bootstrap (`GET /cv/:id`) SHALL merge slim `data.basics` into local editor state and SHALL NOT depend on `data.meta` or `meta.version` for saves.

#### Scenario: User imports CV from URL (JSON)

- **WHEN** a signed-in user enters a JSON Resume URL and fetches successfully
- **THEN** the client SHALL enable Preview and Edit per `import-preview-ui`
- **AND** SHALL create a CV only after explicit Import confirmation

#### Scenario: User imports CV from URL (HTML)

- **WHEN** a signed-in user with AI agent configuration enters an HTML résumé URL
- **THEN** the client SHALL poll the import job until `previewData` is available
- **AND** SHALL enable Preview and Edit before create
- **AND** SHALL create a CV only after explicit Import confirmation

#### Scenario: User imports CV from PDF

- **WHEN** a signed-in user uploads a PDF and the agent job succeeds
- **THEN** the client SHALL show preview-ready state with Preview, Edit, and Import
- **AND** SHALL call `createCv` only after explicit Import confirmation

#### Scenario: User imports CV from Markdown

- **WHEN** a signed-in user uploads Markdown and the agent job succeeds
- **THEN** the client SHALL show preview-ready state with Preview, Edit, and Import
- **AND** SHALL call `createCv` only after explicit Import confirmation

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract
- **AND** SHALL NOT read or write `data.meta` for concurrency or display

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control and saves basics
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure
