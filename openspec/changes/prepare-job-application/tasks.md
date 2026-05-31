## 1. Prerequisites

- [ ] 1.1 Confirm `cv-html-view-pdf-export` is merged (CV HTML/PDF export pipeline required for letter PDF and tailored CV export in workspace)
- [ ] 1.2 Confirm `ai-agent-settings-menu` is merged (`AiAgentCredentialService`, active account gate, `/ai/agents/*` API)
- [ ] 1.3 Confirm `apps/import-agent` PDF import patterns are available on the branch

## 2. Database schema

- [ ] 2.1 Add migration: `cv.source_cv_id`, `cv.kind`, `cv.visible_in_library` with defaults for existing rows (`primary`, `true`)
- [ ] 2.2 Add migration: `job_application` table (including `cover_letter`, `selection_rationale`), indexes, RLS policies
- [ ] 2.3 Update `@resumind/types` / repository mappers for new CV fields

## 3. Import agent — prepare application workflow (one shot)

- [ ] 3.1 Add job posting normalize tools: URL fetch (SSRF-safe), text pass-through, reuse PDF extract, image-to-text vision step
- [ ] 3.2 Add `summarizeJobPostingTool` returning structured title, company, requirements, keywords
- [ ] 3.3 Add `rankCvForJobTool` selecting `source_cv_id` from user CV summaries + user message
- [ ] 3.4 Add source-CV loader tools (basics, Work/Volunteer/Project items) reading from `source_cv_id`
- [ ] 3.5 Add `tailorCvPatchTool` producing validated patches (label, Markdown bold, trimmed `highlights` on clone)
- [ ] 3.6 Add `draftCoverLetterTool` generating cover letter **Markdown**
- [ ] 3.7 Export `createPrepareApplicationWorkflow()` with colocated Vitest tests (mocked LLM + fetch)

## 4. API — CV clone, list filter, source loaders

- [ ] 4.1 Implement `CvCloneService` deep-copy in `apps/api/src/cv/` (header + all section tables, preserve row order) with colocated Jest tests
- [ ] 4.2 Add `CvSourceLoaderService` (or methods on clone service) to read Work/Volunteer/Project from `source_cv_id`
- [ ] 4.3 Update `CvService.findAll` to filter `visible_in_library = true`

## 5. API — Application module

- [ ] 5.1 Create `ApplicationModule`, `ApplicationController`, `ApplicationService` under `apps/api/src/application/`
- [ ] 5.2 Implement `POST /applications/prepare` (multipart intake, active AI agent account gate, 202 + job enqueue)
- [ ] 5.3 Implement in-memory application job store (user-scoped, TTL) and background runner invoking prepare workflow
- [ ] 5.4 Implement `GET /applications` and `GET /applications/:id` with status/progress
- [ ] 5.5 Implement optional `PATCH /applications/:id` for manual `coverLetter` Markdown edits (no AI)
- [ ] 5.6 Implement `POST /applications/:id/promote-clone`
- [ ] 5.7 Wire clone creation + tailor patch applier inside prepare runner; persist `job_application` on success
- [ ] 5.8 Add colocated Jest tests: auth, AI agent account gate, intake validation, owner checks, promote

## 6. API — Letter export

- [ ] 6.1 Add letter HTML template rendering Markdown → sanitized HTML in export module
- [ ] 6.2 Implement `GET /applications/:id/export/letter/html` and `.../pdf` reusing Puppeteer pipeline
- [ ] 6.3 Colocated tests for HTML output and PDF unavailable (`503`) path

## 7. Web — routes and API client

- [ ] 7.1 Add API helpers in `apps/web/src/lib/api.ts`: listApplications, prepareApplication, getApplication, updateApplicationLetter, promoteApplicationClone, export letter helpers
- [ ] 7.2 Add `/dashboard/applications` list page with colocated tests
- [ ] 7.3 Add `/dashboard/applications/new` intake form (URL, text, PDF/image upload, message) gated on active AI agent account
- [ ] 7.4 Add `/dashboard/applications/[id]` workspace shell with polling for prepare status
- [ ] 7.5 Add dashboard nav entry for Prepare Application
- [ ] 7.6 Colocated tests for intake validation, AI agent account gate, poll success/failure

## 8. Web — workspace UI

- [ ] 8.1 Letter panel: Markdown preview, editable textarea, copy plain text (email), copy Markdown, download PDF
- [ ] 8.2 Job summary and selection rationale from application detail
- [ ] 8.3 Link tailored CV to existing editor routes; show clone lineage and promote action
- [ ] 8.4 Source preview panel on Work/Volunteer/Project clone editors: read-only source entry by index, copy summary/highlights into clone

## 9. OpenSpec and docs

- [ ] 9.1 Document dependency on `cv-html-view-pdf-export` in root README or apps/api README

## 10. Verification

- [ ] 10.1 Manual smoke: prepare from pasted job text → tailored clone + Markdown letter → copy plain text → export letter PDF
- [ ] 10.2 Manual smoke: application clone absent from dashboard CV list until promoted
- [ ] 10.3 Manual smoke: copy highlight from source preview into clone; source CV unchanged
- [ ] 10.4 Run `pnpm test -- --run` for affected workspaces (`import-agent`, `api`, `web`, `types`)
- [ ] 10.5 Run `pnpm verify`

## 11. E2E test impact

- [ ] 11.1 **Must pass unchanged** — existing E2E for auth, dashboard CV list, manual create, section edit; `GET /cv` filter must not break tests that only use primary seeded CVs
- [ ] 11.2 **Update required if** E2E asserts total CV count without accounting for hidden clones — adjust expectations after seed changes
- [ ] 11.3 **Optional follow-up** — E2E for prepare flow with mocked Mastra/workflow in test env (not required for v1 if manual smoke passes)
