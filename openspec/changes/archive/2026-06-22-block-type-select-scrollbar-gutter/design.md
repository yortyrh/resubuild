## Context

`@mdxeditor/editor` renders its floating surfaces (Block-type select dropdown,
Link dialog, table grid picker, etc.) inside a Radix Select under the hood.
Radix Select mounts `react-remove-scroll-bar` while the popover is open, which
injects a `<style>` tag with the rule

```css
body[data-scroll-locked] {
  overflow: hidden !important;
  overscroll-behavior: contain;
  position: relative !important;
  padding-left: <left>px;
  padding-top: <top>px;
  padding-right: <right>px;
  margin-left: 0;
  margin-top: 0;
  margin-right: <gap>px !important;
}
```

The `padding-right` / `margin-right` are the library's own compensation for the
scrollbar it is about to hide — the idea is that when `overflow: hidden`
removes the scrollbar, the body still occupies the same horizontal space, so
content doesn't reflow.

The dashboard's `apps/web/src/app/globals.css` already had a paired
workaround: `html, body { scrollbar-gutter: stable }` reserves the scrollbar
gutter permanently at the root, and `html body[data-scroll-locked] { margin: 0
!important; padding: 0 !important }` zeroes Radix's compensation so we don't
double-count. That pair shipped in commit `2084c85` (template presentation)
and worked correctly — opening the Block-type dropdown did not shift the
layout.

When MDXEditor replaced the previous Wysimark editor in commit `d37ca6a`,
the `scrollbar-gutter: stable` half of the pair was dropped from the global
stylesheet (it was on `html, body` and the rewrite did not include it), but
the `body[data-scroll-locked]` half was retained with its comment still
describing the intent. With only one half present:

- `overflow: hidden` still hides the scrollbar.
- Nothing reserves the scrollbar gutter, so the scrollbar appearing/disappearing
  changes the layout width by ~15px.
- The `margin: 0; padding: 0 !important` override actively zeroes the
  compensation that would otherwise keep the body the same width.

The net effect is exactly the bug the user reported: opening the Block-type
dropdown on the Summary field makes the page width grow by the scrollbar
width and the form below the editor reflows.

## Goals / Non-Goals

**Goals:**

- Restore the invariant: opening any Radix Select / Dialog surface on the
  page (Block-type dropdown, Link dialog, table grid picker, future Radix
  popovers) does not shift the page layout.
- Keep the fix CSS-only at the global stylesheet level — no React changes,
  no per-component overrides.
- Make the relationship between the two CSS rules explicit in the comment so
  a future refactor doesn't drop one half of the pair again.

**Non-Goals:**

- Not changing how Radix / MDXEditor portals its floating surfaces.
- Not changing the editor wrapper (`markdown-editor-impl.tsx`).
- Not introducing a global `overflow: clip` swap (would break legitimate page
  scroll affordances).

## Decisions

**Reserve the gutter on `html`, not on `body`.**

The scrollbar in the dashboard is owned by the `html` element (Next.js App
Router default; `body` does not have its own scroll container). Applying
`scrollbar-gutter: stable` to `html` is what tells the browser to permanently
reserve the right-side gutter whether or not the scrollbar is currently
visible. Applying it to `body` instead would not affect the html scrollbar.

**Keep the `html body[data-scroll-locked] { margin: 0; padding: 0 }` override.**

Once `scrollbar-gutter: stable` reserves the gutter, Radix's runtime
`padding-right: <gap>px !important; margin-right: <gap>px !important` would
shift the body content to the left by the scrollbar width _on top of_ the
already-reserved gutter. Zeroing those out with `!important` (and bumping the
selector to `html body[...]` so it has higher specificity than Radix's
runtime `<style>` injection) is required to avoid double-counting.

**Rewrite the rationale comment in place.**

The previous comment described an internal contradiction — it claimed Radix
adds `padding-right: 15px` to compensate and then forced `padding: 0`, which
contradicts the very next rule. The new comment explicitly describes the
two halves of the pair (reserve gutter + zero compensation) so the next
editor sees them as a unit and does not drop one half.

## Risks / Trade-offs

- [Wide surfaces that intentionally want the body to grow with the
  scrollbar] → None in this app: the dashboard surfaces all reserve the
  scrollbar gutter via the same global selector, so behavior is consistent
  everywhere.
- [Print stylesheet already hides `.no-print`; scrollbar gutter does not
  affect print] → Confirmed: `scrollbar-gutter` is a viewport-only property;
  the existing `@media print { .no-print { display: none !important; } }`
  block continues to work.
- [Marketing route has its own `globals.css`] → Confirmed:
  `apps/web/(marketing)/globals.css` is a route-group-scoped stylesheet that
  doesn't include this rule. The marketing surfaces don't host the MDXEditor,
  so the missing `scrollbar-gutter` there is unrelated to this bug and
  outside the scope of this change.

## Migration Plan

None — CSS-only change in the global stylesheet. No deploy step beyond the
normal Next.js build. No rollback strategy needed beyond reverting the
single `html { scrollbar-gutter: stable }` rule if it ever needs to be
disabled.
