## Why

This change retroactively documents work already implemented in the
working tree. The application workspace header at
`/dashboard/applications/[id]` rendered the document title as
`` `${jobTitle} · ${jobCompany}` `` joined into a single `<h1>`. When a
title and company name were both long, the joined string overflowed
the row's `min-w-0 flex-1` slot — the heading either truncated or
pushed the Update button onto a second line on narrow viewports. The
existing `application-workspace-tabs` spec only required that the
workspace header row be excluded from print output and that action
buttons not reflow, but did not cover how the job title and company
should be visually prioritised.

## What Changes

- In `ApplicationWorkspace`, split the workspace header into a primary
  `<h1>` for the company (`data.jobCompany`) and an optional
  `<p class="text-muted-foreground …">` subtitle for the position
  (`data.jobTitle`). The heading falls back to the literal text
  `Application` when `jobCompany` is missing or whitespace-only; the
  subtitle is omitted entirely when `jobTitle` is missing or
  whitespace-only.
- Add `truncate` to the heading and subtitle so long company or
  position values collapse to an ellipsis inside the row instead of
  pushing the Update button onto a second line.
- Update `application-workspace.test.tsx` to assert the new layout:
  the heading exposes the company, the position renders as a `<p>`
  with `text-muted-foreground` directly beneath the heading, the
  fallback `Application` heading keeps the position as a subtitle,
  and an omitted position removes the subtitle paragraph.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-workspace-tabs`: add a requirement that the application
  workspace header SHALL render the company as the primary `<h1>` and
  the position as a muted subtitle `<p>` directly beneath the heading.
  The heading SHALL fall back to the literal text `Application` when
  the company is missing or whitespace-only, and the subtitle SHALL be
  omitted when the position is missing or whitespace-only. The
  existing "excluded from print output" requirement continues to apply
  to the wrapper that hosts both the heading and the Update button.

## Impact

- `apps/web/src/components/applications/application-workspace.tsx` —
  replace the joined `<h1>` with a `<div>` containing an `<h1>`
  (company) and an optional subtitle `<p>` (position); add `truncate`
  to both elements.
- `apps/web/src/components/applications/application-workspace.test.tsx`
  — update the existing heading assertion to expect the company in
  `<h1>` and the position in a muted `<p>` directly below the heading;
  add two new tests covering the fallback and subtitle-omission
  branches.

No API, schema, auth, design-token, or `globals.css` changes. **No
breaking** API change. **No breaking** UI change for users — the same
information is shown in the same row, just visually split so the
Update button never has to compete with a long concatenated string.
