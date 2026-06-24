## Why

This change **retroactively documents work already implemented** in the
working tree. The application workspace component
(`apps/web/src/components/applications/application-workspace.tsx`) — the
page rendered at `/dashboard/applications/[id]` — now wraps two
in-page chrome regions with the `no-print` utility class: the workspace
header row (job title + Update button) and the tab strip header row
(`TabsList` plus per-tab action buttons). The existing
`@media print { .no-print { display: none !important; } }` rule in
`apps/web/src/app/globals.css` then hides both regions whenever a user
prints an application workspace page.

The dashboard chrome (sidebar + top bar) and the landing/CV-editor
chrome already use `no-print`. The application workspace page is the
last authenticated page whose workspace-level chrome (header + tab
strip) still leaked into a printout. Without `no-print`, printing an
application workspace page (e.g. to take a printed copy of a tailored
CV or cover letter) included the in-page header and tab strip alongside
the actual CV/letter content, wasting paper and obscuring the content.

## What Changes

- Add the `no-print` Tailwind utility to the workspace header wrapper
  in `ApplicationWorkspace` (the `<div>` directly above the tabs card
  that hosts the job title and Update button).
- Add the `no-print` Tailwind utility to the flex row inside the tabs
  card that hosts `TabsList` and the per-tab action buttons (Edit CV,
  Preview, Copy letter, Print, PDF, etc.).
- No CSS, design-token, or `globals.css` changes — `no-print` already
  exists and is used by other chrome surfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-workspace-tabs`: the application workspace chrome (page
  header row and tab strip header row) SHALL be hidden when the user
  prints the workspace; the requirement for the header and tab strip to
  be visible on screen is unchanged.

## Impact

- `apps/web/src/components/applications/application-workspace.tsx` —
  add `no-print` to the header wrapper className (line ~228) and to the
  tab strip flex row className (line ~256).
- No backend, Nest API, schema, auth, design-token, or `globals.css`
  changes. **No breaking** API change. **No breaking** UI change — the
  new class is opt-in at print media-query time only.
- E2E impact: UI-only Tailwind class addition; no API contract changes.
