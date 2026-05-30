## 1. Export normalization (`packages/types`)

- [x] 1.1 Add `prepare-exported-resume.ts` with `prepareExportedResume(resume, { updatedAt })` — strip item `id` fields, omit empty sections, add `$schema` and `meta`
- [x] 1.2 Export from `packages/types/src/index.ts`
- [x] 1.3 Add colocated Vitest tests: id stripping, empty section omission, meta/schema, round-trip with `prepareImportedResume`

## 2. API JSON export endpoint

- [x] 2.1 Add `renderJson(user, cvId)` to `CvExportService` — reuse `loadExportContext` without `withAbsoluteImageUrls`, pass through `prepareExportedResume`, validate with `ResumeSchemaValidator`
- [x] 2.2 Add `GET :id/export/json` to `CvExportController` with `Content-Type: application/json; charset=utf-8` and `Content-Disposition: attachment`
- [x] 2.3 Add colocated Jest tests for JSON export (owned CV, 404, no internal ids in body)
- [x] 2.4 Wire `ResumeSchemaValidator` into export module if not already available

## 3. Web client and preview UI

- [x] 3.1 Add `downloadCvJson(cvId)` to `apps/web/src/lib/api.ts` returning `{ blob, filename }` (or equivalent)
- [x] 3.2 Add colocated tests in `api.export.test.ts` for JSON download URL and auth header
- [x] 3.3 Add **Download JSON** button to `cv-preview-client.tsx` with loading/error states mirroring PDF download
- [x] 3.4 Update preview client tests if present for new button/handler

## 4. Documentation and verification

- [x] 4.1 Add JSON export route to `README.md` API table
- [x] 4.2 Run `pnpm test` and `pnpm test:e2e` (with `--run` for unit tests per project convention)

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth: login + `/auth/me`; CV list/get; skills reorder; work patch; media upload; `GET /cv/:id/export/html`; template presentation; import URL validation; AI/import LLM config endpoints

### Update required

- None

### Add

- `local-supabase.e2e-spec.ts` — `GET /cv/:id/export/json` returns 200 with `application/json`, `Content-Disposition` attachment filename, and `basics.name` for seeded CV
