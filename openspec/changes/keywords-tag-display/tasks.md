## 1. Shared tag components

- [x] 1.1 Extract shared tag pill class names from `apps/web/src/components/cv/tags-input.tsx` (export constant or small helper)
- [x] 1.2 Add `apps/web/src/components/cv/tags-list.tsx` with read-only `TagsList` component (`values`, optional `className`) using `flex flex-wrap gap-2` layout and pill styling without remove buttons

## 2. Wire keyword view rendering

- [x] 2.1 Replace Skills `renderView` keyword body in `apps/web/src/components/cv/cv-sections.tsx` with `<TagsList values={item.keywords ?? []} />`
- [x] 2.2 Replace Interests `renderView` keyword body with `<TagsList />`
- [x] 2.3 Replace Projects `renderView` keyword line (remove comma-separated `Keywords:` prefix) with `<TagsList />`

## 3. Tests

- [x] 3.1 Add `apps/web/src/components/cv/tags-list.test.tsx` asserting each value renders as a pill span and comma-joined text is absent
- [x] 3.2 Update `apps/web/src/components/cv/cv-sections-field-coverage.test.tsx` (or focused section test) to assert Skills/Interests/Projects view rows render keyword tags

## 4. Verification

- [x] 4.1 Run `pnpm --filter @resumind/web test -- --run` and fix any failures
- [x] 4.2 Manual smoke test: view Skills, Interests, and Projects tabs with keywords; confirm pills match edit-mode styling without delete icons
