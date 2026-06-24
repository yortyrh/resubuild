## Why

This change **retroactively documents work already implemented** in the
working tree. The Applications data grid on `/dashboard/applications`
was previously an HTML table that only adapted to small viewports by
horizontally scrolling its `<table>` — at 375px the Company, Position,
Status, and Actions columns overflowed, the actions cell wrapped the
Update button and 3-dots menu onto two stacked lines, and the
table-wide horizontal scrollbar appeared. The `responsive-mobile-ui`
spec already requires the Applications page to render without
horizontal overflow at 375px, so the prior behaviour was a spec gap in
the implementation.

## What Changes

- Add a stacked `surface-soft` **card** layout for each application row
  on viewports below the `md` breakpoint. Each card shows the Company
  (primary link), Position (subtitle link), the status badge or
  `Updating…` indicator, the `Update` outline button, and the same
  three-dots actions menu (Export CV as PDF, Export cover letter as
  PDF, Preview CV, Delete) used in the table row.
- Keep the existing four-column table at `md+`. The card is an
  additional view of the same `data`; both share the same `actions`
  wiring (callbacks + `exportingCvPdfFor` / `exportingLetterPdfFor`
  state).
- Extract the row's display primitives — `StatusBadge`,
  `UpdatingIndicator`, and the three-dots `ApplicationActionsMenu` —
  into a shared `application-row-display.tsx` module so the table cell
  and the card render the same status pill and the same menu with
  identical disabled/in-flight behaviour.
- Extend the generic `DataTable<TData, TValue>` component with an
  optional `renderCard?: (row: TData) => ReactNode` slot. When
  provided, the table is wrapped in `hidden md:block` and the cards
  are rendered in a `md:hidden` stacked list with the same empty
  state.
- Add a matching `ApplicationCardSkeleton` to the
  `ApplicationListSkeleton` so the loading state is consistent below
  `md`.
- Switch the desktop actions cell from `flex flex-wrap` to
  `flex flex-nowrap` and add `shrink-0` to the Update button so the
  Update button and 3-dots menu never wrap onto separate lines when
  the Company/Position columns consume their `max-w` budget.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `responsive-mobile-ui`: add a requirement that the Applications data
  grid SHALL switch from the four-column table to a stacked
  `surface-soft` card list below the `md` breakpoint, with the card
  re-using the same status pill and the same row actions menu as the
  table cell. The four-column table SHALL remain the view at `md+`.
  Also tighten the desktop actions cell so the Update button and
  3-dots menu stay on a single line (no wrap to a second row).

## Impact

- `apps/web/src/components/applications/application-row-display.tsx`
  (new) — shared `StatusBadge`, `UpdatingIndicator`,
  `ApplicationActionsMenu`, `actionLabel`, `menuTriggerLabel`.
- `apps/web/src/components/applications/application-row-card.tsx`
  (new) — mobile card.
- `apps/web/src/components/applications/application-row-card.test.tsx`
  (new) — 7 unit tests for the card.
- `apps/web/src/components/applications/application-data-table.tsx` —
  add optional `renderCard` + `getRowKey` props; render the table in
  `hidden md:block` and the cards in `md:hidden`.
- `apps/web/src/components/applications/application-data-table-columns.tsx`
  — use the shared display module; switch the actions cell to
  `flex-nowrap` + `shrink-0`.
- `apps/web/src/components/applications/application-list.tsx` —
  memoise the shared `actions` object and pass `renderCard` to the
  `DataTable`.
- `apps/web/src/components/applications/application-list-skeleton.tsx`
  — add a `surface-soft` card skeleton for the mobile loading state.
- `apps/web/src/components/applications/application-list.test.tsx` —
  scope desktop-table queries via the new `data-testid`; add a card
  coverage test.
- `apps/web/src/components/applications/application-list-skeleton.test.tsx`
  — cover the new card skeleton.
- `apps/web/DESIGN.md` — document the mobile card layout, link the
  new files, and align with the updated table actions cell.

No backend, Nest API, schema, auth, design-token, or `globals.css`
changes. **No breaking** API change. **No breaking** UI change on
desktop — the desktop table layout and column order are preserved.
