## Context

`apps/web/src/components/cv/markdown-editor-impl.tsx` was authored with a constrained 8-plugin list (`listsPlugin`, `quotePlugin`, `thematicBreakPlugin`, `linkPlugin`, `linkDialogPlugin`, `tablePlugin`, `toolbarPlugin`, `markdownShortcutPlugin`). The earlier migration to `@mdxeditor/editor` originally specified a larger list including `headingsPlugin` and `codeBlockPlugin` (`openspec/changes/archive/2026-06-06-migrate-to-mdxeditor/design.md`), but the shipped wrapper trimmed them to constrain CV section fields (which use a constrained grammar that does not need headings or fenced code blocks).

The same wrapper is shared with `ApplicationLetterEditDialog`, which mounts a block-variant editor for the cover letter. Cover letter markdown legitimately contains headings (e.g. `## Why I'm a fit`, `## Closing`), inline links, lists, and fenced code blocks. Without `headingsPlugin`, MDXEditor's lexical tree cannot promote the `## ` markdown shortcut into a heading node and the cover letter editor silently renders the raw `## ` source.

`markdownShortcutPlugin` (already registered) recognizes the `## ` keystroke shortcut, but without `headingsPlugin` the resulting heading node type is not registered with the editor — so the shortcut effectively no-ops.

The fix is local to the shared wrapper and the cover letter dialog. No API, schema, or backend change is required.

## Goals / Non-Goals

**Goals:**

- Enable full markdown grammar (headings, code blocks) on cover-letter authoring while keeping the CV editor toolbar constrained.
- Make the opt-in explicit and discoverable on the wrapper's prop type.
- Keep `MarkdownEditor` behavior identical for every existing CV-section consumer (no plugin list change for the constrained default).

**Non-Goals:**

- No new MDXEditor feature beyond headings and code blocks (image upload, mention/hashtag plugins, slash menus etc. remain out).
- No refactor of `markdown-editor.tsx` (the wrapper) — only `markdown-editor-impl.tsx` (the implementation) gains the `freeForm` prop, and the public wrapper re-exports the same interface.
- No change to the `noscript` fallback, the imperative `setMarkdown` ref, or any CSS targeting the editor shell.
- No change to the read-only `MarkdownView` consumer (cover letter preview continues to use the existing `react-markdown` renderer, which already handles headings via `remark-gfm`).

## Decisions

### D1. New `freeForm?: boolean` prop on `MarkdownEditorProps`

Add an optional boolean prop. Default `false` so every existing call site (`form-fields.tsx`, `prepare-application-form.tsx`, `application-intake-options.tsx`) keeps the constrained plugin list. The cover letter dialog passes `freeForm` explicitly. This avoids inventing a third variant value alongside `inline` / `block`.

**Why:** Variant currently encodes `inline` vs `block`, a structural dimension. `freeForm` is an orthogonal capability dimension; collapsing them into one prop (e.g. `'inline' | 'block' | 'free-block'`) would force every call site to re-decide between a constrained block and a free block. A separate boolean keeps the call sites explicit and makes the diff at the cover letter dialog obvious (`freeForm` added alongside `variant="block"`).

**Alternatives considered:**

- Add a third variant value: rejected — would require every consumer to update their variant union and re-derive which plugin list to use.
- Always register `headingsPlugin` / `codeBlockPlugin`: rejected — the cv-editor-ui spec deliberately constrains the CV section toolbar (no image upload, no headings, no code block button). Adding the plugins unconditionally would expose `H1/H2/H3` in `BlockTypeSelect` on Work descriptions, violating the existing toolbar scope requirement.
- Introduce a separate `MarkdownEditorFreeForm` component: rejected — duplicates the entire wrapper, ref, `useImperativeHandle`, and CSS className shell.

### D2. Plugin list is memoized on `[variant, freeForm]`

The plugin array is wrapped in `useMemo` keyed on `[variant, freeForm]`. This avoids re-instantiating plugins on every parent render and prevents an MDXEditor plugin list mutation warning.

**Why:** MDXEditor v4 expects a stable plugin list. Re-creating the array on every parent render still triggers plugin re-registration through MDXEditor's effect chain. Memoization guarantees plugins only change when the relevant inputs change.

### D3. `ToolbarContents` accepts the new prop and conditionally renders `InsertCodeBlock`

