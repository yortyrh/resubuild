## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL default to **Import from file** at `/dashboard/cv/new/import/file`. Manual create remains at `/dashboard/cv/new/create`.

The new CV menu SHALL expose **Import from file**, **Import from URL** (`/dashboard/cv/new/import/url`), and **Create manually** only. Legacy paths `/dashboard/cv/new/import/json`, `/import/pdf`, and `/import/markdown` SHALL redirect to `/dashboard/cv/new/import/file`.

**Import from file** SHALL accept JSON, PDF, Markdown, Word (`.docx`), and résumé images (PNG/JPEG/WebP) and auto-detect format client-side. JSON is parsed locally; PDF, Markdown, Word, and images require Import LLM settings and agent jobs returning `previewData` before Save. **Import from URL** SHALL fetch JSON synchronously or start an HTML agent job with the same preview-then-Save UX per `import-preview-ui`.

All import paths SHALL converge on a client-side prepared JSON Resume before `createCv`. Manual create and all import paths SHALL NOT POST or start import until the user confirms Import or Save.

The per-CV editor bootstrap (`GET /cv/:id`) SHALL merge slim `data.basics` into local editor state and SHALL NOT depend on `data.meta` or `meta.version` for saves.

#### Scenario: User imports from unified file route

- **WHEN** a signed-in user uploads a PDF on `/dashboard/cv/new/import/file`
- **THEN** the client SHALL detect PDF, run the agent job, and enable Save after `previewData` is available

#### Scenario: User imports image from file route

- **WHEN** a signed-in user uploads a résumé image on `/dashboard/cv/new/import/file`
- **THEN** the client SHALL detect image format, call `POST /cv/import/image`, and enable Save after `previewData` is available

#### Scenario: User imports DOCX from file route

- **WHEN** a signed-in user uploads a `.docx` file on `/dashboard/cv/new/import/file`
- **THEN** the client SHALL detect DOCX, call `POST /cv/import/docx`, and enable Save after `previewData` is available

#### Scenario: User imports CV from URL (JSON)

- **WHEN** a signed-in user enters a JSON Resume URL and activates Import
- **THEN** the client SHALL fetch and enable Save with Preview and Edit per `import-preview-ui`

#### Scenario: User imports CV from URL (HTML)

- **WHEN** a signed-in user with AI agent configuration enters an HTML résumé URL
- **THEN** the client SHALL poll until `previewData` is available
- **AND** SHALL enable Save only after explicit review

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract
- **AND** SHALL NOT read or write `data.meta` for concurrency or display

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control and saves basics
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure
