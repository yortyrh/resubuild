## 0. Prerequisite

- [x] 0.1 Confirm `normalize-cv-database` is merged: `sort` columns on five non-date tables, auto-assignment on create, reorder API endpoints live
- [x] 0.2 Confirm section item API responses include stable row `id`

## 1. Web — dependencies and API client

- [x] 1.1 Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to `apps/web/package.json`
- [x] 1.2 Add `reorderCvSection(cvId, section, order, version)` in `apps/web/src/lib/cv-item-api.ts` calling existing reorder endpoints
- [x] 1.3 Extend local item types/state to retain row `id` for the five reorderable sections

## 2. Web — sortable UI component

- [x] 2.1 Create `SortableManagedArraySection` (or extend `ManagedArraySection`) in `apps/web/src/components/cv/` with dnd-kit sortable context
- [x] 2.2 Add drag handle on `ResumeItemRow` in view mode; disable while editing/creating
- [x] 2.3 Add move-up / move-down buttons with accessible labels
- [x] 2.4 On reorder: call `reorderCvSection`, update items + version via `useCvItemMutation`; handle 409 reload

## 3. Web — wire sections

- [x] 3.1 Enable sortable section for Social profiles in `cv-sections.tsx`
- [x] 3.2 Enable sortable section for Skills
- [x] 3.3 Enable sortable section for Languages
- [x] 3.4 Enable sortable section for Interests
- [x] 3.5 Enable sortable section for References
- [x] 3.6 Component tests for sortable list behavior in `sortable-managed-array-section.test.tsx`

## 4. Verification

- [x] 4.1 Manual QA: drag reorder in each of the five sections; verify export/preview order
- [x] 4.2 Manual QA: keyboard move-up/down; verify disabled at boundaries
- [x] 4.3 Run `pnpm test -- --run` for web component tests

## E2E test impact

- **No new API e2e tests** — reorder API coverage lives in `normalize-cv-database`.
- **Optional**: Playwright/Cypress UI test for drag reorder if project adds browser e2e later.
- **Must pass unchanged**: CRUD flows for all sections; auth 401; delete confirmation UX.

## 5. Documentation

- [x] 5.1 Archive change updating main specs: `cv-section-reorder` (new), delta to `cv-editor-ui`
