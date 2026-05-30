## 1. API — preview-then-create for PDF and Markdown

- [ ] 1.1 Generalize `finishWebsitePreviewJob` in `apps/api/src/import/import.service.ts` to `finishPreviewJob` and use it for PDF (`runPdfJob`) and Markdown (`runTextJob`) instead of `finalize` → `cvService.create`
- [ ] 1.2 Update PDF/Markdown workflow calls to return draft to preview finalize (adjust `runPdfImportWorkflow` / `runTextImportWorkflow` usage if finalize callback is removed)
- [ ] 1.3 Update `apps/api/src/import/import.service.spec.ts`: PDF/Markdown success expects `previewData`, not `cvId`; add failure cases unchanged
- [ ] 1.4 Update `apps/api/src/import/import.controller.spec.ts` job status fixtures if they assert `cvId` on agent success

## 2. Web — import preview dialog

- [ ] 2.1 Add `apps/web/src/components/cv/import-preview-dialog.tsx`: template select, `listCvTemplates`, `renderResumeHtml`, iframe + height helpers from `cv-preview-frame.ts`
- [ ] 2.2 Add colocated `import-preview-dialog.test.tsx` (template change re-renders, dialog closes without import)
- [ ] 2.3 Extract shared iframe render helper from `cv-preview-client.tsx` only if needed to avoid duplication (minimal diff)

## 3. Web — Edit dialog and action row

- [ ] 3.1 Update `import-json-edit-dialog.tsx`: title **Edit**, keep save/cancel behavior
- [ ] 3.2 Add `import-form-actions.tsx` (or inline shared pattern): Import, Preview, Edit (Pencil icon), Cancel with consistent disabled rules
- [ ] 3.3 Update `import-cv-form.tsx`: Preview button, Edit rename/icon, wire `ImportPreviewDialog`
- [ ] 3.4 Update `import-url-form.tsx`: remove raw JSON `<pre>` preview block; add Preview, Edit, `ImportPreviewDialog`
- [ ] 3.5 Update colocated tests for JSON and URL forms (`import-cv-form.test.tsx`, `import-url-form` tests if present)

## 4. Web — PDF and Markdown forms

- [ ] 4.1 Refactor `import-pdf-cv-form.tsx`: on job success use `previewData` + `parseImportJsonSource`; props `onImport` instead of `onSuccess`; Gravatar/image hints like URL form
- [ ] 4.2 Refactor `import-markdown-cv-form.tsx` same as PDF
- [ ] 4.3 Update `apps/web/src/app/dashboard/cv/new/import/pdf/page.tsx` and `markdown/page.tsx` to use `handleImport` from `useNewCvHandlers`
- [ ] 4.4 Update `import-pdf-cv-form.test.tsx` and `import-markdown-cv-form.test.tsx` for preview-then-create flow
- [ ] 4.5 Update `new-cv-routes.test.tsx` if button labels change (`Edit JSON…` → `Edit`)

## 5. Verification

- [ ] 5.1 Run `pnpm --filter api test -- --run` for import service specs
- [ ] 5.2 Run `pnpm --filter web test -- --run` for import component tests
- [ ] 5.3 Manual smoke: JSON Preview + Edit; PDF agent success → Preview → Import; URL HTML job → Preview (no raw JSON block)

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, media upload, template presentation, work/skills reorder, LLM config catalog, URL validation rejections, markdown import rejection scenarios (missing file, no LLM config)

### Update required

- `local-supabase.e2e-spec.ts` — any future PDF/Markdown **success** job polling tests that assert `cvId` on `GET /cv/import/:jobId` (change to assert `previewData` instead); update if added during implementation

### Add

- `local-supabase.e2e-spec.ts` — optional: PDF or Markdown job mocked/workflow unit coverage already in service spec; add E2E only if a stable agent-less fixture path exists for full job success. Otherwise rely on `import.service.spec.ts` for `previewData` contract.
