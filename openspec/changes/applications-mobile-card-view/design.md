## Context

The Applications data grid at `/dashboard/applications` was implemented
as a `useReactTable` + shadcn `Table` pair that relied on the
primitive's `relative w-full overflow-auto` wrapper to handle small
viewports. The result was an HTML table that horizontally scrolled on
phones instead of reflowing. At 375px the Company (`max-w-[16rem]`) and
Position (`max-w-[20rem]`) cells consumed the available width, the
actions cell shrank, and the `flex flex-wrap` actions container
wrapped the Update button above the 3-dots menu — a broken mobile
layout that contradicted the existing `responsive-mobile-ui` "no
horizontal overflow at 375px" requirement.

The Applications page already follows a card pattern for related
surfaces (`/dashboard` CV list) and shares `surface-soft text-card-foreground`
chrome with workspace panels per `apps/web/DESIGN.md`.

## Goals / Non-Goals

**Goals:**

- Render the Applications data grid as a stacked list of
  `surface-soft` cards below the `md` breakpoint, with the desktop
  four-column table preserved at `md+`.
- Keep the same row data, the same `actions` callbacks, and the same
  status / in-flight semantics in both views.
- Share `StatusBadge`, `UpdatingIndicator`, and the three-dots
  `ApplicationActionsMenu` between the table cell and the card so the
  two views cannot drift.
- Keep the actions cell on a single line at any width on desktop
  (`flex-nowrap` + `shrink-0`).
- Add a matching card skeleton so the loading state is consistent.

**Non-Goals:**

- Rewriting the data table primitive or migrating to a different
  table library.
- Adding sort, filter, pagination, column visibility, or row selection
  to the data table.
- Changing the desktop four-column table layout, column order, or
  column semantics.
- Touching the API, schema, auth, design tokens, or `globals.css`.

## Decisions

### 1. Card list on mobile, table on desktop — CSS-only switch

The card list and the table both render to the same `data` and read
the same `actions` object, so there is no need for a JS media query.
Tailwind's `hidden md:block` (table) and `md:hidden` (card list)
provide a single source of truth at the `md` breakpoint (768px),
matching the dashboard's `md:grid md:grid-cols-[auto_1fr]` switch
in `apps/web/src/app/dashboard/layout.tsx`.

Alternatives considered:

- **`useMediaQuery` + conditional render**: rejected. It would
  re-introduce the hydration mismatch that `useIsMobile`
  (`apps/web/src/lib/use-is-mobile.ts`) already documents, and CSS-only
  switching is what the rest of the dashboard uses.
- **A single responsive component with no separate card**: rejected.
  A card view makes Company / Position / Status / Update / menu the
  primary affordances, which matches the dashboard's card-list
  pattern. Folding them into the table would still need a CSS branch.

### 2. Generic `DataTable` gains an optional `renderCard` slot

The `DataTable<TData, TValue>` component is intentionally generic. To
avoid duplicating the table-rendering branch, the card is added as an
opt-in `renderCard?: (row: TData) => ReactNode` prop. When omitted,
the table renders exactly as before — backward compatible with
`application-data-table-columns.test.tsx`, which does not pass
`renderCard`.

`getRowKey?: (row, index) => string` is also added so callers can
provide a stable React key (defaults to TanStack's `row.id`). This
keeps the generic table reusable for any future list (CVs, resumes,
etc.) that might want the same responsive treatment.

### 3. Shared display module keeps the two views in sync

`application-row-display.tsx` exports `StatusBadge`, `UpdatingIndicator`,
the `ApplicationActionsMenu` (trigger + dropdown items), plus the
`actionLabel` and `menuTriggerLabel` helpers. The table's actions cell
and the card both import from this module, so a status / menu change
automatically applies to both views. The table columns file is
narrowed to column plumbing; the duplicated `StatusBadge` /
`UpdatingIndicator` / `actionLabel` code that previously lived there
is removed.

### 4. Card chrome matches `surface-soft` design system

`ApplicationRowCard` uses `surface-soft text-card-foreground p-4` —
exactly the chrome called out for application surfaces in
`apps/web/DESIGN.md`. The card is an `<article>` with no fixed width;
Company and Position are `truncate`d `Link`s with `max-w-full`, the
Update button is an outline `Button` placed next to the status badge
in a `divider-soft border-t pt-3` footer row, and the 3-dots menu
sits at the top-right next to the Company/Position stack.

### 5. Desktop actions cell: `flex-nowrap` + `shrink-0`

The previous `flex flex-wrap items-center justify-end gap-2` allowed
the Update button and 3-dots menu to wrap onto separate lines when
the Company / Position cells consumed their `max-w` budget. Changing
the wrapper to `flex flex-nowrap` and adding `shrink-0` to the Update
button (`ApplicationActionsMenu` already adds `shrink-0` to its
trigger) keeps both controls on a single line. The table's
`overflow-auto` wrapper already handles any pathological narrowing.

### 6. Skeleton mirrors both views

`ApplicationListSkeleton` adds an `ApplicationCardSkeleton` (using
`Skeleton` placeholders in the same `surface-soft` chrome) rendered
in a `md:hidden` block beneath the existing table skeleton, so the
loading state is consistent at every viewport. The existing
"three placeholder rows inside the surface-soft data table" test
remains valid because the new card surfaces are appended after the
table surface.

## Risks / Trade-offs

- **[Two DOM copies of each row on every viewport] → Mitigation**: the
  rows are cheap text/links/menus, and one of the two regions is
  `display: none` at any given viewport. No measurable performance
  regression; the alternative (a single responsive component) would
  duplicate the same logic and complicate testing.
- **[Cards and table can drift if a future change forgets to update
  both] → Mitigation**: the shared `application-row-display.tsx`
  module is the single source of truth for status / menu. The
  `application-row-card.test.tsx` unit tests assert the card surfaces
  the same status label, the same 3-dots menu items, and the same
  Update button aria-label as the table.
- **[Long company/position text can crowd the card] → Mitigation**:
  Company and Position use `truncate max-w-full`, so the card's right
  column still has space for the 3-dots menu at any 320px+ width.
- **[Test queries for the table now need to be scoped] → Mitigation**:
  the table wrapper gets `data-testid="applications-data-table"` so
  the existing `application-list.test.tsx` tests can scope to
  `within(tableRegion).getByRole('table')`. The card is reachable via
  `data-testid="application-row-card"`.

## Migration Plan

This is a UI-only retroactive documentation of work already in the
working tree. No data migration, no API change, no flag flip, no
feature flag. The mobile card view becomes available as soon as the
implementation lands; the desktop table is unchanged. Rollback =
revert the implementation commit (commit 2).
