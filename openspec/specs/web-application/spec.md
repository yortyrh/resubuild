# Web application (Next.js)

## Purpose

Capture how the Resumind frontend authenticates users via the Nest API, calls CV endpoints with Bearer tokens, and exposes CV editing flows aligned with the API and Supabase-backed tokens (validated server-side).

## Requirements

### Requirement: The web app MUST use backend-owned HTTP endpoints for authentication and authenticated Nest API access

Interactive client bundles (`'use client'` modules and hooks) MAY import `@supabase/supabase-js` **exclusively for authentication flows** (sign-in, sign-out, OTP, magic link, email verification, session inspection). The Supabase client SHALL be initialised with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only. Direct database access, server-side secret access, and any symbol from `cv-rest-api` or `database-cv-rls` specs MUST remain server-side.

Session establishment, credential verification, logout, renewal, and user resolution for SPA purposes SHALL occur through either the Supabase client (preferred for the SPA) or documented HTTP endpoints on the Nest API origin identified by `NEXT_PUBLIC_API_URL`. The API origin **MAY differ** from the web origin; Nest **SHALL** enable **CORS** allowing the web origin and required methods and headers (including `Authorization` and `Content-Type`) for these calls. Next.js Route Handlers are **not required** for credential transport and SHOULD NOT duplicate auth business logic.

Authenticated requests to Nest CV endpoints SHALL send the short-lived **access token** from the Supabase client session in `Authorization: Bearer` (and **SHALL NOT** depend on browser cookies for establishing that identity). Refresh is handled automatically by the Supabase client through the publishable-key session; the API does not offer a server-side `POST /auth/refresh` endpoint.

#### Scenario: Cross-origin API access

- **WHEN** the web app is served from an origin different from `NEXT_PUBLIC_API_URL`
- **THEN** preflight and actual auth and CV requests MUST succeed when the browser origin is listed in the API's CORS allowlist and the client sends `Authorization` as required

#### Scenario: Supabase client refreshes the access token automatically

- **WHEN** the Supabase client session is nearing expiry
- **THEN** the client SHALL refresh the access token via the publishable-key session before the next `apiFetch`
- **AND** `apiFetch` SHALL read the (refreshed) access token from the Supabase client

#### Scenario: Authenticated API error handling

- **WHEN** the API returns a non-OK response
- **THEN** `apiFetch` SHALL surface a clear error string, including concatenated validation messages when present

#### Scenario: Client bundle has Supabase client but no DB-direct symbols

- **WHEN** a developer inspects the production web bundle
- **THEN** the auth chunk MAY import `@supabase/supabase-js` AND reference the publishable key
- **AND** MUST NOT import any symbol from `apps/api/src/cv/**` or `apps/api/src/database/**` and MUST NOT reference the Supabase service-role key

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

### Requirement: Item mutation helpers SHALL keep date-primary sections sorted

The dashboard CV editor and related helpers SHALL apply `@resumind/types` date sort helpers to Work, Volunteer, Education, Projects, Awards, Certificates, and Publications arrays whenever:

- A sort-affecting date field changes during create or edit form interaction, or
- A create, update, or delete mutation succeeds for those sections.

After update or delete, local section state SHALL be merged by matching item `id`, then sorted. After create, the client SHALL incorporate the returned item (with `id`) and sort the section (via section GET refetch or equivalent sort pass). Sort-backed sections (profiles, skills, languages, interests, references) SHALL continue to use reorder API and manual ordering only.

#### Scenario: Work section sorted after patch

- **WHEN** the client receives a successful work item update response
- **THEN** it SHALL merge the item by `id` and re-sort the work array with `sortWorkRows` (or `sortSectionRows('work', …)`)

#### Scenario: Date edit in form triggers immediate re-sort

- **WHEN** a user changes `endDate` on an in-progress work edit form
- **THEN** the visible work list SHALL re-sort before the user clicks Save

#### Scenario: Skills reorder unchanged

- **WHEN** a user reorders skills via drag-and-drop
- **THEN** the client SHALL continue to call the reorder API and SHALL NOT apply date sort helpers to skills

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
- **Download JSON** — downloads a JSON Resume file from `GET /cv/:id/export/json` with a sensible filename

Print and PDF actions SHALL use the same server-generated HTML/PDF pipeline (not client-side re-layout). Download JSON SHALL use the server JSON export endpoint (not client-side section fetches).

#### Scenario: User prints from preview

- **WHEN** the user activates Print on the preview page
- **THEN** the browser print dialog SHALL target the resume content with print-specific CSS from the export template

#### Scenario: User downloads PDF

