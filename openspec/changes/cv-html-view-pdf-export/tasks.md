## 1. Shared MIT-format resume template package

- [ ] 1.1 Create `packages/resume-template` with `package.json`, `tsconfig.json`, Vitest config, and export `renderResumeHtml(resume)`
- [ ] 1.2 Refactor renderer from `scripts/lib/mit-template-renderer.mjs` to MIT classic layout: centered header, ruled ALL-CAPS section titles, visible `SUMMARY` section
- [ ] 1.3 Implement MIT entry layouts: work/volunteer (employer bold + dates right, position italic), education (institution bold + dates right, degree line bold), skills (`**Name:**` comma keywords)
- [ ] 1.4 Enforce section order: Summary → Experience → Volunteer → Education → Skills → Projects → Awards → Certificates → Publications → Languages → Interests → References
- [ ] 1.5 Add colocated tests: section order when work+education present, work employer-first markup, skills category line format
- [ ] 1.6 Add `renderMarkdownField(value)` with sanitized HTML; wire into summary, descriptions, highlights, references
- [ ] 1.7 Update `scripts/generate-sample-pdfs.mjs` to use the package; run `pnpm samples:pdf` and visually compare output to MIT reference (Letter, serif, experience before education)

## 2. API — export assembly and HTML

- [ ] 2.1 Add `CvExportModule` / `CvExportService` in `apps/api/src/cv-export/` using `CvNormalizedRepository.fetchSections` + `assembleResume` + profiles merged into `basics`
- [ ] 2.2 Implement absolute URL rewriting for `basics.image` using configured API public origin
- [ ] 2.3 Add `CvExportController` with `GET /cv/:id/export/html` (auth guard, 404 on missing CV)
- [ ] 2.4 Register module in `app.module.ts`; document `API_PUBLIC_URL` (or reuse existing origin env) in `apps/api/.env.example`
- [ ] 2.5 Add colocated Jest tests for HTML export (mock repository, assert title/name in HTML; 404 case)

## 3. API — PDF generation

- [ ] 3.1 Add `puppeteer` (or `puppeteer-core`) to `apps/api` with optional `CHROMIUM_EXECUTABLE_PATH` in `.env.example`
- [ ] 3.2 Implement `renderPdfFromHtml(html)` in export service (Letter, margins, `printBackground`, shared with sample script options)
- [ ] 3.3 Add `GET /cv/:id/export/pdf` returning PDF bytes and `Content-Disposition` filename slug
- [ ] 3.4 Return 503 when Chromium launch fails; keep HTML route working
- [ ] 3.5 Add colocated Jest tests with mocked Puppeteer (verify PDF path invoked with HTML from same render method)

## 4. Web — preview route and API client

- [ ] 4.1 Add `getCvExportHtml(cvId)` and `downloadCvPdf(cvId)` to `apps/web/src/lib/api.ts` with colocated tests
- [ ] 4.2 Create `apps/web/src/app/dashboard/cv/[id]/preview/page.tsx` (and client component if needed) fetching and displaying export HTML
- [ ] 4.3 Add toolbar: Print (`window.print()`), Download PDF, Back to editor; handle 503 on PDF with user-visible message
- [ ] 4.4 Add colocated Vitest test for preview page (mock API, assert toolbar actions wired)

## 5. Web — editor chrome navigation

- [ ] 5.1 Add Preview control to `CvEditorChrome` / breadcrumb area linking to `/dashboard/cv/[id]/preview`
- [ ] 5.2 Confirm dashboard CV open still lands on editor routes, not preview (manual or test)

## 6. Verification and docs

- [ ] 6.1 Manual smoke: edit CV with work + education → Preview shows MIT layout (EXPERIENCE before EDUCATION, ruled headings) → Print/PDF match preview
- [ ] 6.2 Update root `README.md` with preview/export feature and Chromium note for API PDF
- [ ] 6.3 Run `pnpm verify` (or package-scoped test/typecheck) for touched workspaces

## E2E test impact

- **Must pass unchanged:** Existing auth, CV CRUD, and section editor E2E flows unless a spec explicitly adds preview coverage.
- **Update required:** None for v1 unless adding a dedicated preview smoke test.
- **Add (optional):** E2E scenario navigating to `/dashboard/cv/[id]/preview` and asserting export HTML contains basics name — defer if Chromium/HTML fetch complicates CI.
