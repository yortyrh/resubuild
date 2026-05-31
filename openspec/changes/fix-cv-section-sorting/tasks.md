## 1. Shared sort helpers (`packages/types`)

- [ ] 1.1 Update `sortWorkRows` in `packages/types/src/resume-normalized.ts` to sort by `end_date DESC NULLS FIRST`, then `start_date DESC`, then `id ASC`
- [ ] 1.2 Confirm `sortVolunteerRows`, `sortEducationRows`, and `sortProjectRows` inherit the updated work comparator
- [ ] 1.3 Add or update colocated unit tests in `packages/types/src/resume-normalized.test.ts` covering ongoing-first ordering, end-date ordering, and tiebreakers

## 2. API list and assembly

- [ ] 2.1 Align Supabase list queries in `apps/api/src/cv/cv-normalized.repository.ts` with `end_date DESC NULLS FIRST` for work/volunteer/education/project (if query order differs from post-fetch `sortSectionRows`)
- [ ] 2.2 Update `apps/api/src/cv/cv-normalized.repository.spec.ts` fixtures and assertions for new order
- [ ] 2.3 Update any other API unit tests that assert start-date-primary work order (`cv-item.service.spec.ts`, etc.)

## 3. Date display helper (`apps/web`)

- [ ] 3.1 Update `formatDateRange` in `apps/web/src/components/cv/cv-section-helpers.tsx` to render `{start} – Current` when `endDate` is absent and `startDate` is set
- [ ] 3.2 Add colocated tests in `apps/web/src/components/cv/cv-section-helpers.test.tsx` (create if missing) for Current label and completed ranges

## 4. Required date validation (`apps/web`)

- [ ] 4.1 Add optional `required` and error display to `apps/web/src/components/cv/iso-date-field.tsx`
- [ ] 4.2 Extend `ManagedArraySection` in `apps/web/src/components/cv/managed-array-section.tsx` with an optional `validateBeforeSave` callback; block API calls and show errors when validation fails
- [ ] 4.3 Wire required `startDate` validation on create/edit for `work-section.tsx`, `volunteer-section.tsx`, `education-section.tsx`, `projects-section.tsx`
- [ ] 4.4 Wire required date on create for `awards-section.tsx`, `certificates-section.tsx`, `publications-section.tsx`
- [ ] 4.5 Add or update section tests (e.g. `cv-sections-field-coverage.test.tsx`) for validation blocking save

## 5. Client re-sort on date change (`apps/web`)

- [ ] 5.1 Import `sortSectionRows` (or section helpers) from `@resumind/types` in date-primary section components or a shared hook
- [ ] 5.2 On date field `onChange` during create/edit, re-sort the section array in editor state while preserving `editingId` / draft by row `id`
- [ ] 5.3 After successful update in `managed-array-section.tsx`, merge by id then re-sort (not merge-only order)
- [ ] 5.4 Add unit tests in `apps/web/src/lib/cv-section-order.test.ts` or section tests verifying sort-after-merge behavior

## 6. Verification

- [ ] 6.1 Run `pnpm test --filter @resumind/types -- --run` and fix failures
- [ ] 6.2 Run `pnpm test --filter web -- --run` and `pnpm test --filter api -- --run` for touched packages
- [ ] 6.3 Manually verify Work section: ongoing entry first, `– Current` label, re-sort when editing dates, save blocked without start date

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth: login fixture user; `/auth/me` with Bearer; 401 without token
- `local-supabase.e2e-spec.ts` — CV list/get seeded CVs; profile photo assignment; invalid POST returns 400; skills reorder
- `local-supabase.e2e-spec.ts` — media: public GET stream; owner meta; authenticated upload; 401 without token
- `local-supabase.e2e-spec.ts` — export: template catalog; HTML and JSON export for seeded CV
- `local-supabase.e2e-spec.ts` — template presentation: GET defaults; PATCH hidden sections round-trip
- `local-supabase.e2e-spec.ts` — lifecycle: PATCH template + basics; DELETE ephemeral CV
- `local-supabase.e2e-spec.ts` — sections: GET basics/education/languages on seeded CV; work delete by row id
- `local-supabase.e2e-spec.ts` — AI agent catalog; import LLM config; import URL validation (400 on invalid URL)

### Update required

- `local-supabase.e2e-spec.ts` — **CV REST → patches work by row id after a newer entry changes list order**: update create payloads and list assertions to use `endDate` (or omit for ongoing) instead of `startDate`-only ordering; assert ongoing/no-`endDate` entry lists first; confirm patch-by-id still works after order change

### Add

- None (ordering behavior covered by updating the existing work list-order scenario)
