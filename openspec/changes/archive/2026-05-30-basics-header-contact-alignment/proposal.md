## Why

> This change retroactively documents work already implemented in the working tree.

After adding contact and social icons to resume template headers, centered (`classic`) and modern design headers still left contact and profile rows left-aligned within their flex containers, so icons and links did not visually align with centered name/label text. The tabular header also stacked social profile links vertically while contact fields used `<br />` separators—profiles should wrap inline on one row, right-aligned, for a cleaner two-column layout.

## What Changes

- Add `justify-center` to contact and profile flex rows when `headerStyle` is `centered` or `design`.
- Leave `left` and `tabular` contact rows without horizontal centering (tabular contact fields remain stacked with `<br />`).
- Render tabular header social profiles in a single inline flex row with `justify-end` and horizontal gap instead of a stacked `space-y-1` block.
- Extend `render-basics-header.test.ts` with assertions for centered, design, left, and tabular profile-row layout.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `resume-template-header-icons`: Add requirements for horizontal alignment of contact/profile rows per header style and inline tabular profile layout.

## Impact

- **packages/resume-template**: `renderBasicsHeader` in `primitives/sections/index.ts`; colocated unit tests in `render-basics-header.test.ts`.
- **No API, database, web editor, or schema changes** — HTML rendering alignment only.
