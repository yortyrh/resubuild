## 1. Import agent — PDF OCR

- [x] 1.1 Add `pdfjs-dist` and `@napi-rs/canvas` dependencies
- [x] 1.2 Implement `render-pdf-pages.ts` (render up to 10 pages to PNG)
- [x] 1.3 Implement `transcribe-pdf-with-vision.tool.ts`
- [x] 1.4 Extend `extractPdfTextTool` with vision OCR fallback and optional injectable for tests
- [x] 1.5 Pass LLM credentials from `runPdfImportWorkflow` and prepare-application PDF intake
- [x] 1.6 Add unit test for OCR fallback path in `pdf-import.test.ts`

## 2. Import agent — image and DOCX

- [x] 2.1 Add `mammoth` dependency and `extract-docx-text.tool.ts`
- [x] 2.2 Implement `transcribe-image-resume.tool.ts`
- [x] 2.3 Export `runImageImportWorkflow` from `pdf-import.workflow.ts`
- [x] 2.4 Export new tools from `apps/import-agent/src/index.ts`

## 3. API

- [x] 3.1 Add `POST /cv/import/image` and `POST /cv/import/docx` to `ImportController`
- [x] 3.2 Implement `startImageImport`, `startDocxImport`, and `runImageJob` in `ImportService`
- [x] 3.3 Add colocated unit tests in `import.controller.spec.ts` and `import.service.spec.ts`

## 4. Web client

- [x] 4.1 Extend `import-file-kind.ts` for `image` and `docx` kinds
- [x] 4.2 Add `startImageImport` and `importCvFromDocx` to `api.ts`
- [x] 4.3 Route file import form uploads to the correct endpoint per kind
- [x] 4.4 Update copy in `import-file-form.tsx` and `new-cv-page-copy.ts`
- [x] 4.5 Extend `import-file-kind.test.ts`

## E2E test impact

**Must pass unchanged**

- Existing PDF and Markdown import job scenarios in `local-supabase.e2e-spec.ts` (if present)
- All auth, media, and CV CRUD regression guards

**Update required**

- None

**Add**

- None — new endpoints covered by unit tests; E2E import coverage deferred until fixture PDFs/images are added to the seed catalog.
