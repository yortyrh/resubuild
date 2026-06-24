## Context

The `ApplicationWorkspace` component renders the page header for
`/dashboard/applications/[id]`. Before this change, the header was a
single `<h1>` that joined `data.jobTitle` and `data.jobCompany` with a
`·` separator and fell back to `Application` when both were empty:

```tsx
<h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight">
  {[data.jobTitle, data.jobCompany].filter(Boolean).join(' · ') || 'Application'}
</h1>
```

When the title and company were both long (e.g. `Senior Backend
Engineer` × `United Software Group Inc`), the joined string consumed
the available row width and either truncated silently or pushed the
Update button onto a second line on narrow viewports. The
`application-workspace-tabs` spec required the header to be excluded
from print and required the action buttons not to reflow, but it did
not dictate how the title/company should be prioritised inside the
row, so the implementation had chosen the simple concatenation.

The fix mirrors the `ResumeItemRow subtitle` pattern used elsewhere in
the dashboard (`cv-editor-ui` spec): a single primary line (the
company) and an optional muted subtitle line (the position) stacked
inside the same flex slot. Both elements use `truncate` so long
values collapse to an ellipsis inside the row instead of pushing the
Update button.

## Goals / Non-Goals

**Goals:**

- Render the company as the primary `<h1>` and the position as a muted
  `<p>` subtitle directly beneath it.
- Provide a stable fallback to `Application` when the company is
  missing, while still surfacing the position as a subtitle when
  present.
- Omit the subtitle paragraph entirely when the position is missing,
  rather than rendering an empty `<p>`.

**Non-Goals:**

- Changing the `ApplicationWorkspaceBreadcrumb` or any other
  breadcrumb component — the change is scoped to the in-page header.
- Changing the Update button placement, label, or behaviour.
- Touching the API, schema, auth, design tokens, or `globals.css`.
- Restructuring the print-exclusion requirement — the same `<div>`
  wrapper that hosts the heading still hosts the Update button, so
  the existing `no-print` rule applies unchanged.

## Decisions

### 1. Company as `<h1>`, position as `<p>` subtitle

The company is the more durable identifier (it usually does not change
across multiple applications to the same employer) and is the entity
the user is preparing a CV **for**, so it becomes the primary heading.
The position is context for **this** application and is rendered as
muted subtitle, consistent with the `ResumeItemRow subtitle` pattern
that the rest of the dashboard uses for secondary entity context
(`cv-editor-ui` "ResumeItemRow SHALL support an optional subtitle
beneath the title").

Alternative considered: keep the concatenated `<h1>` and add a
`truncate` class so it collapses gracefully. Rejected — `truncate`
alone still risks the user seeing an ellipsis instead of their
position, while the subtitle line guarantees the position is always
fully visible.

### 2. Fallback order: company → "Application", position → omit

When `jobCompany` is missing or whitespace-only, the heading falls
back to the literal text `Application` (matching the pre-existing
fallback string). The position is still rendered as a subtitle when
present, so a `jobTitle="Senior Engineer"` application without a
company shows `Application` heading + `Senior Engineer` subtitle.

When `jobTitle` is missing or whitespace-only, the subtitle
paragraph is omitted entirely rather than rendered as an empty `<p>`,
so the heading sits alone without a redundant empty line.

Alternative considered: fall back to the position when the company is
missing. Rejected — the workspace page is an **application** page
(`/dashboard/applications/[id]`), so the user expects the workspace
to read as "the application for X", not "X the application". Showing
"Application" as the heading with the position as the subtitle keeps
the user oriented.

### 3. Keep the same `<div class="flex flex-wrap …">` wrapper

The existing header wrapper hosts the heading slot and the Update
button slot. The change only swaps the contents of the heading slot
from a single `<h1>` to a `<div>` containing the new `<h1>` and
optional `<p>`. The wrapper's flexbox layout is unchanged, so the
Update button keeps its current placement and the existing
`no-print` exclusion continues to apply to the same wrapper element.

## Risks / Trade-offs

- **[Users who relied on the joined `<h1>` text] → Mitigation**: the
  Update button is still labelled `Update application`, the
  application ID is still in the URL, and the page title in the
  browser tab is still derived from the workspace data; no navigation
  affordance depends on the joined string. The new layout makes the
  company more prominent, which is the intended hierarchy.
- **[Subtitle can crowd the heading row] → Mitigation**: both
  elements use `truncate` and the wrapper uses `min-w-0 flex-1`, so
  the heading slot collapses the longest reasonable string and never
  pushes the Update button.
- **[Test queries need to be scoped to the heading row] → Mitigation**:
  the existing test was updated to scope the subtitle lookup to
  `heading.parentElement` (the new heading row) so it does not match
  the Job summary tab's Position `<dd>`.

## Migration Plan

Retroactive documentation of work already in the working tree. No data
migration, no API change, no flag flip. The new layout becomes
visible as soon as the implementation lands; rollback = revert the
implementation commit (commit 2).
