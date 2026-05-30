## Context

`renderBasicsHeader` supports four header styles (`centered`, `design`, `left`, `tabular`) and already renders icon-prefixed contact fields and social profiles. Name and label text use `text-center` for centered/design styles, but contact and profile rows used a plain flex row without horizontal justification, so content appeared left-aligned under centered headings.

## Goals / Non-Goals

**Goals:**

- Match contact and profile row alignment to the header style's text alignment (center for `centered`/`design`, default for `left`, right for tabular profiles).
- Keep tabular contact fields stacked per line (existing `<br />` pattern).
- Show tabular social profiles inline on one row, right-aligned.

**Non-Goals:**

- Changing icon markup, network normalization, or presentation field visibility rules.
- Adjusting web editor Basics/Social profiles UI (already aligned separately).

## Decisions

1. **Shared justification flag** — Derive `centeredContactRow` from `headerStyle === 'centered' || headerStyle === 'design'` and append `justify-center` to both contact and profile row class lists. Avoid duplicating style checks.

2. **Tabular profiles inline** — Replace the stacked `<div class="mt-1 space-y-1">…<br />…</div>` block with `<p class="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">` joining profile segments without `<br />`. Contact fields in the right column remain `<br />`-separated.

3. **Tests over snapshots** — Assert presence/absence of `justify-center`, `text-center`, `text-left`, and tabular profile row structure (no `space-y-1`, zero `<br />` in profile row) rather than full HTML snapshots.

## Risks / Trade-offs

- **Wrapping on narrow viewports** → Mitigated by existing `flex-wrap` and `gap-y-1`; profiles may wrap to multiple lines but stay inline within the row.
- **Print/PDF** → Tailwind utility classes only; no new print-specific rules required.
