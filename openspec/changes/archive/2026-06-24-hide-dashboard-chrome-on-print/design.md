## Context

The `no-print` utility class already exists in
`apps/web/src/app/globals.css` (the `@media print` block at line 165
sets `display: none !important` for any element marked `no-print`).
The pattern is already used by the landing page header, the CV editor
chrome row, the CV preview chrome, and the template config panel — so
all of those surfaces correctly vanish when a user prints their page.

After the `dashboard-left-sidebar-layout` change landed, the dashboard
chrome was rebuilt around a persistent left sidebar and a slim top bar.
Those two new surfaces were not retrofitted with `no-print`, so any
printout of a `/dashboard/*` page would include the sidebar rail and the
top bar alongside the page content.

## Goals / Non-Goals

**Goals:**

- Ensure the dashboard sidebar and top bar do not appear in printouts
  of dashboard pages.
- Stay consistent with how every other chrome surface in the app
  already opts out of print.

**Non-Goals:**

- Adding per-element print-only styles or a new "print this section"
  helper.
- Refactoring the print stylesheet or moving `no-print` out of
  `globals.css`.
- Hiding any dashboard _content_ (only the chrome — sidebar and top
  bar — is in scope).

## Decisions

- **Reuse `no-print`, do not add a new utility.** The CSS rule already
  exists and is the established convention for the landing header, the
  CV editor chrome, and the CV preview chrome. Adding a second utility
  would fragment the pattern without benefit.
- **Apply on both `DashboardTopBar` branches.** The component has two
  `<header>` returns — one used while a mobile Sheet is open and one
  for the normal case. Marking only one would let the other leak into
  print depending on the user's mobile state.
- **Do not change the existing print stylesheet.** `@media print
{ .no-print { display: none !important; } }` already provides the
  intended behaviour; the only required action is to opt the two
  surfaces in.

## Risks / Trade-offs

- [Risk] A future contributor might add a third `<header>` return to
  `DashboardTopBar` and forget `no-print`. → Mitigation: the existing
  `surface-soft chrome-divider` pattern is also a strong "this is
  chrome" signal; the print-stylesheet assertion is light-weight
  enough to live alongside the existing `no-print` audit.

## Migration Plan

None — class-name only change, deployed with the next build. No data
migration, no feature flag, no rollback concern.
