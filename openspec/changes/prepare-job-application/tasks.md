## 1. Prerequisites

- [x] 1.1 Confirm `cv-html-view-pdf-export` is merged (CV HTML/PDF export pipeline required for letter PDF and tailored CV export in workspace)
- [x] 1.2 Confirm `ai-agent-settings-menu` is merged (`AiAgentCredentialService`, active account gate, `/ai/agents/*` API)
- [x] 1.3 Confirm `apps/import-agent` PDF import patterns are available on the branch

## 2. Database schema

- [x] 2.1 Add migration: `cv.source_cv_id`, `cv.kind` with defaults for existing rows (`primary`)
- [x] 2.2 Add migration: `job_application` table (including `cover_letter`, `selection_rationale`), indexes, RLS policies
- [x] 2.3 Update `@resumind/types` / repository mappers for new CV fields

## 3. Import agent — prepare application workflow (one shot)

- [x] 3.1 Add job posting normalize tools: URL fetch (SSRF-safe), text pass-through, reuse PDF extract, image-to-text vision step
- [x] 3.2 Add `summarizeJobPostingTool` returning structured title, company, requirements, keywords
- [x] 3.3 Add `rankCvForJobTool` selecting `source_cv_id` when intake omits `sourceCvId`; skip when user provides `sourceCvId`
- [x] 3.4 Add source-CV loader tools (basics, Work/Volunteer/Project items) reading from `source_cv_id`
- [x] 3.5 Add `tailorCvPatchTool` producing validated patches (label, Markdown bold, trimmed `highlights` on clone)
- [x] 3.6 Add `draftCoverLetterTool` generating cover letter **Markdown** in posting language (override from user message)
- [x] 3.7 Export `createPrepareApplicationWorkflow()` with colocated Vitest tests (mocked LLM + fetch)

## 4. API — CV clone, list filter, source loaders

- [x] 4.1 Implement `CvCloneService` deep-copy in `apps/api/src/cv/` (header + all section tables, preserve row order) with colocated Jest tests
- [x] 4.2 Add `CvSourceLoaderService` (or methods on clone service) to read Work/Volunteer/Project from `source_cv_id`
- [x] 4.3 Update `CvService.findAll` to filter `kind = primary`

## 5. API — Application module

- [x] 5.1 Create `ApplicationModule`, `ApplicationController`, `ApplicationService` under `apps/api/src/application/`
- [x] 5.2 Implement `POST /applications/prepare` (multipart intake, optional `sourceCvId`, PDF/image max 5 MB, active AI agent account gate, 202 + job enqueue)
- [x] 5.3 Implement in-memory application job store (user-scoped, TTL) and background runner invoking prepare workflow
- [x] 5.4 Implement `GET /applications` and `GET /applications/:id` with status/progress
- [x] 5.5 Implement optional `PATCH /applications/:id` for manual `coverLetter` Markdown edits (no AI)
- [x] 5.6 Implement `POST /applications/:id/promote-clone`
- [x] 5.7 Wire clone creation + tailor patch applier inside prepare runner; persist `job_application` on success
- [x] 5.8 Add colocated Jest tests: auth, AI agent account gate, intake validation, owner checks, promote

## 6. API — Letter export

- [x] 6.1 Add letter HTML template rendering Markdown → sanitized HTML in export module
- [x] 6.2 Implement `GET /applications/:id/export/letter/html` and `.../pdf` reusing Puppeteer pipeline
- [x] 6.3 Colocated tests for HTML output and PDF unavailable (`503`) path

## 7. Web — routes and API client

- [x] 7.1 Add API helpers in `apps/web/src/lib/api.ts`: listApplications, prepareApplication, getApplication, updateApplicationLetter, promoteApplicationClone, export letter helpers
- [x] 7.2 Add `/dashboard/applications` list page with colocated tests
- [x] 7.3 Add `/dashboard/applications/new` intake form (URL, text, PDF/image upload max 5 MB, optional base CV picker, message) gated on active AI agent account
- [x] 7.4 Add `/dashboard/applications/[id]` workspace shell with polling for prepare status
- [x] 7.5 Add dashboard nav entry for Prepare Application
- [x] 7.6 Colocated tests for intake validation, AI agent account gate, poll success/failure

## 8. Web — workspace UI

- [x] 8.1 Letter panel: Markdown preview, editable textarea, copy rich text (HTML clipboard + plain fallback), download PDF
- [x] 8.2 Job summary and selection rationale from application detail
- [x] 8.3 Link tailored CV to existing editor routes; show clone lineage and promote action
- [x] 8.4 Source preview panel on Work/Volunteer/Project clone editors: read-only source entry by index, copy summary/highlights into clone

## 9. OpenSpec and docs

- [x] 9.1 Document dependency on `cv-html-view-pdf-export` in root README or apps/api README

## 10. Verification

- [ ] 10.1 Manual smoke: prepare from pasted job text → tailored clone + Markdown letter → copy rich text → export letter PDF
- [ ] 10.2 Manual smoke: application clone absent from dashboard CV list until promoted
- [ ] 10.3 Manual smoke: copy highlight from source preview into clone; source CV unchanged
- [x] 10.4 Run `pnpm test -- --run` for affected workspaces (`import-agent`, `api`, `web`, `types`)
- [ ] 10.5 Run `pnpm verify`

## 11. E2E test impact

- [x] 11.1 **Must pass unchanged** — existing E2E for auth, dashboard CV list, manual create, section edit; `GET /cv` filter must not break tests that only use primary seeded CVs
- [x] 11.2 **Update required if** E2E asserts total CV count without accounting for hidden clones — adjust expectations after seed changes
- [x] 11.3 **Optional follow-up** — E2E for prepare flow with mocked Mastra/workflow in test env (not required for v1 if manual smoke passes)
