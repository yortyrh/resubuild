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
- **THEN** `apiFetch` SHALL surface a clear error string, including concatenated validation messages when present and a specific message for HTTP 409 concurrency conflicts

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The dashboard CV list route (`/dashboard`) SHALL delegate page heading (`My CVs`), descriptive subcopy, and the primary **New CV** action to the `CvList` component so empty-state and populated-state views share the same chrome. The dashboard page component itself MUST NOT duplicate this header.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting CV title and JSON Resume `basics` fields only (equivalent to the Basics tab edit field set). The client SHALL invoke `createCv` with the entered title and resume `data` (including `basics`) only when the user activates an explicit Save (or Create) control. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row. The create form SHALL support native form submit (Enter in a text field triggers Save). While CV list or auth-gated dashboard content is loading, the UI SHALL show skeleton placeholders per `cv-editor-ui` loading requirements rather than plain text alone.

#### Scenario: Dashboard CV flows

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract

#### Scenario: Dashboard list owns page header

- **WHEN** a signed-in user views `/dashboard` with one or more CVs
- **THEN** the `My CVs` heading, description, and **New CV** button SHALL appear above the CV grid inside `CvList`
- **AND** the dashboard page wrapper SHALL NOT render a duplicate header

#### Scenario: Empty dashboard shows consistent chrome

- **WHEN** a signed-in user views `/dashboard` with zero CVs
- **THEN** the empty-state card SHALL appear below the same `My CVs` header and **New CV** action as the populated list

#### Scenario: Profile photo upload on basics

- **WHEN** a user uploads a profile photo from the Basics tab
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure

#### Scenario: New CV page does not create on visit

- **WHEN** a signed-in user visits `/dashboard/cv/new` and leaves without clicking Save
- **THEN** the client SHALL NOT have called `POST /cv`
- **AND THEN** no new CV row SHALL appear in the dashboard list attributable to that visit

#### Scenario: New CV saves on explicit action

- **WHEN** a signed-in user fills title and/or basics on `/dashboard/cv/new` and clicks Save
- **THEN** the client SHALL call `createCv` once with the entered payload
- **AND THEN** on success SHALL navigate to `/dashboard/cv/:id` for the created CV

#### Scenario: Create CV form submits on Enter

- **WHEN** a user presses Enter in a text field on the new CV form
- **THEN** the Save action SHALL run as if the Save button were clicked

### Requirement: Shared types and schema packages SHALL inform the client and server contract

The frontend and API both depend on workspace packages for resume typing and schema; changes to CV shape MUST flow through those packages to keep UI, API validation, and persistence aligned.

#### Scenario: Workspace alignment

- **WHEN** a developer changes resume structure
- **THEN** they SHALL update `packages/types` and/or `packages/schemas` and ensure both `apps/web` and `apps/api` still build and tests pass

### Requirement: The CV editor SHALL persist resume sections through item-scoped API helpers

The web client in `apps/web/src/lib/api.ts` SHALL expose typed functions for each item operation defined in `cv-rest-api` (basics patch, array CRUD, nested highlight/course CRUD). The dashboard CV editor SHALL call these functions on per-item Save and confirmed Delete instead of deferring resume body changes to a single Save CV action.

#### Scenario: Saving a language entry

- **WHEN** a user saves a language from the inline edit form
- **THEN** the client SHALL invoke the language update helper with the CV id, item index, payload, and current meta version
- **AND THEN** on success SHALL update local section state from the response

### Requirement: CV title MAY save independently of resume item mutations

The editor MAY retain a title field with its own save path via `PATCH /cv/:id` (title only) or equivalent, separate from granular resume item routes. Resume body sections SHALL NOT depend on a global Save CV button.

#### Scenario: No bulk resume save required

- **WHEN** a user edits and saves multiple work entries in sequence
- **THEN** each save SHALL persist independently and the UI SHALL NOT require clicking Save CV to commit those work changes

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
