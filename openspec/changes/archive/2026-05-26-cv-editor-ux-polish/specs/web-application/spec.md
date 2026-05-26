## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting CV title and JSON Resume `basics` fields only (equivalent to the Basics tab edit field set). The client SHALL invoke `createCv` with the entered title and resume `data` (including `basics`) only when the user activates an explicit Save (or Create) control. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row. The create form SHALL support native form submit (Enter in a text field triggers Save). While CV list or auth-gated dashboard content is loading, the UI SHALL show skeleton placeholders per `cv-editor-ui` loading requirements rather than plain text alone.

#### Scenario: Dashboard CV flows

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract

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
