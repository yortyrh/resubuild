## 1. API — repository and types

- [x] 1.1 Add `getSectionRowById(supabase, cvId, section, rowId)` to `apps/api/src/cv/cv-normalized.repository.ts` with unit tests in `cv-normalized.repository.spec.ts`
- [x] 1.2 Update `CvItemMutationResponse` in `apps/api/src/cv/cv-item.types.ts` — id-centric shape; remove required `index` / `parentIndex` from contract
- [x] 1.3 Remove or deprecate `getSectionRowByIndex` if no longer used after service refactor

## 2. API — service layer

- [x] 2.1 Refactor `updateArrayItem` / `deleteArrayItem` in `apps/api/src/cv/cv-item.service.ts` to accept `itemId` and use `getSectionRowById` (no `listSectionRows` on update/delete)
- [x] 2.2 Refactor profile update/delete similarly
- [x] 2.3 Refactor `createArrayItem` / profile create to return `{ item, version }` without listing section for index (drop `findIndexByRowId` on create path)
- [x] 2.4 Refactor nested string mutations to resolve parent by `parentId` instead of `parentIndex`
- [x] 2.5 Update `apps/api/src/cv/cv-item.service.spec.ts` for id-based lookups and 404 on unknown id

## 3. API — controller routes

- [x] 3.1 Change `:index` → `:itemId` with UUID validation on all array-item PATCH/DELETE routes in `apps/api/src/cv/cv-items.controller.ts` (profiles, work, volunteer, education, skills, projects, awards, certificates, publications, languages, interests, references)
- [x] 3.2 Change nested routes `:parentIndex` → `:parentId` for highlights/courses
- [x] 3.3 Update controller unit/e2e callers if any reference old param names

## 4. Web — API client

- [x] 4.1 Update `arrayCrud` in `apps/web/src/lib/cv-item-api.ts` to use `itemId: string` for update/delete URLs
- [x] 4.2 Update profile helpers (`updateCvProfile`, `deleteCvProfile`) to use item id
- [x] 4.3 Update nested string CRUD helpers to use `parentId`
- [x] 4.4 Align `CvItemMutationResponse` type in web with API (id-centric, optional index removed)

## 5. Web — editor state and components

- [x] 5.1 Add `mergeItemById` / `removeItemById` helpers in `apps/web/src/lib/cv-section-order.ts` with tests in `cv-section-order.test.ts`
- [x] 5.2 Update `ManagedArraySection` to track `editingId` / `deleteId`, pass ids to API, merge responses by id
- [x] 5.3 Update `managed-basics-section.tsx` (profiles) for id-based profile CRUD — profiles use `ManagedArraySection` in `profiles-section.tsx` with id-based API
- [x] 5.4 After create: refetch section or sort locally — wire chosen strategy in section pages / mutation callbacks
- [x] 5.5 Ensure section item types expose `id` from section GET responses across `cv-sections.tsx` and section components

## 6. Verification

- [x] 6.1 Run `pnpm test -- --run` in `apps/api` (unit)
- [x] 6.2 Run `pnpm test -- --run` in `apps/web` (unit)
- [x] 6.3 Run `pnpm test:e2e` with local Supabase after updating e2e tests

## E2E test impact

- **Update required**: `apps/api/test/e2e/local-supabase.e2e-spec.ts` (and any other e2e specs) — capture row `id` from list/create responses; use id in PATCH/DELETE paths instead of numeric index
- **Must pass unchanged**: auth 401 on item routes; optimistic concurrency 409; section GET ordering; reorder endpoints (uuid-based, unchanged)
- **Add**: e2e scenario patching work by id after a new entry changes list order (proves id stability vs index)

## 7. Documentation

- [ ] 7.1 Archive change with `openspec archive section-items-by-id` after implementation merges spec deltas into `openspec/specs/`
