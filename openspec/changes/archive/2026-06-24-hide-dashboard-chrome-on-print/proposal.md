## Why

This change **retroactively documents work already implemented** in the
working tree. The dashboard sidebar shell (`apps/web/src/components/dashboard/dashboard-sidebar-shell.tsx`)
and the dashboard top bar (`apps/web/src/components/dashboard/dashboard-top-bar.tsx`)
now carry the `no-print` utility class so that, when a user prints a
dashboard page, the navigation chrome (left rail + top bar) is hidden
via the existing `@media print { .no-print { display: none !important; } }`
rule in `apps/web/src/app/globals.css`.

Other dashboard chrome surfaces (landing header, CV editor chrome, CV
preview chrome, template config panel) already use `no-print`, so the
dashboard shell + top bar were the last two surfaces that still leaked
into a printout. Without `no-print`, printing any `/dashboard/*` page
(e.g. the "My CVs" list, an Applications page, or a settings page) would
include the sidebar and top bar alongside the page content, wasting
paper and obscuring the actual content.

## What Changes

- Add the `no-print` Tailwind utility to the root `<aside>` in
  `DashboardSidebarShell` (rendered by `apps/web/src/app/dashboard/layout.tsx`).
- Add the `no-print` utility to both branches of the
  `DashboardTopBar` `<header>` element (the mobile-only sticky bar
  rendered above the dashboard content and the alternate header path
  used by the editor/preview chrome).
- No CSS, design-token, or `globals.css` changes — `no-print` already
  exists and is used by other chrome surfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dashboard-sidebar-shell`: the persistent left sidebar SHALL be hidden
  when the user prints a dashboard page; the requirement for the sidebar
  to be visible on desktop is unchanged.

## Impact

- `apps/web/src/components/dashboard/dashboard-sidebar-shell.tsx` —
  add `no-print` to the `<aside>` className.
- `apps/web/src/components/dashboard/dashboard-top-bar.tsx` — add
  `no-print` to both `<header>` className branches.
- No backend, Nest API, schema, auth, or design-token changes. **No
  breaking** API change. **No breaking** UI change — the new class is
  opt-in at print media-query time only.
- E2E impact: UI-only Tailwind class addition; no API contract changes.
