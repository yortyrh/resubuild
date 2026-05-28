## Why

Users can create and edit CVs in Resumind but have no guided path from a specific job posting to a tailored application package (optimized CV + cover letter). Manually matching experience to a role, toggling irrelevant bullets, rewriting the headline, and drafting a presentation letter is slow and error-prone. A single **Prepare Application** flow—powered by the existing Mastra agent stack—closes that gap without building a full job-board product.

## What Changes

- Add a **Prepare Application** entry point where the user submits a job offer as **URL**, **plain text**, **PDF**, or **screenshot (image)**, plus an optional free-text instruction.
- Run a **Mastra workflow** that (1) extracts/normalizes the job posting, (2) selects the user's best-matching base CV using posting content + user message, (3) **clones** that CV with a `source_cv_id` reference, (4) **tailors** the clone (update `basics.label`, bold Markdown in relevant summaries/highlights, activate/deactivate highlight bullets), and (5) generates a **presentation letter** draft.
- Persist an **`job_application`** record linking source CV, tailored clone CV, extracted job metadata, cover letter text, and workflow/chat state.
- Expose an **application workspace** in the web app: chat panel for iterative AI edits (letter + cloned CV), standard CV section editing on the clone, copy letter to clipboard, and export letter/CV to PDF via existing API export pipeline (depends on `cv-html-view-pdf-export`).
- **Hide application clones** from the main dashboard CV list (`GET /cv`) unless the user explicitly **promotes** a clone to the library.
- Add **`inactive_highlights`** storage on normalized work/volunteer/project rows so bullets can be hidden from export without deleting text or breaking JSON Resume export shape.
- Reuse the user's **active AI agent account** (`ai-agent-accounts`) as the gate for AI features in this flow (same credential resolution as PDF import).
- Enable **Supabase Realtime** locally (`supabase/config.toml` `[realtime] enabled = true`) for live chat message sync in the application workspace (v1 may poll as fallback; Realtime is required for production UX).

## Capabilities

### New Capabilities

- `job-application-preparation`: End-to-end product flow—intake forms, `job_application` persistence, API routes, workspace UI, clone visibility rules, letter copy/export, promote-to-library.
- `job-application-agent`: Mastra workflows and tools—parse job posting (URL/text/PDF/image), rank user CVs, clone + tailor CV, generate/revise cover letter, chat turn handler reusing the import agent tool patterns.

### Modified Capabilities

- `cv-normalized-schema`: CV row kind/source linkage; `inactive_highlights` on highlight-bearing section tables; `job_application` and `job_application_message` tables.
- `database-cv-rls`: RLS for new application tables; policies ensuring clones inherit CV ownership.
- `cv-rest-api`: Application routes under `/applications`; `GET /cv` excludes non-promoted application clones; clone/promote endpoints; optional `POST /applications/:id/chat`.
- `cv-editor-ui`: Application workspace layout (chat + letter + tailored CV editor); highlight active/inactive toggles in clone context.
- `web-application`: Dashboard navigation to Prepare Application; list/history of applications; polling or Realtime subscription for chat/job status.
- `cv-resume-export`: Export presentation letter as HTML/PDF (separate template from CV) using the same Puppeteer pipeline.
- `ai-agent-accounts`: Prepare Application and chat require a valid active account (see `ai-agent-settings-menu`; do not introduce a separate LLM config domain).
- `monorepo-and-toolchain`: Enable Supabase Realtime in local config; extend `apps/import-agent` (or sibling package) with application workflows; document new env limits if any.

## Dependencies

- **`ai-agent-settings-menu`** — active account storage, `/ai/agents/*` API, settings UI (must land first).
- **`cv-html-view-pdf-export`** — Puppeteer PDF pipeline for letter and tailored CV export.

## Impact

- **Database**: New migration(s) for `job_application`, `job_application_message`, `cv.source_cv_id`, `cv.kind`, `cv.visible_in_library`, section `inactive_highlights` columns.
- **apps/import-agent**: New workflows/tools (job parse, CV match, tailor, letter, chat)—parallel to PDF import.
- **apps/api**: New `ApplicationModule` (controller, service, job runner); extensions to `CvService` (clone, list filter, promote); letter export in export module.
- **apps/web**: New routes under `/dashboard/applications/*`; chat UI; reuse CV editor components against clone id.
- **supabase/config.toml**: `[realtime] enabled = true`.
- **Dependencies**: Builds on `ai-agent-accounts`, normalized CV storage, and **`cv-html-view-pdf-export`** (HTML/PDF export). Does **not** include job search, saved searches, favorites, or email notifications.
- **Out of scope**: Job board integrations, scheduled job alerts, merging application clone back into source CV automatically, public share links.
