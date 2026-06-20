## Why

The shared `MarkdownEditor` wrapper (`apps/web/src/components/cv/markdown-editor-impl.tsx`) currently registers a constrained 8-plugin list that strips `headingsPlugin()` and `codeBlockPlugin()`. As a result, markdown like `## Some heading` saved on a cover letter is silently rendered as literal text by MDXEditor when reopened in `ApplicationLetterEditDialog`. The cover letter is a long-form authoring surface — not a CV section — so it must accept the full markdown grammar (headings, code blocks). The CV editor's toolbar constraint must be preserved unchanged.

This change retroactively documents work already implemented in the working tree that adds a `freeForm` opt-in prop on the wrapper and threads it through the cover letter dialog.

## What Changes

- Add a `freeForm?: boolean` prop on `MarkdownEditorProps` (default `false`). When `true`, the plugin list adds `headingsPlugin()` and `codeBlockPlugin()` and the block toolbar renders `InsertCodeBlock`.
- Wire `freeForm` through `ToolbarContents` so the toolbar reflects the new plugin set.
- Pass `freeForm` on the `MarkdownEditor` instance inside `ApplicationLetterEditDialog`.
- Extend the `MarkdownEditor` mocks in `markdown-editor-impl.test.tsx` to register the new plugins and `InsertCodeBlock`, plus add a `withInsertCodeBlock` flag on `BlockToolbar` so the toolbar mock reflects the configured plugins.
- Update `application-letter-edit-dialog.test.tsx` to track the `freeForm` prop and assert it is `true` for the cover-letter editor.
- Add tests pinning the constrained default (8 plugins, no `InsertCodeBlock` in the block toolbar) and the free-form mode (10 plugins, `InsertCodeBlock` visible, inline toolbar unchanged).

No API, schema, or backend change. No new dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cv-editor-ui`: the `MarkdownEditor` wrapper accepts a `freeForm` opt-in that registers `headingsPlugin` and `codeBlockPlugin`. Block toolbars additionally render `InsertCodeBlock` in free-form mode. CV-section consumers (which do not pass `freeForm`) keep the constrained 8-plugin set.
- `application-workspace-tabs`: the cover letter edit dialog now passes `freeForm` on its `MarkdownEditor` instance so cover letter markdown containing `## heading` syntax renders as headings when reopened in the editor.

## Impact

- `apps/web/src/components/cv/markdown-editor-impl.tsx` — new `freeForm` prop, plugin list conditional on it, new toolbar item.
- `apps/web/src/components/applications/application-letter-edit-dialog.tsx` — pass `freeForm` on the `MarkdownEditor` instance.
- `apps/web/src/components/cv/markdown-editor-impl.test.tsx` — mock `headingsPlugin` / `codeBlockPlugin` / `InsertCodeBlock`; add free-form describe block.
- `apps/web/src/components/applications/application-letter-edit-dialog.test.tsx` — record the `freeForm` prop the dialog passes; assert it is `true` and that the dialog seeds the editor with heading-prefixed markdown unchanged.
