## 1. Shared types

- [x] 1.1 Add `headerToSlimCvData(header: CvHeaderRow): Record<string, unknown>` in `packages/types/src/resume-normalized.ts` (meta via `metaFromCvHeader`, basics from header columns, omit undefined keys)
- [x] 1.2 Export from `packages/types` index and add unit tests in `packages/types/src/resume-normalized.test.ts`

## 2. API — CV read envelope

- [x] 2.1 Replace `CvService.toCvRecord` async assembly with sync `headerToSlimCvData`; remove `fetchSections` / `assembleResume` from read path in `apps/api/src/cv/cv.service.ts`
- [x] 2.2 Simplify `findAll` to map headers without `Promise.all` section fetches
- [x] 2.3 Update `apps/api/src/cv/cv.service.spec.ts` mocks (no `fetchSections` on findAll/findOne)

## 3. API — Basics item routes

- [x] 3.1 Remove profile listing from `getBasics` and `updateBasics` in `apps/api/src/cv/cv-item.service.ts`
- [x] 3.2 Update `apps/api/src/cv/cv-item.service.spec.ts` for basics without profiles

## 4. Web client

- [x] 4.1 Update `apps/web/src/components/cv/cv-editor-provider.tsx` to read `meta.version` from slim `cv.data` and not assume full resume sections on initial load
- [x] 4.2 Confirm section components still hydrate via existing `GET /cv/:cvId/{section}` calls (no change expected beyond provider)

## 5. Verification

- [x] 5.1 Run API unit tests: `pnpm --filter api test -- --run`
- [x] 5.2 Run types tests: `pnpm --filter @resumind/types test -- --run`

## E2E test impact

- **Update required**: `apps/api/test/e2e/local-supabase.e2e-spec.ts` — `GET /cv/:id` assertions must expect slim `data` (meta + basics) instead of full assembled resume with section arrays.
- **Unchanged**: Section-scoped routes and item CRUD e2e flows that already use `/cv/:cvId/work`, etc.
- **Add**: None for this change (export endpoint deferred).
