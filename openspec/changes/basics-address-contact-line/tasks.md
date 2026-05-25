## 1. Row component support

- [x] 1.1 Add an optional `actionsPlacement` (or equivalent) prop to `ResumeItemRow` in `apps/web/src/components/cv/cv-item-ui.tsx` to render Edit in the header top-right instead of the bottom bar
- [x] 1.2 Ensure default placement remains bottom for all non-Basics consumers

## 2. Basics view layout

- [x] 2.1 In `apps/web/src/components/cv/managed-basics-section.tsx`, build the contact line from `[email, phone, url, formatBasicsLocation(basics), basics.location?.address]` joined with `•` (filter empty segments)
- [x] 2.2 Remove location/address from the `meta` prop in Basics view mode
- [x] 2.3 Pass header placement for Edit on the Basics `ResumeItemRow` so the button sits top-right beside the name

## 3. Verification

- [x] 3.1 Manually verify Basics view: location and optional street address appear under the name on the same line as email, phone, and website
- [x] 3.2 Manually verify Basics view: Edit appears top-right and not at the bottom of the row
- [x] 3.3 Run web lint/typecheck/tests if a colocated test exists for Basics preview; otherwise confirm no regressions via `pnpm --filter web typecheck`
