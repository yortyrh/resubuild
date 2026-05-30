## 1. API — preview-then-create for PDF and Markdown

- [x] 1.1 Generalize `finishWebsitePreviewJob` to `finishPreviewJob` and use it for PDF and Markdown instead of `finalize` → `cvService.create`
- [x] 1.2 Update PDF/Markdown workflow calls to return draft to preview finalize
- [x] 1.3 Update `import.service.spec.ts`: PDF/Markdown success expects `previewData`, not `cvId`
- [x] 1.4 Update `import.controller.spec.ts` job status fixtures

## 2. Web — import preview dialog

- [x] 2.1 Add `import-preview-dialog.tsx` with template select, `renderResumeHtml`, iframe helpers
- [x] 2.2 Add colocated `import-preview-dialog.test.tsx`
- [x] 2.3 Extract `cv-preview-iframe.tsx` from `cv-preview-client.tsx`

## 3. Web — Edit dialog and action row

- [x] 3.1 Update `import-json-edit-dialog.tsx`: title **Edit**
- [x] 3.2 Add `import-form-actions.tsx`: Import/Save, Preview, Edit, Cancel
- [x] 3.3 Wire preview dialog into import forms

## 4. Web — unified import UX (file + URL)

- [x] 4.1 Add `import-file-form.tsx` with auto-detect (JSON/PDF/Markdown) via `import-file-kind.ts`
- [x] 4.2 Add `/dashboard/cv/new/import/file`; redirect legacy json/pdf/markdown routes
- [x] 4.3 Refactor `import-url-form.tsx`: Import then Save, remove Fetch button, match file flow
- [x] 4.4 Add `import-validation-source.ts` and `import-validation-feedback.tsx`; toasts via `use-import-preview-toasts.ts`
- [x] 4.5 Update `new-cv-dropdown.tsx` and `new-cv-page-copy.ts` for file + URL only
- [x] 4.6 Remove `import-cv-form`, `import-pdf-cv-form`, `import-markdown-cv-form` and tests
- [x] 4.7 Add `import-file-form-skeleton.tsx` (replace "Checking import settings…" text)
- [x] 4.8 Add `import-progress-bar.tsx`, `import-kind-badge.tsx`, fixed `h-28` dropzone, badge + clear top-right
- [x] 4.9 Progress bar below action buttons; no reserved empty slot when idle

## 5. Verification

- [x] 5.1 Run `pnpm --filter api test -- --run` for import service specs
- [x] 5.2 Run `pnpm --filter web test -- --run` for import component tests
- [x] 5.3 Manual smoke: file JSON/PDF/MD and URL JSON/HTML flows

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, media upload, template presentation, work/skills reorder, LLM config catalog, URL validation rejections, markdown import rejection scenarios

### Update required

- Any PDF/Markdown job polling tests asserting `cvId` on success → assert `previewData` instead

### Add

- None required — `import.service.spec.ts` covers `previewData` contract; unified web flows covered by colocated Vitest
