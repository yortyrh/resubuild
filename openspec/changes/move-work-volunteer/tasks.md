## 1. Field mapping utilities

- [ ] 1.1 Add `mapWorkToVolunteer` and `mapVolunteerToWork` in `apps/web/src/lib/work-volunteer-move.ts` with mapping rules from `design.md`
- [ ] 1.2 Colocated Vitest in `apps/web/src/lib/work-volunteer-move.test.ts` covering shared fields, organization/name mapping, and omission of work-only fields

## 2. Move orchestration

- [ ] 2.1 Add `moveWorkVolunteerEntry` async helper (or hook) in `apps/web/src/lib/` that POSTs target create, DELETEs source on success, invalidates both section query keys, and surfaces errors per spec
- [ ] 2.2 Colocated tests mocking `cvWorkApi` / `cvVolunteerApi` for success, create failure (no delete), and payload shape

## 3. Row UI and confirmation

- [ ] 3.1 Extend `ResumeItemRow` in `apps/web/src/components/cv/cv-item-ui.tsx` with optional `secondaryAction` button in the action bar
- [ ] 3.2 Add `MoveItemDialog` (or reuse dialog pattern) for cross-section confirmation copy
- [ ] 3.3 Extend `ManagedArraySection` with optional per-row secondary action config (disabled while `saving`)

## 4. Section wiring

- [ ] 4.1 Wire **Move to Volunteer** in `apps/web/src/components/cv/sections/work-section.tsx` with confirm → orchestration → update local `work` list and invalidate volunteer cache
- [ ] 4.2 Wire **Move to Work** in `apps/web/src/components/cv/sections/volunteer-section.tsx` symmetrically
- [ ] 4.3 Success toast; disable move during edit/create/delete in the same section

## 5. Integration tests

- [ ] 5.1 Colocated component or section tests asserting move buttons render on saved rows, hidden on create draft, and confirmation gates API calls

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, work/volunteer item create/update/delete routes, media, export, import, template presentation

### Update required

- None

### Add

- None — UI-only change reusing existing work and volunteer item CRUD endpoints; no new API contract
