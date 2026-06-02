## 1. Field mapping utilities

- [x] 1.1 Add `mapWorkToVolunteer` and `mapVolunteerToWork` in `apps/web/src/lib/work-volunteer-move.ts` with mapping rules from `design.md` (including hidden `location`/`description` on volunteer)
- [x] 1.2 Colocated Vitest in `apps/web/src/lib/work-volunteer-move.test.ts` covering shared fields, organization/name mapping, hidden storage on work→volunteer, and restoration on volunteer→work

## 1b. Hidden volunteer storage (API / types)

- [x] 1b.1 Migration: add nullable `location` and `description` to `cv_volunteer`
- [x] 1b.2 Extend `CvVolunteerRow`, item service, and `rowToVolunteer` so hidden fields persist but are excluded from JSON Resume export and volunteer editor forms

## 2. Move orchestration

- [x] 2.1 Add `moveWorkVolunteerEntry` async helper (or hook) in `apps/web/src/lib/` that POSTs target create, DELETEs source on success, invalidates both section query keys, and surfaces errors per spec
- [x] 2.2 Colocated tests mocking `cvWorkApi` / `cvVolunteerApi` for success, create failure (no delete), and payload shape

## 3. Row UI and confirmation

- [x] 3.1 Extend `ResumeItemRow` in `apps/web/src/components/cv/cv-item-ui.tsx` with optional `secondaryAction` button in the action bar
- [x] 3.2 Add `MoveItemDialog` (or reuse dialog pattern) for cross-section confirmation copy
- [x] 3.3 Extend `ManagedArraySection` with optional per-row secondary action config (disabled while `saving`)

## 4. Section wiring

- [x] 4.1 Wire **Move to Volunteer** in `apps/web/src/components/cv/sections/work-section.tsx` with confirm → orchestration → update local `work` list and invalidate volunteer cache
- [x] 4.2 Wire **Move to Work** in `apps/web/src/components/cv/sections/volunteer-section.tsx` symmetrically
- [x] 4.3 Success toast; disable move during edit/create/delete in the same section

## 5. Integration tests

- [x] 5.1 Colocated component or section tests asserting move buttons render on saved rows, hidden on create draft, and confirmation gates API calls

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, work/volunteer item create/update/delete routes, media, export, import, template presentation

### Update required

- None for E2E routes; hidden volunteer columns are additive and excluded from export assertions

### Add

- Unit tests for round-trip hidden field storage and export omission
