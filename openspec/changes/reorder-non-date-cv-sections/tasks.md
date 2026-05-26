## 0. Prerequisite

- [ ] 0.1 Confirm `normalize-cv-database` is merged: normalized section tables exist with `sort` column and row uuid primary keys
- [ ] 0.2 Confirm section item API responses include stable row `id` (coordinate with normalization tasks if missing)

## 1. API — reorder endpoints

- [ ] 1.1 Add `ReorderSectionDto` in `apps/api/src/cv/dto/` with `order: string[]` (uuid) and optional `version`
- [ ] 1.2 Implement `CvItemService.reorderSection(user, cvId, section, order, version)` updating `sort` in transaction and bumping `cv.meta_version`
- [ ] 1.3 Add `PUT` routes in `cv-items.controller.ts` for `profiles`, `skills`, `languages`, `interests`, `references` reorder
- [ ] 1.4 Validate permutation (exact set of row ids for cvId + section); return 400 on mismatch, 409 on stale version
- [ ] 1.5 Return `{ items, version }` with entities in new order including `id` and index

## 2. API tests

- [ ] 2.1 Unit tests for reorder validation (missing id, foreign id, stale version) in `apps/api/src/cv/cv-item.service.test.ts` (or colocated)
- [ ] 2.2 E2e tests: create 3 skills, reorder, assert GET order and indices in `apps/api/test/`

## 3. Web — dependencies and API client

- [ ] 3.1 Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to `apps/web/package.json`
- [ ] 3.2 Add `reorderCvSection(cvId, section, order, version)` in `apps/web/src/lib/cv-item-api.ts`
- [ ] 3.3 Extend local item types/state to retain row `id` for the five reorderable sections

## 4. Web — sortable UI component

- [ ] 4.1 Create `SortableManagedArraySection` (or extend `ManagedArraySection`) in `apps/web/src/components/cv/` with dnd-kit sortable context
- [ ] 4.2 Add drag handle on `ResumeItemRow` in view mode; disable while editing/creating
- [ ] 4.3 Add move-up / move-down buttons with accessible labels
- [ ] 4.4 On reorder: call API, update items + version via `useCvItemMutation`; handle 409 reload

## 5. Web — wire sections

- [ ] 5.1 Enable sortable section for Social profiles in `cv-sections.tsx`
- [ ] 5.2 Enable sortable section for Skills
- [ ] 5.3 Enable sortable section for Languages
- [ ] 5.4 Enable sortable section for Interests
- [ ] 5.5 Enable sortable section for References
- [ ] 5.6 Component tests for sortable list behavior in `sortable-managed-array-section.test.tsx`

## 6. Verification

- [ ] 6.1 Manual QA: drag reorder in each of the five sections; verify export/preview order
- [ ] 6.2 Manual QA: keyboard move-up/down; verify disabled at boundaries
- [ ] 6.3 Run `pnpm test -- --run` and relevant e2e with Supabase

## E2E test impact

- **Add**: Reorder skills (or languages) e2e — create 3 items, reorder via API, assert order in GET and assembled CV.
- **Update required**: Item create/list tests should assert `id` field present when normalization ships.
- **Must pass unchanged**: CRUD flows for non-reorderable sections; auth 401; delete confirmation UX.

## 7. Documentation

- [ ] 7.1 Note dependency on `normalize-cv-database` in change proposal (done) and README if API docs exist
- [ ] 7.2 Archive change updating main specs: `cv-section-reorder` (new), deltas to `cv-rest-api`, `cv-item-crud`, `cv-editor-ui`
