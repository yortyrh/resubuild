# Design: markdown-editor-codeblock-styling

> Retroactive design document. Implementation is already present in the working tree.

## Context

MDXEditor's `codeBlockPlugin` + `codeMirrorPlugin` (registered for `freeForm` editors in `apps/web/src/components/cv/markdown-editor-impl.tsx`) renders each code block through three layers of bundled CSS:

1. **`@mdxeditor/editor/dist/style.css`** — wraps the block in `._codeMirrorWrapper_*` with `border: 1px solid var(--baseLine)`, `border-radius: var(--radius-medium)` (≈ 0.375rem), and `padding: 0.8rem`. The wrapper also hosts an absolutely-positioned `._codeMirrorToolbar_*` (language `<Select>` + delete button) at the top-right.
2. **`cm6-theme-basic-light`** — gives the inner `.cm-editor` a pure white background and the `.cm-gutters` element a near-white tinted background with `align-items: flex-start` on `.cm-gutterElement`.
3. **`apps/web/src/app/globals.css`** (this project) — already overrides `.cm-gutters` to `background: transparent` for the toolbar visual, but does not touch the wrapper chrome, the code area background, the gutter border, or the gutter's vertical alignment.

The result is a code block whose border and radius look heavier than the surrounding `contentEditable` (which uses `0.375rem` radius), whose code area is white-on-white inside the white `contentEditable`, and whose line numbers sit at the top of each row instead of centered.

## Goals / Non-Goals

**Goals:**

- Make the code block wrapper match the `contentEditable`'s tighter chrome language (thinner border, `0.25rem` radius).
- Give the code area a distinct gray surface so it reads as a code block instead of blending into the white `contentEditable`.
- Center the line-number digit vertically within each row.
- Reuse the project's existing `--muted` and `--border` design tokens for consistency with the rest of the dashboard chrome.

**Non-Goals:**

- Customizing CodeMirror syntax-highlighting colors (left to `cm6-theme-basic-light`).
- Changing the toolbar (`._codeMirrorToolbar_*`) pill styling beyond letting it sit transparently on the gray code area.
- Removing the line-number gutter entirely.
- Touching the `.cm-activeLine` or caret styling.

## Decisions

- **Override via `globals.css` instead of a new theme file.** The project already routes every MDXEditor visual override through `globals.css` (toolbar, contentEditable, popup z-index, scrollbar-gutter). Adding a new file would scatter the editor's chrome across two locations; staying in `globals.css` keeps the override next to its peers.
- **Attribute selector `[class*='_codeMirrorWrapper']` for the wrapper.** MDXEditor's CSS-module class is hashed (`_codeMirrorWrapper_f3hmk_391` in v3.55.0); the attribute selector pattern is already used elsewhere in this file (`[class*='_toolbarRoot']`, `[class*='_contentEditable']`) and is robust to upstream hashing changes.
- **Standard CodeMirror class names for the inner overrides.** `.cm-editor`, `.cm-content`, `.cm-gutters`, `.cm-lineNumbers`, and `.cm-gutterElement` are public CodeMirror 6 API and stable across versions, so no attribute-substring trick is needed.
- **Use `hsl(var(--muted) / 0.45)` for the code area background.** `--muted` is already the project's neutral surface token (used for the toolbar background); adding 45% alpha keeps it lighter than the toolbar so the toolbar still reads as a chrome band above the code.
- **`0.25rem` radius, not `0.375rem`.** Tighter than the `contentEditable` so the code block visually nests inside it as a sub-surface rather than competing with it.
- **`!important` on every rule.** Necessary because MDXEditor's bundled stylesheet sets these properties directly and ships after our base stylesheet in import order; without `!important` the override loses the cascade.

## Risks / Trade-offs

- [Upstream class hash could change in a future MDXEditor version] → the `[class*='_codeMirrorWrapper']` substring is stable enough across the v3 series; pin MDXEditor upgrades and re-check the wrapper override visually.
- [`.cm-gutterElement` `align-items: center` could look off on wrapped lines] → code blocks in this editor are authored with single-line content (cover letter / job description snippets); multi-line wrapping inside the gutter would still center the digit relative to the row's vertical midpoint, which is the desired behavior.
- [Choosing alpha 45% on `--muted` may not match the read-only `MarkdownView` block] → `MarkdownView` uses the Tailwind `prose` palette; intentional asymmetry, since the editor and the view are different surfaces (editable vs read-only).

## Migration Plan

No migration. The change is a pure CSS addition in a stylesheet that is already imported globally; no per-component or per-route change is required. Existing code blocks render with the new chrome on the next page load.
