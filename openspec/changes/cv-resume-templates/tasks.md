## 1. Prerequisites

- [x] 1.1 Confirm `cv-html-view-pdf-export` is applied: `packages/resume-template`, export routes, and preview route skeleton exist
- [x] 1.2 Keep `sampe-resumes-capd.pdf` open as visual reference during template implementation (14 pages)

## 2. Template registry and shared primitives

- [x] 2.1 Define `ResumeTemplate` interface and registry (`registerTemplate`, `getTemplate`, `listTemplates`, `TEMPLATE_IDS`) in `packages/resume-template/src/`
- [x] 2.2 Refactor existing MIT renderer into `templates/mit-classic.ts` and register as default
- [x] 2.3 Extract shared primitives: `document.ts` (HTML shell, print CSS), `markdown.ts`, composable section helpers under `primitives/sections/`
- [x] 2.4 Change public API to `renderResumeHtml(resume, templateId, options)` with fallback to `mit-classic`
- [x] 2.5 Add colocated Vitest tests for registry (list count ≥15, unknown id handling, mit-classic smoke render)

## 3. CAPD template implementations

- [x] 3.1 Implement `capd-first-year-tabular` (PDF p.1)
- [x] 3.2 Implement `capd-first-year-leadership` (PDF p.2)
- [x] 3.3 Implement `capd-undergraduate-mixed` (PDF p.3)
- [x] 3.4 Implement `capd-undergraduate-standard` (PDF p.4)
- [x] 3.5 Implement `capd-design` (PDF p.5)
- [x] 3.6 Implement `capd-global` (PDF p.6)
- [x] 3.7 Implement `capd-masters-icons` (PDF p.7)
- [x] 3.8 Implement `capd-masters-skills-first` (PDF p.8)
- [x] 3.9 Implement `capd-phd-academic` (PDF p.9)
- [x] 3.10 Implement `capd-phd-summary` (PDF p.10–11)
- [x] 3.11 Implement `capd-phd-consulting` (PDF p.12)
- [x] 3.12 Implement `capd-alum` (PDF p.13–14)
- [x] 3.13 Register all templates in `registry.ts`; add per-template colocated test (renders sample JSON; assert key section order or heading text)

## 4. Database and API — template persistence

- [x] 4.1 Add Supabase migration: `cv.template_id text not null default 'mit-classic'`
- [x] 4.2 Extend `UpdateCvDto` / `CvService` to validate and persist `templateId` against registry
- [x] 4.3 Include `templateId` in `GET /cv/:id` response envelope
- [x] 4.4 Add colocated Jest tests for PATCH with valid/invalid template id

## 5. API — catalog and template-aware export

- [x] 5.1 Add `GET /cv/export/templates` returning registry metadata (id, label, description, category, capdPage)
- [x] 5.2 Extend `CvExportService` to resolve template: query param → CV `template_id` → `mit-classic`
- [x] 5.3 Pass resolved template id to `renderResumeHtml` on HTML and PDF paths; return 400 for unknown id
- [x] 5.4 Add colocated Jest tests: catalog auth, export with template query, invalid template 400

## 6. Web — template picker (API HTML only)

- [x] 6.1 Add `listCvTemplates`, `updateCvTemplate`, and template query params to `getCvExportHtml` / `downloadCvPdf` in `apps/web/src/lib/api.ts` with colocated tests
- [x] 6.2 Add template `<Select>` (grouped by category) on preview page; load catalog on mount
- [x] 6.3 On template change: PATCH CV `templateId` and refetch export HTML with `template` query — display via iframe `srcDoc` (no React layout components)
- [x] 6.4 Wire Download PDF and Print to use currently selected template id
- [x] 6.5 Add colocated Vitest test: template change triggers refetch with new query param

## 7. Tooling and verification

- [x] 7.1 Update `scripts/generate-sample-pdfs.mjs` to accept `--template <id>` or generate all templates
- [x] 7.2 Add `packages/resume-template/README.md` documenting template extension contract (Open/Closed)
- [x] 7.3 Visual QA checklist: compare each template against corresponding CAPD PDF page using a seeded sample CV
- [x] 7.4 Run `pnpm verify` for touched workspaces

## E2E test impact

- **Must pass unchanged:** Auth, CV CRUD, section editor, and import E2E flows.
- **Update required:** None unless adding optional preview template smoke test.
- **Add (optional):** E2E selecting a template on preview and asserting HTML response differs from default — defer if CI complexity is high.
