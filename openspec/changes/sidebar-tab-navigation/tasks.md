## 1. Section navigation config and routing

- [ ] 1.1 Add `apps/web/src/components/cv/cv-section-nav.ts` exporting `CV_SECTIONS`, `CvSectionSlug` type, slug allowlist, `getSectionHref(cvId, slug)`, and `resolveSectionFromSlug(slug | undefined)` defaulting to `basics`
- [ ] 1.2 Add `apps/web/src/app/dashboard/cv/[id]/[section]/page.tsx` passing validated `section` to the edit client; invalid slugs redirect to `/dashboard/cv/[id]` or call `notFound()`
- [ ] 1.3 Update `edit-cv-page-client.tsx` to accept optional `section` prop and pass it to `CvEditor` / `CvSections`

## 2. UI primitives

- [ ] 2.1 Add shadcn `Sheet` component at `apps/web/src/components/ui/sheet.tsx` (if not present) for mobile left drawer

## 3. Navigation shell and layout

- [ ] 3.1 Add `apps/web/src/components/cv/cv-section-nav.tsx` with vertical `Link` list, active state via `usePathname()`, and `aria-current="page"` on active item
- [ ] 3.2 Add `apps/web/src/components/cv/cv-section-layout.tsx` combining desktop sidebar (`hidden md:flex`), mobile **Sections** trigger + left `Sheet`, and scrollable main content area
- [ ] 3.3 Refactor `cv-sections.tsx`: remove Radix `Tabs`/`TabsList`/`TabsTrigger`; wrap content in `CvSectionLayout`; render one section body based on `activeSection` prop

## 4. Tests

- [ ] 4.1 Add colocated `cv-section-nav.test.ts` covering slug allowlist, href generation, invalid slug resolution, and basics default
- [ ] 4.2 Add colocated tests for active-link logic or layout behavior where practical (e.g. `cv-section-nav.test.tsx` with Testing Library if component tests add value)
- [ ] 4.3 Run `pnpm --filter web test -- --run` for new and affected tests

## 5. Verification

- [ ] 5.1 Manually verify desktop/tablet: left sidebar visible, section content on right, active item highlighted
- [ ] 5.2 Manually verify mobile: sidebar hidden, drawer opens from menu, selection closes drawer and shows content
- [ ] 5.3 Manually verify URL persistence: `/dashboard/cv/[id]` → Basics; `/dashboard/cv/[id]/work` → Work; reload keeps section; invalid slug handled safely
