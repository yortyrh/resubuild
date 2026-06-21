## Why

`apps/web/src/components/cv/markdown-editor-impl.tsx` (`MarkdownEditorImpl`, the shared wrapper around `@mdxeditor/editor`) currently passes an empty `contentEditableClassName` for the block variant. As a result, the inner editable region (rendered as the element with `aria-label="editable markdown"`) receives no typography rules: headings, ordered/unordered lists, links, blockquotes, code blocks, and tables authored inside a block editor render at body-text size with no list markers, no heading scale, and no blockquote rule, even though the corresponding read-only `MarkdownView` (just layered with `@tailwindcss/typography` in the prior `markdown-view-prose-typography` change) renders the same content correctly.

This is a parity gap inside the same capability: the editor and its preview disagree on what a heading or a bullet list looks like, even though both consume the same markdown. The fix is local and idempotent: layer the same `prose prose-sm max-w-none` classes onto the editor's `contentEditableClassName` for the block variant so the editing experience and the read-only preview share the same typography scale.

This change retroactively documents work already implemented in the working tree that adopts the project’s already-installed `@tailwindcss/typography` plugin for the block variant of the shared markdown editor.

## What Changes

- In `apps/web/src/components/cv/markdown-editor-impl.tsx`, extend the `contentEditableClassName` computed via `cn(...)` so the block variant carries the classes `prose prose-sm max-w-none`. The inline variant keeps the existing `mdxeditor-content--inline` marker and remains prose-free (it renders inside `<li>` highlight bullets and nested-string titles where prose spacing would break the existing CV list layout, exactly the trade-off the precedent read-only `MarkdownView` change made).
- In `apps/web/src/components/cv/markdown-editor-impl.test.tsx`, update the existing `applies empty contentEditable class for block variant` test to assert the block variant carries `prose prose-sm max-w-none` on the `data-content-class` attribute exposed by the mock `MDXEditor`.

No new dependencies: `@tailwindcss/typography` is already a dev dependency in `apps/web/package.json` and is already registered in `apps/web/src/app/globals.css` via `@plugin '@tailwindcss/typography';` (the registration landed in the `markdown-view-prose-typography` change). No CSS, theme, or token work is required for this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cv-editor-ui`: the shared `MarkdownEditor` wrapper layers the `@tailwindcss/typography` `prose` utility (`prose prose-sm max-w-none`) onto its block-variant `contentEditableClassName` so headings, ordered/unordered lists, links, blockquotes, code blocks, and tables inside the editable region render with the same typography scale as the read-only `MarkdownView` block preview. The inline variant keeps its existing `mdxeditor-content--inline` marker and stays prose-free so highlight bullets keep their tight, list-friendly layout.

## Impact

- `apps/web/src/components/cv/markdown-editor-impl.tsx` — extend the `contentEditableClassName` expression to include `prose prose-sm max-w-none` when `variant === 'block'`; the inline variant is unchanged.
- `apps/web/src/components/cv/markdown-editor-impl.test.tsx` — update the block-variant content-class assertion from an empty string to `prose prose-sm max-w-none`.
