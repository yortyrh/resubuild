## 1. Row component and shared helpers

- [ ] 1.1 Add optional `subtitle` prop to `ResumeItemRow` in `apps/web/src/components/cv/cv-item-ui.tsx` (muted text below title)
- [ ] 1.2 Extend `ManagedArraySection` `renderView` return type and wire `subtitle` through to `ResumeItemRow` in `apps/web/src/components/cv/managed-array-section.tsx`
- [ ] 1.3 Add `linkedEntityLabel(label, url)` helper (or equivalent) reusing `ExternalLink` with title-appropriate link styling in `apps/web/src/components/cv/external-link.tsx` or `cv-sections.tsx`

## 2. Section view layout updates

- [ ] 2.1 **Work**: link company name in title; remove URL from meta and body in `cv-sections.tsx`
- [ ] 2.2 **Volunteer**: link organization in title; remove URL from meta and body
- [ ] 2.3 **Education**: link institution in title; move study type/area to subtitle; remove URL from meta; keep score in meta
- [ ] 2.4 **Projects**: link name in title; move entity/type to body before roles; remove URL from meta and body; keep dates in meta only
- [ ] 2.5 **Awards**: move awarder to subtitle; keep date in meta
- [ ] 2.6 **Certificates**: link name in title; remove raw URL from body
- [ ] 2.7 **Publications**: link name in title; remove standalone URL link from body
- [ ] 2.8 **Languages**: move fluency to subtitle; remove fluency from meta

## 3. Tests and verification

- [ ] 3.1 Update or add colocated Vitest tests (e.g. `cv-sections-field-coverage.test.tsx`) asserting linked titles, subtitle placement, and absence of raw URL strings in meta/body for affected sections
- [ ] 3.2 Run `pnpm --filter web test -- --run` and fix any regressions
