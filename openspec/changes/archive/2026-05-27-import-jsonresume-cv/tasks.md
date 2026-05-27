## 1. Shared import normalizer

- [x] 1.1 Add `prepareImportedResume` to `packages/types/src/` (strip `$schema`/`meta`, default array sections, reject non-objects)
- [x] 1.2 Export from `packages/types` package index
- [x] 1.3 Add colocated Vitest tests in `packages/types/src/prepare-imported-resume.test.ts` covering full sample shape, minimal basics-only input, and non-object rejection

## 2. Web — import UI

- [x] 2.1 Create `apps/web/src/components/cv/import-cv-form.tsx` with file input (`accept=".json,application/json"`), optional paste textarea, size limit, parse + normalize + error display
- [x] 2.2 Add colocated `import-cv-form.test.tsx` for JSON parse errors, oversize file, and successful normalize → `onImport` callback
- [x] 2.3 Update `/dashboard/cv/new` page client to present manual create and import paths (tabs or stacked sections) without POST on load
- [x] 2.4 Wire import success to `createCv({ data })` and navigate to `/dashboard/cv/:id`; surface API 400 validation messages
- [x] 2.5 Update `new-cv-page-client.test.tsx` (if present) for import path smoke

## 3. API — full-document create coverage

- [x] 3.1 Extend `apps/api/src/cv/cv.service.spec.ts` with create using multi-section `data` (work + education) asserting persisted sections and Resumind `meta` replacement
- [x] 3.2 Confirm failed validation on create does not leave orphan rows; add/adjust test if gap exists

## 4. Verification

- [x] 4.1 Manual smoke: import `.samples/resumes/jsonresume/Jane Doe - Senior Software Engineer.json` → editor shows all sections with derived title
- [x] 4.2 Manual smoke: import invalid JSON and schema-invalid file → inline errors, no new CV in dashboard
- [x] 4.3 Run `pnpm test -- --run` for `packages/types` and `apps/web` (and `apps/api` if touched)
- [x] 4.4 Run `pnpm verify`

## 5. E2E test impact

- [x] 5.1 **Must pass unchanged** — existing Playwright/Cypress E2E flows for auth, dashboard list, manual create, and edit unless a shared selector on `/dashboard/cv/new` breaks; update selectors only if new layout affects covered scenarios
- [x] 5.2 **Optional follow-up** — deferred (not required for v1; manual smoke passed)
