## 1. Shared types — payload sanitization and title helpers

- [x] 1.1 Add `sanitizeResumeItemPayload` in `packages/types/src/resume-item-payload.ts` with colocated tests
- [x] 1.2 Export helper from `packages/types/src/index.ts`
- [x] 1.3 Add `deriveCvShortTitleFromBasics` in `packages/types/src/cv-title.ts` with tests

## 2. API — sanitize array item mutations

- [x] 2.1 Apply `sanitizeResumeItemPayload` in `apps/api/src/cv/cv-item.service.ts` on create and update
- [x] 2.2 Add Jest coverage for empty `url` stripping in `cv-item.service.spec.ts`

## 3. UI primitives and global styling

- [x] 3.1 Add shadcn `Skeleton` at `apps/web/src/components/ui/skeleton.tsx`
- [x] 3.2 Add shadcn `Breadcrumb` at `apps/web/src/components/ui/breadcrumb.tsx`
- [x] 3.3 Add `surface-soft`, `divider-soft`, and `chrome-divider` utilities plus Wysimark/markdown link CSS in `apps/web/src/app/globals.css`
- [x] 3.4 Update dashboard layout header/main spacing in `apps/web/src/app/dashboard/layout.tsx`

## 4. Loading skeletons

- [x] 4.1 Add `DashboardShellSkeleton` and wire into `session-gate.tsx`
- [x] 4.2 Add `CvListSkeleton` and wire into `cv-list.tsx`
- [x] 4.3 Add `CvEditorSkeleton` and wire into `edit-cv-page-client.tsx`
- [x] 4.4 Add `MarkdownEditorSkeleton` and split inline/block dynamic imports in `markdown-editor.tsx`

## 5. Section navigation refactor

- [x] 5.1 Add `cv-section-icons.tsx` with icon map and tests
- [x] 5.2 Extend `cv-section-nav.ts` with `getSectionLabel` and `resolveActiveSectionFromPathname`
- [x] 5.3 Refactor `cv-section-layout.tsx` to collapsible icon sidebar (remove mobile Sheet)
- [x] 5.4 Update `cv-section-nav-links.tsx` for icons, nav states, and comfortable density
- [x] 5.5 Add `cv-section-layout.test.tsx`

## 6. Editor chrome and preview layout

- [x] 6.1 Add `CvEditorBreadcrumb` with tests; integrate in `cv-sections.tsx`
- [x] 6.2 Remove duplicate headings from `edit-cv-page-client.tsx` and `cv-editor.tsx`
- [x] 6.3 Add `metadata-field.tsx` with tests
- [x] 6.4 Refactor `cv-sections.tsx`: title/subtitle entity view, labeled metadata, titled highlights/courses
- [x] 6.5 Update `external-link.tsx` styling, icon, and `linkedEntitySubtitle` with component tests
- [x] 6.6 Update `tags-list.tsx` / `tags-input.tsx` for labels, role variant, and Enter-to-submit behavior
- [x] 6.7 Restyle `cv-item-ui.tsx` rows/forms with `surface-soft` and native form submit
- [x] 6.8 Apply client-side sanitization in `managed-array-section.tsx`

## 7. Form keyboard UX

- [x] 7.1 Wrap `create-cv-form.tsx` in `<form>`; add Enter-to-save test
- [x] 7.2 Add Enter-to-add-row behavior in `form-fields.tsx` `StringListField` with tests

## 8. Markdown editor polish

- [x] 8.1 Add `slate` and `slate-react` to `apps/web/package.json`
- [x] 8.2 Implement focus retry and smaller dimensions in `markdown-editor-impl.tsx`

## 9. Dashboard CV list

- [x] 9.1 Replace `window.confirm` delete with `DeleteItemDialog` in `cv-list.tsx`
- [x] 9.2 Match list cards to resume-item `surface-soft` styling

## 10. API client robustness

- [x] 10.1 Handle HTTP 205 and empty response bodies in `apps/web/src/lib/api.ts`

## 11. Tests and verification

- [x] 11.1 Update `cv-sections-field-coverage.test.tsx` and `cv-sections-highlight.test.tsx` for new layout
- [x] 11.2 Update `managed-basics-section.test.tsx`, `tags-list.test.tsx`, and related colocated tests
- [x] 11.3 Run `pnpm --filter web test -- --run`, `pnpm --filter @resumind/types test -- --run`, and `pnpm --filter api test -- --run`
