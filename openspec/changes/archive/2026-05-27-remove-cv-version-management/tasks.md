## 1. Types — remove meta from normalized model

- [x] 1.1 Update `disassembleResume` in `packages/types/src/resume-normalized.ts` to not map `data.meta` to `meta_*` header fields
- [x] 1.2 Update `headerToSlimCvData` to return `basics` only (no `data.meta`)
- [x] 1.3 Update `assembleResume` to omit `meta` from assembled output
- [x] 1.4 Update `resume-normalized.test.ts` expectations for slim data and assembly
- [x] 1.5 Delete `packages/types/src/resume-meta.ts` and `resume-meta.test.ts`; remove export from `packages/types/src/index.ts`
- [x] 1.6 Remove `version` from `CvItemMutationResponse` in `apps/api/src/cv/cv-item.types.ts` and web `cv-item-api.ts` types

## 2. API — repository and service

- [x] 2.1 Remove `bumpMetaVersion` from `cv-normalized.repository.ts` and stop setting `meta_*` on insert/update payloads
- [x] 2.2 Remove `CvService.bumpVersion`, `applyResumeMetaForCreate` / `applyResumeMetaForUpdate` usage, and version checks from `cv.service.ts`
- [x] 2.3 Simplify `CvItemService`: remove `assertVersion`, header fetch for version, `bumpVersion`; drop `version` params
- [x] 2.4 Remove `version` from item DTOs and controller signatures
- [x] 2.5 Update `cv-test.helpers.ts` (drop `meta_*` from mocks unless testing null columns)
- [x] 2.6 Update `cv.service.spec.ts`, `cv-item.service.spec.ts`, `cv-items.controller.spec.ts`, `cv-normalized.repository.spec.ts`

## 3. Web client

- [x] 3.1 Remove `version` / `withVersion` from `cv-item-api.ts` and tests
- [x] 3.2 Simplify `cv-editor-provider.tsx`: no `version` / `onVersionChange`, no `stripResumeMetaFromEditor`, bootstrap from basics only
- [x] 3.3 Update `use-cv-item-mutation.ts`, `managed-array-section.tsx`, and all section components
- [x] 3.4 Remove 409 concurrency messaging from `apiFetch` if unused
- [x] 3.5 Update component test fixtures that include `meta` or `version`

## 4. Seeds and verification

- [x] 4.1 Update `scripts/lib/seed-supabase.mjs` to stop writing meta on sample CVs (if applicable)
- [x] 4.2 Run API unit tests: `pnpm --filter api test -- --run`
- [x] 4.3 Run web unit tests: `pnpm --filter web test -- --run`
- [x] 4.4 Run types tests: `pnpm --filter @resumind/types test -- --run`

## E2E test impact

**Update required.** `apps/api/test/e2e/local-supabase.e2e-spec.ts`: remove `meta.version` assertions, version chaining in mutation bodies, and any expectation of `data.meta` on create/detail responses. Re-run `pnpm test:e2e` after updates.
