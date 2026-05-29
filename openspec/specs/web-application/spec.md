# Web application (Next.js)

## Purpose

Capture how the Resumind frontend authenticates users via the Nest API, calls CV endpoints with Bearer tokens, and exposes CV editing flows aligned with the API and Supabase-backed tokens (validated server-side).

## Requirements

### Requirement: The web app MUST use backend-owned HTTP endpoints for authentication and authenticated Nest API access

Interactive client bundles (`'use client'` modules and hooks) SHALL NOT import `@supabase/ssr`, `@supabase/supabase-js`, or environment variables scoped for Supabase browser clients for authentication. Session establishment, credential verification, logout, renewal, and user resolution for SPA purposes SHALL occur exclusively through documented HTTP endpoints on the Nest API origin identified by `NEXT_PUBLIC_API_URL`. The API origin **MAY differ** from the web origin; Nest **SHALL** enable **CORS** allowing the web origin and required methods and headers (including `Authorization` and `Content-Type`) for these calls. Next.js Route Handlers are **not required** for credential transport and SHOULD NOT duplicate auth business logic.

Authenticated requests to Nest CV endpoints SHALL send the short-lived **access token** from auth JSON responses in `Authorization: Bearer` (and **SHALL NOT** depend on browser cookies for establishing that identity). Refresh uses the documented JSON refresh contract (for example `POST /auth/refresh` with a refresh token from the client store), not `Set-Cookie`.

#### Scenario: Cross-origin API access

- **WHEN** the web app is served from an origin different from `NEXT_PUBLIC_API_URL`
- **THEN** preflight and actual auth and CV requests MUST succeed when the browser origin is listed in the API’s CORS allowlist and the client sends `Authorization` as required

#### Scenario: Proximity to access token expiry

- **WHEN** the client detects that the access credential is nearing expiry according to TTL rules agreed with `apps/api` (for example expiry within roughly one minute)
- **THEN** the client SHALL call the documented renewal endpoint before invoking other protected Nest operations, or SHALL surface session expired guidance if renewal fails or returns unauthorized

#### Scenario: Authenticated API error handling

- **WHEN** the API returns a non-OK response
- **THEN** `apiFetch` SHALL surface a clear error string, including concatenated validation messages when present

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting JSON Resume `basics` fields only—**without** a separate CV title field. The client SHALL invoke `createCv` with resume `data` containing `basics` only (no `meta`) when the user activates an explicit Save (or Create) control; the API SHALL derive `cv.title` from the submitted basics. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row.

The new CV route SHALL ALSO expose **Import from JSON** per `cv-json-import` and **Import from PDF** per `cv-pdf-import`. JSON import uses client-side parse + `prepareImportedResume` + `createCv`. PDF import requires completed **Import LLM settings** per `import-llm-config`, then uploads to `POST /cv/import/pdf`, polls job status, and navigates to the editor when the job succeeds with a `cvId`. The dashboard SHALL expose a settings surface (e.g. `/dashboard/settings/import-llm` or equivalent) for provider → model → API key configuration. Manual create, JSON import, and PDF import are separate paths on the same page; none SHALL POST or start import until the user confirms.

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

- **WHEN** a signed-in user with valid import LLM settings selects a PDF on `/dashboard/cv/new` and confirms import
- **THEN** the client SHALL start a PDF import job, poll until success or failure, and navigate to `/dashboard/cv/:id` on success

#### Scenario: User configures import LLM before PDF import

- **WHEN** a signed-in user opens import LLM settings
- **THEN** the UI SHALL present provider selection, then model selection from server catalog, then provider-labeled API key entry
- **AND** on successful save SHALL enable PDF import on the new CV page

### Requirement: Shared types and schema packages SHALL inform the client and server contract

The frontend and API both depend on workspace packages for resume typing and schema; changes to CV shape MUST flow through those packages to keep UI, API validation, and persistence aligned.

