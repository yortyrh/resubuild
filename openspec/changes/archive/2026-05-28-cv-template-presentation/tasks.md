## 1. Database and package types

- [x] 1.1 Add migration `cv_template_presentation` with RLS policies
- [x] 1.2 Update `cv.template_id` default to `classic`
- [x] 1.3 Add `CvTemplatePresentationConfig` and merge helpers in `packages/resume-template/src/template-config.ts`
- [x] 1.4 Add colocated Vitest tests for config merge and `visibleSectionOrder`

## 2. Visual template registry refactor

- [x] 2.1 Implement four canonical templates in `visual-templates.ts` via shared factory
- [x] 2.2 Refactor `capd-factory.ts`; remove `capd-templates.ts`
- [x] 2.3 Wire `presentationConfig` through `renderResumeHtml` and section primitives
- [x] 2.4 Update registry tests for canonical ids

## 3. API — template presentation

- [x] 3.1 Add `CvTemplatePresentationRepository` and service
- [x] 3.2 Add DTO validation and `GET`/`PATCH` routes on `CvController`
- [x] 3.3 Pass merged presentation into `CvExportService`
- [x] 3.4 Add colocated Jest tests for presentation endpoints and export integration

## 4. API — import model catalog

- [x] 4.1 Add `build-catalog`, `fetch-models-dev`, fallback in `@resumind/import-models`
- [x] 4.2 Add `ImportModelsCatalogModule` with startup load and daily cron
- [x] 4.3 Wire import service to active catalog; add colocated tests
- [x] 4.4 Update `scripts/sync-import-models.mjs` and committed `catalog.json`

## 5. Web — preview and layout panel

- [x] 5.1 Add `getCvTemplatePresentation` / `updateCvTemplatePresentation` to `api.ts` with tests
- [x] 5.2 Add `TemplateConfigPanel` with dnd-kit section reorder and field toggles
- [x] 5.3 Refactor preview client: iframe `srcDoc`, skeleton, frame helpers
- [x] 5.4 Add `apps/web/DESIGN.md` and apply `surface-soft` to preview chrome
- [x] 5.5 Add colocated Vitest tests for preview client and template panel

## 6. Verification

- [x] 6.1 Run unit tests for api, web, resume-template, import-models
- [x] 6.2 Update `cv-html-view-pdf-export` design note for iframe preview decision
