## Context

The application workspace page (`/dashboard/applications/[id]`) renders
two in-page chrome regions above the tab content:

1. The **workspace header row** — the title block containing the joined
   job title / company and the "Update" button, wrapped in `<div
className="px-2">`.
2. The **tab strip header row** — the flex row inside the tabs card that
   hosts `TabsList` plus per-tab action buttons (e.g. Edit CV / Preview
   for the Tailored CV tab, Copy letter / Print / PDF for the Cover
   letter tab).

Both regions are interactive chrome, not printable content. The
existing dashboard sidebar + top bar, landing header, CV editor chrome,
CV preview chrome, and template config panel already use the `no-print`
utility class so the
`@media print { .no-print { display: none !important; } }` rule in
`apps/web/src/app/globals.css` hides them on print. The application
workspace page was the only authenticated workspace page whose
in-page chrome still leaked into a printout.

## Goals / Non-Goals

**Goals:**

- Hide the application workspace header row and tab strip header row
  when the user invokes the browser print dialog on
  `/dashboard/applications/[id]`.
- Keep the actual tab content panels (Job summary / Tailored CV /
  Cover letter body) visible and printable.
- Reuse the existing `no-print` utility class — no new CSS or design
  tokens.

**Non-Goals:**

- Hiding or restyling any non-chrome workspace content (the body of
  each tab panel is intended print content and must remain visible).
- Changing the screen layout of the header or tab strip.
- Touching dashboard chrome (already covered by the
  `hide-dashboard-chrome-on-print` change), landing chrome, CV editor
  chrome, CV preview chrome, or template config panel chrome (each
  already uses `no-print`).

## Decisions

- **Use the existing `no-print` Tailwind utility instead of a new
  print media query.** All other chrome surfaces in the app already use
  `no-print`; introducing a second mechanism would create inconsistency
  and force future chrome additions to pick between two conventions.
- **Apply `no-print` to the two wrapper containers, not to individual
  action buttons.** The wrapper approach lets us hide the entire header
  row and the entire tab strip header row as units, matching how the
  dashboard sidebar shell and top bar are hidden. Applying `no-print`
  per button would risk leaving whitespace or mis-aligned layout in the
  print output, and would require updating every button when a new one
  is added.
- **Prepend `no-print` to the existing className string.** This keeps
  the existing `px-2` and `flex flex-wrap items-center justify-between
gap-3` utilities intact; the Prettier tailwind class sort plugin
  reorders tokens deterministically so the resulting order is stable.

## Risks / Trade-offs

- [Tab panels lose their visible tab strip on print but keep their
  content] → Acceptable: the printed output is a single content panel
  at a time (the user activates a tab before printing), so a hidden
  tab strip on print matches the dashboard sidebar / top bar precedent
  set by `hide-dashboard-chrome-on-print`.
- [Future chrome additions to the application workspace need to add
  `no-print` themselves to stay consistent] → Acceptable: this is the
  established convention across the rest of the app; a future code
  reviewer will catch a missing `no-print` on chrome via lint /
  design review.

## Migration Plan

No data migration. No deployment steps beyond the regular
`pnpm --filter web lint` + `pnpm --filter web typecheck` + build
verification already enforced by CI.

Rollback: revert the two `no-print` additions in
`apps/web/src/components/applications/application-workspace.tsx`. No
state, schema, or persisted value is affected.

## Open Questions

None.
