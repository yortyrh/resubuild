## Why

Users can create and edit CVs in Resumind but have no guided path from a specific job posting to a tailored application package (optimized CV + cover letter). Manually matching experience to a role, toggling irrelevant bullets, rewriting the headline, and drafting a cover letter is slow and error-prone. A single **Prepare Application** flow—powered by the existing Mastra agent stack—closes that gap without building a full job-board product.

## What Changes

- Add a **Prepare Application** entry point where the user submits a job offer as **URL**, **plain text**, **PDF**, or **screenshot (image)**, plus an optional free-text instruction.
- Run a **one-shot Mastra workflow** that (1) extracts/normalizes the job posting, (2) selects the user's best-matching base CV using posting content + user message **or uses a user-picked base CV when provided**, (3) **clones** that CV with a `source_cv_id` reference, (4) **tailors** the clone (update `basics.label`, bold Markdown in relevant summaries/highlights, trim irrelevant bullets from the copy), and (5) generates a **cover letter** as **Markdown** in the job posting language (overridable via optional message).
- Persist a **`job_application`** record linking source CV, tailored clone CV, extracted job metadata, cover letter Markdown, and workflow status.
- Expose an **application workspace** in the web app: job summary, Markdown cover letter (copy as **rich text** for email/documents, optional PDF export), and standard CV section editing on the clone. **No AI chat**—refinement is manual in the editor after generation.
- **Hide application clones** from the main dashboard CV list (`GET /cv`) unless the user explicitly **promotes** a clone to the library.
- Provide **source-CV utilities** (clone service + agent tools + read-only UI) to load Work/Volunteer/Project entries from the original CV so the user can preview and copy portions back into the clone. The **source CV is never modified**.
- Reuse the user's **active AI agent account** (`ai-agent-accounts`) as the gate for AI features in this flow (same credential resolution as PDF import).

## Capabilities

### New Capabilities

- `job-application-preparation`: End-to-end product flow—intake forms, `job_application` persistence, API routes, workspace UI, clone visibility rules, letter copy/export, promote-to-library.
- `job-application-agent`: Mastra workflows and tools—parse job posting (URL/text/PDF/image), rank user CVs, clone + tailor CV using source-CV section loaders, generate cover letter Markdown in one shot.

### Modified Capabilities

- `cv-normalized-schema`: CV row kind/source linkage; `job_application` table.
- `database-cv-rls`: RLS for `job_application`; policies ensuring clones inherit CV ownership.
- `cv-rest-api`: Application routes under `/applications`; `GET /cv` excludes non-promoted application clones; clone/promote endpoints; optional PATCH for manual cover-letter edits.
- `cv-editor-ui`: Application workspace layout (letter + tailored CV editor); read-only preview of source Work/Volunteer/Project with copy-into-clone actions.
- `web-application`: Dashboard navigation to Prepare Application; list/history of applications; polling for prepare job status.
- `cv-resume-export`: Render cover letter Markdown to HTML/PDF (separate template from CV) using the same Puppeteer pipeline.
- `ai-agent-accounts`: Prepare Application requires a valid active account (see `ai-agent-settings-menu`; do not introduce a separate LLM config domain).
- `monorepo-and-toolchain`: Extend `apps/import-agent` with application workflows; document new env limits if any.

## Dependencies

- **`ai-agent-settings-menu`** — active account storage, `/ai/agents/*` API, settings UI (must land first).
- **`cv-html-view-pdf-export`** — Puppeteer PDF pipeline for letter and tailored CV export.

## Impact

- **Database**: New migration(s) for `job_application`, `cv.source_cv_id`, `cv.kind`, `cv.visible_in_library`.
- **apps/import-agent**: New workflows/tools (job parse, CV match, tailor, letter)—parallel to PDF import.
- **apps/api**: New `ApplicationModule` (controller, service, job runner); extensions to `CvService` (clone, list filter, promote, source-section loaders); letter export in export module.
- **apps/web**: New routes under `/dashboard/applications/*`; reuse CV editor components against clone id.
- **Dependencies**: Builds on `ai-agent-accounts`, normalized CV storage, and **`cv-html-view-pdf-export`** (HTML/PDF export). Does **not** include job search, saved searches, favorites, email notifications, or AI chat refinement.
- **Out of scope**: Iterative AI chat to refine letter or CV, job board integrations, scheduled job alerts, merging application clone back into source CV automatically, public share links, sending email from the app.