#### Scenario: Workspace alignment

- **WHEN** a developer changes resume structure
- **THEN** they SHALL update `packages/types` and/or `packages/schemas` and ensure both `apps/web` and `apps/api` still build and tests pass

### Requirement: The CV editor SHALL persist resume sections through item-scoped API helpers

The web client in `apps/web/src/lib/cv-item-api.ts` (and related helpers) SHALL expose typed functions for each item operation defined in `cv-rest-api` (basics patch, array CRUD, section GET, reorder where applicable). Array-item update and delete helpers SHALL accept the item row UUID (`itemId`) rather than a numeric array index. Parent create and update helpers for work, volunteer, education, and projects SHALL accept full `highlights` and `courses` arrays in the payload. The client SHALL NOT expose nested highlight or course CRUD helpers. Item mutation helpers SHALL NOT accept or send a `version` field. The dashboard CV editor SHALL call these functions on per-item Save and confirmed Delete instead of deferring resume body changes to a single Save CV action. After update or delete, local section state SHALL be merged by matching item `id`; after create, the client SHALL incorporate the returned item (with `id`) and refresh section ordering via section GET or equivalent sort logic.

#### Scenario: Saving a language entry

- **WHEN** a user saves a language from the inline edit form
- **THEN** the client SHALL invoke the language update helper with the CV id, the language row id, and payload only
- **AND THEN** on success SHALL replace the matching entry in local section state by `id` from the response

#### Scenario: Deleting an award entry

- **WHEN** a user confirms deletion of an award
- **THEN** the client SHALL call the award delete helper with the award row id
- **AND THEN** on success SHALL remove the entry from local state by `id` without requiring a full section refetch

#### Scenario: Saving work entry with highlights

- **WHEN** a user saves a work entry whose form includes multiple highlights
- **THEN** the client SHALL call the work create or update helper with the full `highlights` array
- **AND** SHALL NOT call separate nested highlight API helpers

#### Scenario: Reordering skills optimistically

- **WHEN** a user reorders skills via drag or move buttons
- **THEN** the client SHALL update local skills state immediately
- **AND** SHALL call `reorderCvSection` with the new id order
- **AND** SHALL revert local state if the API fails or replace it only when the response order differs

### Requirement: Dashboard CV delete SHALL use an in-app confirmation dialog

Deleting a CV from the dashboard list SHALL require confirmation through an accessible in-app dialog (not `window.confirm`). The dialog SHALL name the CV being deleted when available and SHALL disable dismiss actions while the delete request is in flight.

#### Scenario: User cancels CV delete

- **WHEN** a user clicks Delete on a dashboard CV card and then cancels the confirmation dialog
- **THEN** no delete API call SHALL be made
- **AND** the CV SHALL remain in the list

#### Scenario: User confirms CV delete

- **WHEN** a user confirms deletion in the dialog
- **THEN** the client SHALL call `deleteCv`
- **AND** on success SHALL refresh the list and show a success toast

### Requirement: Auth pages SHALL render cross-links outside client form boundaries

The `/login` and `/register` routes SHALL render static navigation cross-links (login ↔ register) from Server Components. Interactive auth forms (`LoginForm`, `RegisterForm`) SHALL NOT include Next.js `<Link>` cross-links in their `'use client'` module trees.

#### Scenario: Login page cross-link is server-rendered

- **WHEN** a user loads `/login`
- **THEN** the **Register** cross-link SHALL be rendered by the Server Component page (or a server-safe shared helper)
- **AND** `LoginForm` SHALL contain only the sign-in form and its client state

#### Scenario: Register page cross-link is server-rendered

- **WHEN** a user loads `/register`
- **THEN** the **Sign in** cross-link SHALL be rendered by the Server Component page (or a server-safe shared helper)
- **AND** `RegisterForm` SHALL contain only the registration form and its client state

#### Scenario: Standard browser hydration on auth pages

