## 1. API service cleanup

- [x] 1.1 Remove `parseChildIndex`, `mutateNestedString`, `createNestedString`, `updateNestedString`, and `deleteNestedString` from `apps/api/src/cv/cv-item.service.ts`
- [x] 1.2 Remove `parentId`, `childIndex`, and `value` from `apps/api/src/cv/cv-item.types.ts` if no remaining callers

## 2. Controller route removal

- [x] 2.1 Delete twelve nested handlers from `apps/api/src/cv/cv-items.controller.ts` (work/volunteer/projects highlights, education courses)
- [x] 2.2 Remove unused `StringValueDto` import from controller; delete `StringValueDto` from `apps/api/src/cv/dto/cv-item.dto.ts` if unused elsewhere

## 3. Tests

- [x] 3.1 Remove nested-route test cases from `apps/api/src/cv/cv-items.controller.spec.ts`
- [x] 3.2 Remove nested-string test cases from `apps/api/src/cv/cv-item.service.spec.ts`
- [x] 3.3 Confirm parent-save tests still cover highlights/courses via `updateArrayItem` / `createArrayItem` payloads

## 4. Verification

- [x] 4.1 Grep monorepo for `/highlights/` and `/courses/` path references; confirm only docs/changelog remain
- [x] 4.2 Run `pnpm test --filter api -- --run` and fix any failures

## E2E test impact

**Must pass unchanged** — no e2e specs reference nested highlight/course routes; editor flows already persist via parent create/update. No e2e spec edits required unless a latent nested-route test is discovered during grep.