- **WHEN** the user activates Download PDF on the preview page
- **THEN** the client SHALL request the PDF export endpoint and save the response as a file download

#### Scenario: User downloads JSON

- **WHEN** the user activates Download JSON on the preview page
- **THEN** the client SHALL request `GET /cv/:id/export/json` and save the response as a `.json` file download

#### Scenario: PDF download unavailable

- **WHEN** the PDF endpoint returns 503
- **THEN** the UI SHALL show that PDF export is unavailable and SHALL still allow Print from HTML and Download JSON

### Requirement: The API client SHALL expose export helpers

`apps/web/src/lib/api.ts` SHALL provide typed helpers for fetching export HTML, downloading export PDF (blob or array buffer), and downloading export JSON (blob or parsed object + filename) using the authenticated `apiFetch` pattern.

#### Scenario: Helper uses bearer token

- **WHEN** `getCvExportHtml(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token

#### Scenario: JSON download helper uses bearer token

- **WHEN** `downloadCvJson(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token
- **AND** SHALL target `GET /cv/:id/export/json`

### Requirement: Dashboard CV list SHALL load through a TanStack Query hook

The dashboard CV list component SHALL fetch data via a shared query hook (for example `useCvList`) backed by `listCvs` instead of local `useEffect` + `useState` fetch logic. Loading and error UI SHALL derive from query status (`isPending`, `isError`, `error`).

#### Scenario: User opens dashboard

- **WHEN** a signed-in user loads the dashboard CV list
- **THEN** the UI SHALL show the existing list skeleton while the query is pending
- **AND** SHALL render cards from cached query data on success

#### Scenario: Returning to dashboard reuses cache

- **WHEN** a user navigates from a CV editor back to the dashboard within stale time
- **THEN** the list SHALL render cached data immediately
- **AND MAY** refetch in the background per QueryClient defaults

### Requirement: CV editor bootstrap SHALL load header data through a TanStack Query hook

`CvEditorProvider` (or equivalent bootstrap) SHALL use a query hook for `getCv(cvId)` instead of a manual mount effect. Editor local resume state SHALL still be initialized from the slim `data` payload merged with `createEmptyResume()` as today.

#### Scenario: Editor loads CV header

- **WHEN** a user opens `/dashboard/cv/[id]`
- **THEN** the provider SHALL expose loading and error state from the CV detail query
- **AND** SHALL initialize local editor state when the query succeeds

### Requirement: Managed array sections SHALL hydrate items through section query hooks

CV section components using `ManagedArraySection` SHALL obtain section rows from a section-scoped query hook when hydration is required (`sectionItemsNeedHydration` or section mount). Components SHALL NOT pass ad hoc `refetchItems` callbacks built by `createSectionRefetch`.

#### Scenario: Empty section fetches from API

- **WHEN** a user opens a section with no local items
- **THEN** the section query SHALL fetch `GET /cv/:cvId/{section}` via the hook
- **AND** SHALL show the section skeleton while pending

#### Scenario: Section with stable ids skips redundant fetch

- **WHEN** local section state already contains items with stable UUIDs and hydration is not required
- **THEN** the section query MAY remain disabled until mount or explicit invalidation
- **AND** the UI SHALL NOT flash unnecessary loading states

### Requirement: Import LLM settings SHALL use TanStack Query for catalog and config reads

The import LLM settings form SHALL load providers, models (per provider), and current config through query hooks instead of chained `useEffect` fetches. Saving config SHALL use a mutation that invalidates the config query on success.

#### Scenario: Provider change loads models via query

- **WHEN** a user selects a different LLM provider
- **THEN** the client SHALL fetch models through the models query keyed by `providerId`
- **AND** SHALL show loading state for the model selector while that query is pending

### Requirement: The SPA SHALL expose Prepare Application routes and navigation

The App Router SHALL provide `/dashboard/applications` (list/history), `/dashboard/applications/new` (intake form: URL, text, file upload for PDF or screenshot up to 5 MB each, optional base CV picker, optional message), and `/dashboard/applications/[id]` (workspace with letter, job summary, tailored CV links—no chat). The dashboard shell SHALL include navigation to Prepare Application. Intake SHALL require a valid active AI agent account per `ai-agent-accounts`, linking to AI agent settings or the user menu when missing.

#### Scenario: User starts prepare from dashboard

- **WHEN** a signed-in user with a valid active AI agent account opens Prepare Application
- **THEN** the UI SHALL present multimodal job intake and submit to `POST /applications/prepare`

#### Scenario: User without AI agent account sees setup prompt

- **WHEN** a signed-in user opens Prepare Application without an active AI agent account
- **THEN** the UI SHALL direct them to AI agent settings (`/dashboard/settings/ai-agent`) or the user menu before intake is enabled

#### Scenario: Prepare progress polling

- **WHEN** a prepare job is queued or running
- **THEN** the client SHALL poll `GET /applications/:id` until status is ready or failed, then render the workspace or error

### Requirement: Application list SHALL be separate from the CV library

The dashboard CV list SHALL continue to show only library-visible CVs from `GET /cv`. Application history SHALL load from `GET /applications` and SHALL NOT mix application clones into the CV list until promoted.

#### Scenario: CV list unchanged by application clones

- **WHEN** a user completes prepare application without promoting the clone
- **THEN** the dashboard CV list count SHALL remain unchanged

#### Scenario: Promoted clone appears in CV list

- **WHEN** a user promotes an application clone from the workspace
- **THEN** the clone SHALL appear on the next CV list refresh

### Requirement: Application workspace SHALL disclose saved-base-CV fallback state

The application detail and update UI SHALL display the effective base CV label from API metadata. When regeneration uses a saved snapshot because the original library CV was deleted, the UI SHALL clearly indicate that the base CV is a saved copy. The API client contract SHALL include `sourceCvTitle` and `sourceCvFromSnapshot` to support this disclosure.

#### Scenario: Update dialog shows saved-copy warning

- **WHEN** an application detail payload sets `sourceCvFromSnapshot=true`
- **THEN** the update dialog SHALL show the base CV label with deleted-source context
- **AND** users SHALL understand regeneration still uses the saved base CV copy

#### Scenario: Update request keeps base source immutable

- **WHEN** a user submits update instructions from the dialog
- **THEN** the client SHALL send only update instruction fields
- **AND** SHALL rely on server-side source resolution to reuse the original/saved base CV

### Requirement: Auth capability feature flags SHALL be resolved client-side from `NEXT_PUBLIC_*` env vars

Optional sign-in flows (forgot password, email verification, passwordless magic link / OTP, GitHub OAuth, Google OAuth) MUST be gated by **client-side `NEXT_PUBLIC_*` env vars** resolved at build time by `apps/web/src/lib/auth/features.ts`. The SPA SHALL NOT add a server round-trip or layout shift to read the flag value at request time. The flag SHALL be interpreted as a strict boolean — only the literal string `true` enables the flow; anything else (including the empty string, `1`, `yes`, `TRUE`) is treated as `false`, and a missing var defaults to `false`. Flipping a flag requires a web redeploy to take effect in production.

`NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` is the mirror of the build-time gate for the "Continue with GitHub" button on `/login` and `/register`. The button is render-gated by this flag; the actual provider liveness is configured by the `[auth.external.github]` block in `supabase/config.toml` (consuming `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` from `supabase/.env`). The two are independent — a misconfigured GitHub app never silently leaks failed OAuth attempts to the UI. See `auth-github-oauth` for the end-to-end flow.

`NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` is the mirror of the build-time gate for the "Continue with Google" button on `/login` and `/register`. The button is render-gated by this flag; the actual provider liveness is configured by the `[auth.external.google]` block in `supabase/config.toml` (consuming `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_SECRET` from `supabase/.env`). The two are independent — a misconfigured Google app never silently leaks failed OAuth attempts to the UI. See `auth-google-oauth` for the end-to-end flow.

#### Scenario: Build-time flag is read with no request-time round-trip

- **WHEN** a user visits `/login` or `/register`
- **THEN** the SPA SHALL resolve `getAuthFeatures().github_oauth` and `getAuthFeatures().google_oauth` from `process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` and `process.env.NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` respectively at build time
- **AND** SHALL NOT issue a separate `GET` to the API to read the flag

#### Scenario: Non-`true` values disable the flow

- **WHEN** `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` is unset, the empty string, `1`, `yes`, `TRUE`, or any value other than the literal string `true`
- **THEN** the SPA SHALL treat the flag as `false`
- **AND** the "Continue with GitHub" button SHALL NOT render on `/login` or `/register`

#### Scenario: Non-`true` values disable the Google flow

- **WHEN** `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` is unset, the empty string, `1`, `yes`, `TRUE`, or any value other than the literal string `true`
- **THEN** the SPA SHALL treat the flag as `false`
- **AND** the "Continue with Google" button SHALL NOT render on `/login` or `/register`
- **AND** `supabase/config.toml` SHALL NOT configure `[auth.external.google]` (or it SHALL be present but disabled) and the API SHALL NOT expose `GET /auth/google` or `POST /auth/google/callback` (these respond `404 Not Found`)
