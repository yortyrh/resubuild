## Why

This change retroactively documents work already implemented in the working tree.

When the user opens the Block-type dropdown in the Summary field's MDXEditor
toolbar (and any other Radix Select / Dialog surface on the page), the page
scrollbar disappears, causing the layout to shift horizontally by the scrollbar
width and the form below the editor to visibly reflow. The shift comes from
Radix's scroll lock (`react-remove-scroll-bar`): it sets
`body { overflow: hidden }` so the page can't scroll behind the popover, but
nothing on the page reserves the scrollbar gutter permanently, so the layout
reacts to the scrollbar appearing/disappearing.

The original `html, body { scrollbar-gutter: stable }` rule that paired with
the existing `body[data-scroll-locked]` override was lost in the MDXEditor
migration (`d37ca6a`), leaving the override without its compensating half and
the layout shift unfixed.

## What Changes

- `apps/web/src/app/globals.css` restores `html { scrollbar-gutter: stable }`
  immediately above the existing `html body[data-scroll-locked]` override so
  the scrollbar gutter is permanently reserved at the page root and the
  scrollbar toggling on Radix scroll-lock no longer shifts the layout.
- The comment block on the override is rewritten to explain the new
  invariant (`scrollbar-gutter` reserves the gutter permanently; the override
  removes `react-remove-scroll-bar`'s redundant `padding-right` / `margin-right`
  compensation so we don't double-count).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cv-editor-ui`: new requirement that the page reserves a stable scrollbar
  gutter at the root so opening the markdown editor's portalized dropdown
  surfaces (Block-type select, Link dialog, table grid picker) does not shift
  the layout of the editor and the form below it.

## Impact

- `apps/web/src/app/globals.css` — one rule added (`html { scrollbar-gutter: stable }`)
  and one comment block rewritten (~10 lines).
- No runtime dependency changes, no API changes, no migration.
- The fix is contained to the global stylesheet and is invisible in markup or
  React tree.
