## 1. UI primitives

- [ ] 1.1 Add shadcn `Dialog` to `apps/web` if not present (`components/ui/dialog.tsx`)
- [ ] 1.2 Create `apps/web/src/components/cv/import-file-upload.tsx` with drag-and-drop, hidden input, accept/maxBytes props, file summary, clear control, and disabled state
- [ ] 1.3 Add colocated Vitest tests for `import-file-upload.tsx` (click select, oversize, wrong type, clear)

## 2. JSON import refactor

- [ ] 2.1 Create `apps/web/src/components/cv/import-json-edit-dialog.tsx` wrapping `JsonResumeEditor` with Save/Cancel and local draft state
- [ ] 2.2 Refactor `apps/web/src/components/cv/import-cv-form.tsx`: use `ImportFileUpload`, remove inline editor checkbox, add **Edit JSON…** button opening dialog, keep validation/Gravatar/import logic
- [ ] 2.3 Update or add colocated Vitest tests for `import-cv-form.tsx` (file load, dialog save updates source, import disabled on invalid JSON)

## 3. PDF import polish

- [ ] 3.1 Refactor `apps/web/src/components/cv/import-pdf-cv-form.tsx` to use `ImportFileUpload` instead of native file input
- [ ] 3.2 Improve progress/error presentation below drop zone (keep active-AI-account gate; link to AI agent settings when `ai-agent-settings-menu` is applied)
- [ ] 3.3 Update colocated Vitest tests for `import-pdf-cv-form.tsx` if present, or add minimal render test with mocked API

## 4. New CV page tab order

- [ ] 4.1 Update `apps/web/src/app/dashboard/cv/new/new-cv-page-client.tsx`: tab order PDF → manual → JSON, default tab PDF, consistent labels
- [ ] 4.2 Add or update test for default tab and tab order if page client has colocated tests

## 5. Verification

- [ ] 5.1 Manual smoke on `/dashboard/cv/new`: PDF tab default, drop zones for PDF/JSON, JSON edit in dialog, successful JSON import with sample file from `.samples/resumes/jsonresume/`
- [ ] 5.2 Run `pnpm --filter web test -- --run` and `pnpm --filter web typecheck` for touched files

## E2E test impact

- **Must pass unchanged:** Existing auth, CV create, JSON import, and PDF import E2E flows (selectors may need updates if tests target old tab labels or file inputs).
- **Update required:** Any E2E spec that asserts tab order, default tab, or file input selectors on `/dashboard/cv/new` — align with PDF-first tabs and drop zone `data-testid`s.
- **Add (optional):** E2E scenario opening JSON edit dialog and saving — defer unless existing new-CV E2E already covers import.
