## 1. Extract shared row display primitives

- [x] 1.1 Create `apps/web/src/components/applications/application-row-display.tsx`
      exporting `StatusBadge`, `UpdatingIndicator`,
      `ApplicationActionsMenu`, `actionLabel`, and `menuTriggerLabel`
      so the table cell and the mobile card render the same status
      pill and the same three-dots menu.
- [x] 1.2 Refactor
      `apps/web/src/components/applications/application-data-table-columns.tsx`
      to import the shared primitives and remove the duplicated
      helpers.

## 2. Add the mobile card layout

- [x] 2.1 Create `apps/web/src/components/applications/application-row-card.tsx`
      rendering a `surface-soft text-card-foreground p-4` card with
      the Company (primary link), Position (subtitle link),
      three-dots menu, status badge (or `Updating…` indicator), and
      the `Update` outline button in a `divider-soft border-t pt-3`
      footer row.
- [x] 2.2 Add `apps/web/src/components/applications/application-row-card.test.tsx`
      covering: card chrome (`surface-soft`, no bare border /
      rounded-lg), company/position fallback strings, updating state,
      `onUpdate` invocation, and the shared 3-dots menu items.

## 3. Extend `DataTable` with an optional `renderCard` slot

- [x] 3.1 Add `renderCard?: (row: TData) => ReactNode` and
      `getRowKey?: (row, index) => string` props to
      `apps/web/src/components/applications/application-data-table.tsx`.
      Wrap the table in `hidden md:block` and render the cards in a
      `md:hidden` stacked list. Mark the table wrapper with
      `data-testid="applications-data-table"` so tests can scope
      queries to the desktop view.

## 4. Wire the card into the Applications list

- [x] 4.1 In
      `apps/web/src/components/applications/application-list.tsx`,
      memoise a shared `ApplicationRowActions` object and pass
      `renderCard={(row) => <ApplicationRowCard row={row} actions={actions} />}`
      plus `getRowKey={(row) => row.id}` to the `DataTable`.
- [x] 4.2 Switch the desktop actions cell in
      `application-data-table-columns.tsx` from `flex flex-wrap` to
      `flex flex-nowrap` and add `shrink-0` to the `Update` button
      so the button and three-dots menu never wrap to a second line.

## 5. Add a matching card skeleton

- [x] 5.1 Add `ApplicationCardSkeleton` to
      `apps/web/src/components/applications/application-list-skeleton.tsx`
      and render it in a `md:hidden` block beneath the existing
      table skeleton, keeping the order (table skeleton first) so
      the existing "three placeholder rows inside the surface-soft
      data table" test continues to find the table surface first.

## 6. Update tests

- [x] 6.1 Scope
      `apps/web/src/components/applications/application-list.test.tsx`
      desktop-table queries via
      `await screen.findByTestId('applications-data-table')` +
      `within(tableRegion).getByRole('table')` so the table
      assertions do not collide with the card view's links /
      buttons.
- [x] 6.2 Add a coverage test that asserts
      `application-row-card` exists in the rendered DOM and
      contains the company link, status, and 3-dots menu trigger.
- [x] 6.3 Add a coverage test in
      `apps/web/src/components/applications/application-list-skeleton.test.tsx`
      asserting the new card skeleton renders three
      `surface-soft` placeholders inside the `md:hidden` block.

## 7. Document the change

- [x] 7.1 Update `apps/web/DESIGN.md` to document the mobile card
      layout (`surface-soft p-4`, top row Company + Position + 3-dots
      menu, footer row status + Update button), the shared
      `application-row-display.tsx` module, the
      `application-row-card.tsx` file, and the updated desktop
      actions cell (single line).

## 8. Verify

- [x] 8.1 Run `pnpm --filter @resubuild/web test` to confirm all 669
      web tests pass, including the 7 new
      `application-row-card.test.tsx` tests, the 3
      `application-list-skeleton.test.tsx` tests, and the updated
      `application-list.test.tsx` and
      `application-data-table-columns.test.tsx` suites.
- [x] 8.2 Run `pnpm --filter @resubuild/web typecheck`,
      `pnpm lint` (Biome), and `pnpm prettier --check` to confirm
      the changes compile and respect the project's lint and format
      rules.

## E2E test impact

None — UI-only change that activates under the `md` Tailwind
breakpoint and the desktop actions-cell flex rules. The E2E specs in
`openspec/specs/e2e-testing/spec.md` run against a real browser via
Playwright-supertest; they do not exercise the Applications data
grid's responsive layout (the existing Playwright specs cover the
list API contract, the row actions, and the delete/update dialogs,
none of which are affected by the new card view or the
`flex-nowrap` actions cell). No E2E updates required.