- **WHEN** a developer loads `/login` or `/register` in a standard browser (not Cursor embedded browser) with `pnpm dev` running
- **THEN** the browser console SHALL NOT report a React hydration mismatch attributable to auth cross-links

### Requirement: CV editor section components SHALL NOT thread document version

Reorderable section components (`managed-array-section`, `sortable-managed-array-section`, and callers) SHALL NOT accept `version`, `onVersionChange`, or `onMetaVersionChange` props. Reorder helpers SHALL NOT read `meta.version` from API responses. Failed reorders SHALL revert UI state without 409-specific handling.

#### Scenario: Skills reorder without version field

- **WHEN** a user reorders skills in the editor
- **THEN** the client SHALL call the reorder API with `order` only
- **AND** SHALL NOT send or expect a `version` field in the request or response

### Requirement: The web app SHALL document preview and card surface tokens

`apps/web/DESIGN.md` SHALL describe `surface-soft` and related tokens used by CV preview chrome and the template layout panel. Preview and dashboard CV cards SHALL use these tokens instead of ad hoc `bg-white` / border combinations for consistency.

#### Scenario: Preview wrapper uses surface-soft

- **WHEN** a user views the CV preview page
- **THEN** the iframe container SHALL use the `surface-soft` utility class documented in `DESIGN.md`

### Requirement: The web API client SHALL support template presentation

`apps/web/src/lib/api.ts` SHALL expose `getCvTemplatePresentation` and `updateCvTemplatePresentation` with optional `template` query parameter, colocated with tests.

#### Scenario: Client fetches presentation before panel render

- **WHEN** the preview page mounts with a selected template
- **THEN** the client SHALL call the presentation GET endpoint before showing saved toggles in the layout panel

### Requirement: The web app SHALL provide a print-faithful CV preview route

The App Router SHALL expose `/dashboard/cv/[id]/preview` for signed-in users. The page SHALL load export HTML from `GET /cv/:id/export/html` via the shared API client with Bearer authentication and display it in a layout optimized for reading and printing (minimal dashboard chrome, resume-centered content). The rendered document SHALL use the MIT-format export template (experience before education, MIT section headings and entry typography)—not the dashboard section-editor preview cards.

#### Scenario: User opens preview from editor

- **WHEN** a signed-in user navigates to `/dashboard/cv/[id]/preview`
- **THEN** the client SHALL fetch export HTML for that CV id
- **AND** SHALL render the document content without section-editor controls

#### Scenario: Preview fetch failure

- **WHEN** export HTML returns 404 or 401
- **THEN** the UI SHALL show a clear error and a link back to the CV editor

### Requirement: The preview page SHALL support browser print and PDF download

The preview page SHALL provide:

- **Print** — invokes `window.print()` on the preview content so the user can save as PDF via the browser; print styles from the export HTML SHALL apply
- **Download PDF** — downloads bytes from `GET /cv/:id/export/pdf` with a sensible filename

Both actions SHALL use the same server-generated HTML/PDF pipeline (not client-side re-layout).

#### Scenario: User prints from preview

- **WHEN** the user activates Print on the preview page
- **THEN** the browser print dialog SHALL target the resume content with print-specific CSS from the export template

#### Scenario: User downloads PDF

- **WHEN** the user activates Download PDF on the preview page
- **THEN** the client SHALL request the PDF export endpoint and save the response as a file download

#### Scenario: PDF download unavailable

- **WHEN** the PDF endpoint returns 503
- **THEN** the UI SHALL show that PDF export is unavailable and SHALL still allow Print from HTML

### Requirement: The API client SHALL expose export helpers

`apps/web/src/lib/api.ts` SHALL provide typed helpers for fetching export HTML and downloading export PDF (blob or array buffer) using the authenticated `apiFetch` pattern.

#### Scenario: Helper uses bearer token

- **WHEN** `getCvExportHtml(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token
