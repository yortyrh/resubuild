# Change: markdown-editor-codeblock-styling

> This change retroactively documents work already implemented in the working tree.

## Why

The MDXEditor code block (CodeMirror wrapper) renders with bundled chrome that fights the rest of the dashboard surface language: a solid `var(--baseLine)` border at the bundled `var(--radius-medium)` (≈ 0.375rem) and a pure-white code area inside the white `contentEditable` field. The wrapper visually competes with the surrounding content instead of reading as a distinct "code" surface, and the line-number gutter defaults to `flex-start` so the digit sits at the top of each row rather than at its vertical center.

## What Changes

- Add a `globals.css` override block that targets the MDXEditor code block wrapper (`[class*='_codeMirrorWrapper']`) inside `.rich-text-editor` to use a thinner border (`1px solid hsl(var(--border) / 0.4)`) and a tighter radius (`0.25rem`), with `padding: 0` and `overflow: hidden` so the inner CodeMirror edges align flush to the wrapper.
- Override `.cm-editor` and `.cm-content` backgrounds to `hsl(var(--muted) / 0.45)` so the code area reads as a gray tinted surface against the white `contentEditable` rather than blending into it.
- Override `.cm-gutters` to a transparent background with a thin right divider, and override `.cm-lineNumbers .cm-gutterElement` to `display: flex; align-items: center; justify-content: flex-end` so the line-number digit sits in the vertical center of each row.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cv-editor-ui`: MDXEditor code blocks (CodeMirror wrapper, line-number gutter, code area) SHALL render with the project's dashboard chrome language — thinner border, tighter radius, muted-gray code area, vertically centered line numbers — instead of the bundled MDXEditor + `cm6-theme-basic-light` defaults.

## Impact

- `apps/web/src/app/globals.css` — new override block after the existing MDXEditor rules (before the `.markdown-view` block).
- No runtime code changes; no new dependencies; selectors target MDXEditor's hashed CSS-module class via the same `[class*='_codeMirrorWrapper']` pattern already used elsewhere in this file.
- No `apps/web/e2e` selectors or scenarios touch the code block chrome — covered visually by manual QA on the cover-letter editor's `freeForm` mode.