The block variant's toolbar gains a trailing `<InsertCodeBlock />` when `freeForm` is true. Inline variant is intentionally unchanged regardless of `freeForm`.

**Why:** Headings surface automatically through the existing `BlockTypeSelect` (which already shows Paragraph + Quote; with `headingsPlugin` registered, the dropdown shows Paragraph / H1 / H2 / H3 / Quote at runtime). Code blocks have no markdown shortcut in MDXEditor's default shortcut set, so an explicit toolbar button is the only way for a user to insert one. The inline variant deliberately omits `InsertCodeBlock` because inline editors are reserved for highlights and one-liner prose where a multi-line code block would not fit.

### D4. `ApplicationLetterEditDialog` passes `freeForm`

The dialog's `<MarkdownEditor>` call adds `freeForm` to the existing `variant="block"`, `placeholder`, and `className` props. No other consumer changes.

**Why:** This is the minimum change that fixes the cover-letter editor while leaving every other consumer's plugin list untouched. The prop is documented inline so future long-form authoring surfaces (job description text, intake instructions) can opt in the same way.

### D5. Test mocks learn `headingsPlugin` / `codeBlockPlugin` / `InsertCodeBlock`

The `@mdxeditor/editor` mock in `markdown-editor-impl.test.tsx` adds three new entries, matching the real package's exports. The mock's `MDXEditor` reads `codeBlockPlugin` presence out of the `plugins` array and conditionally renders the toolbar's `InsertCodeBlock` button.

**Why:** The mock already exposes `data-plugins={plugins.length}` and inspects plugin identities via string equality (e.g. `plugins?.some((p) => p === 'toolbarPlugin')`). Reusing that pattern for `codeBlockPlugin` lets the test verify that `InsertCodeBlock` shows up exactly when the plugin is registered, without changing the mock's shape.

### D6. Cover-letter dialog tests pin the new contract

Two new tests in `application-letter-edit-dialog.test.tsx`:

1. The dialog seeds the editor with `## Some heading\nSome text` unchanged.
2. The dialog passes `freeForm=true` on the `MarkdownEditor` instance.

Both tests fail if a future regression drops `freeForm` from the dialog's `<MarkdownEditor>` props, locking the cover-letter surface to the full markdown grammar.

## Risks / Trade-offs

- **[Risk] Future consumers opting in to `freeForm` would expose `InsertCodeBlock` on the cover-letter toolbar.** → Mitigation: this is the desired behavior; long-form authoring surfaces should have it. No mitigation needed beyond the prop documentation.
- **[Risk] `markdownShortcutPlugin` already registers the `## ` shortcut; with `headingsPlugin` enabled, typing `## Some heading` will now promote to a heading on the cover-letter editor.** → Mitigation: this is the desired behavior — the user explicitly asked for free markdown on the cover letter. CV section editors remain constrained.
- **[Risk] `BlockTypeSelect` options expand from `Paragraph + Quote` to `Paragraph / H1 / H2 / H3 / Quote` when `freeForm` is true.** → Mitigation: the toolbar styling already accommodates wrapped items (sticky, `flex-wrap: wrap`, `min-height: 2.25rem`, see `openspec/changes/archive/2026-06-19-cover-letter-edit-dialog/design.md`). The cover-letter dialog caps the editor at `max-h-[100dvh]` with internal scrolling so the wrapped toolbar fits.
- **[Risk] Memoizing the plugin list means `useMemo` runs on every variant/freeForm transition. Tests that assert plugin count with non-`freeForm` defaults still expect `8`.** → Mitigation: existing tests assert `data-plugins="8"` against `variant="block"` without `freeForm` and remain valid. New tests pin the `10` plugin count for the `freeForm` path.

## Migration Plan

No data migration. No backend change. The fix ships as a normal client-side change to the shared editor wrapper plus the cover letter dialog. The existing `pnpm verify` (format:check, Biome lint, typecheck, `pnpm test -- --run`, build) exercises it.

**Rollback:** Revert the change. The cover letter editor would silently render `## Some heading` as plain text again (same behavior as before this fix); Copy / Print / PDF flows remain unchanged because they read the saved markdown via the server-rendered letter HTML endpoint, not through the editor.

## Open Questions

None — the bug, the fix, and the test surface are all clear from a single reproduction on a cover letter with heading markdown.
