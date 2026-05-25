## 1. Section navigation config and routing

- [x] 1.1 Add `apps/web/src/components/cv/cv-section-nav.ts` exporting `CV_SECTIONS`, `CvSectionSlug` type, slug allowlist, `getSectionHref(cvId, slug)`, and `resolveSectionFromSlug(slug | undefined)` defaulting to `basics`
- [x] 1.2 Add `apps/web/src/app/dashboard/cv/[id]/[section]/page.tsx` passing validated `section` to the edit client; invalid slugs redirect to `/dashboard/cv/[id]` or call `notFound()`
- [x] 1.3 Update `edit-cv-page-client.tsx` to accept optional `section` prop and pass it to `CvEditor` / `CvSections`

## 2. UI primitives

- [x] 2.1 Add shadcn `Sheet` component at `apps/web/src/components/ui/sheet.tsx` (if not present) for mobile left drawer

## 3. Navigation shell and layout

- [x] 3.1 Add `apps/web/src/components/cv/cv-section-nav.tsx` with vertical `Link` list, active state via `usePathname()`, and `aria-current="page"` on active item
- [x] 3.2 Add `apps/web/src/components/cv/cv-section-layout.tsx` combining desktop sidebar (`hidden md:flex`), mobile **Sections** trigger + left `Sheet`, and scrollable main content area
- [x] 3.3 Refactor `cv-sections.tsx`: remove Radix `Tabs`/`TabsList`/`TabsTrigger`; wrap content in `CvSectionLayout`; render one section body based on `activeSection` prop

## 4. Tests

- [x] 4.1 Add colocated `cv-section-nav.test.ts` covering slug allowlist, href generation, invalid slug resolution, and basics default
- [x] 4.2 Add colocated tests for active-link logic or layout behavior where practical (e.g. `cv-section-nav.test.tsx` with Testing Library if component tests add value)
- [x] 4.3 Run `pnpm --filter web test -- --run` for new and affected tests

## 5. Verification

- [x] 5.1 Manually verify desktop/tablet: left sidebar visible, section content on right, active item highlighted
- [x] 5.2 Manually verify mobile: sidebar hidden, drawer opens from menu, selection closes drawer and shows content
- [x] 5.3 Manually verify URL persistence: `/dashboard/cv/[id]` → Basics; `/dashboard/cv/[id]/work` → Work; reload keeps section; invalid slug handled safely
