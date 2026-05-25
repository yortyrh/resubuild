## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL render a simplified create form collecting CV title and JSON Resume `basics` fields only (equivalent to the Basics tab edit field set). The client SHALL invoke `createCv` with the entered title and resume `data` (including `basics`) only when the user activates an explicit Save (or Create) control. On successful create, the UI SHALL navigate to `/dashboard/cv/:id` for full editing. Navigating away or canceling before Save SHALL NOT create a CV row.

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control and saves basics
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure

#### Scenario: User opens new CV without saving

- **WHEN** a signed-in user visits `/dashboard/cv/new` and leaves without clicking Save
- **THEN** the client SHALL NOT have called `POST /cv` for that visit
- **AND THEN** no new CV row SHALL appear in the dashboard list attributable to that visit

#### Scenario: User creates CV from simplified form

- **WHEN** a signed-in user fills title and/or basics on `/dashboard/cv/new` and clicks Save
- **THEN** the client SHALL call `createCv` once with the title and resume `data` containing the entered `basics`
- **AND THEN** on success SHALL navigate to `/dashboard/cv/:id` for the created CV
