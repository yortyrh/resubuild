## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The per-CV editor SHALL organize authoring tabs so **Social profiles (`basics.profiles`)**, rich summaries, geography controls, profile imagery, and other sections fulfill `cv-editor-ui` UX requirements **without** initiating Storage uploads from browser Supabase clients—profile photo uploads SHALL funnel through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia` in `src/lib/api.ts`. Rich-text editors SHALL NOT expose separate image-upload tooling.

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load and save CVs through the typed client functions in `src/lib/api.ts` (`listCvs`, `getCv`, `createCv`, `updateCv`, `deleteCv`) matching the REST contract

#### Scenario: User uploads a profile photo used in resumes

- **WHEN** a signed-in user selects a file in the Basics profile photo control
- **THEN** the client SHALL call `uploadResumeMedia`, observe bearer refresh timing consistent with cross-origin Nest rules, assign the returned API URL to `basics.image`, and surface descriptive errors analogous to CV CRUD helpers on failure
