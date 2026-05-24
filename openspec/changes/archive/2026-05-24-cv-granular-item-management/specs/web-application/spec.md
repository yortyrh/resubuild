## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load CVs through `listCvs`, `getCv`, `createCv`, and `deleteCv`, and SHALL mutate resume sections through item-scoped helpers matching the REST contract

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control and saves basics
- **THEN** the client SHALL call `uploadResumeMedia` when uploading a file, assign the returned API URL to `basics.image`, persist basics via the basics patch helper, and surface descriptive errors on failure
