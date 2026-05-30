## 1. Header contact row alignment

- [x] 1.1 Derive `centeredContactRow` for `centered` and `design` header styles in `renderBasicsHeader`
- [x] 1.2 Apply `justify-center` to contact row flex classes when centered/design
- [x] 1.3 Apply the same horizontal justification to the profile row for centered/design headers

## 2. Tabular profile layout

- [x] 2.1 Replace tabular stacked profile block (`space-y-1` / `<br />`) with inline flex row (`justify-end`, `gap-x-3`)
- [x] 2.2 Keep tabular contact fields stacked with `<br />` in the right column

## 3. Tests

- [x] 3.1 Assert `justify-center` on centered header contact output
- [x] 3.2 Add test for design header centering (`text-center`, `justify-center`)
- [x] 3.3 Add test confirming left header omits `justify-center`
- [x] 3.4 Update tabular test: contact lines stacked, profiles inline without `<br />` in profile row

## 4. Verification

- [x] 4.1 Run `pnpm --filter @resumind/resume-template test -- --run render-basics-header`

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — CV REST list/get, profile photo, section CRUD, and export routes (no API contract change)
- Auth and dashboard navigation scenarios

### Update required

- None — HTML rendering alignment only; no API or persistence shape changes

### Add

- None — layout behavior covered by colocated unit tests in `render-basics-header.test.ts`
