## 1. Jest coverage threshold

- [x] 1.1 Raise `coverageThreshold.global.branches` from 80 to 90 in `apps/api/jest.config.cjs`

## 2. Application module tests

- [x] 2.1 Expand `application.service.spec.ts` — prepare/update cancel paths, retries, PDF/image intake, cover letter export, API key scoping, tailoring patches, CV summary building
- [x] 2.2 Expand `application.repository.spec.ts` — null data paths for findAll/findOne/update
- [x] 2.3 Expand `application-prepare.store.spec.ts` — foreign user, missing record, TTL prune, `createApplicationId`

## 3. Supporting API module tests

- [x] 3.1 Expand `cv-clone.service.spec.ts` — default clone kind, missing assembly, missing promote target
- [x] 3.2 Expand `cv-item.service.spec.ts` — empty basics fallback paths
- [x] 3.3 Expand `cv-export.service.spec.ts` and `cv-export.util.spec.ts` — JSON export validation errors, slug edge cases
- [x] 3.4 Expand `import.service.spec.ts` — oversize markdown, website import failures, Tavily key, progress callbacks, schema validation fallbacks
- [x] 3.5 Expand `media.service.spec.ts` — thumbnail rollback warnings, missing `MEDIA_BUCKET`
- [x] 3.6 Expand `resume-schema.validator.spec.ts` — empty AJV instancePath fallback

## 4. Verification

- [x] 4.1 Run `pnpm test` in `apps/api` — all tests pass with ≥90% branch coverage

## E2E test impact

None — test-only change; no UI or API behavior changes. Existing E2E catalog unchanged.
