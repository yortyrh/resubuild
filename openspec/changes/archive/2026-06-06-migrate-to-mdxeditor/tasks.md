## 1. Dependency swap and patch removal

- [x] 1.1 In `apps/web/package.json`, remove `"@wysimark/react": "^3.0.20"` and add `"@mdxeditor/editor": "^4.0.2"`.
- [x] 1.2 Delete `patches/@wysimark__react@3.0.20.patch` and the now-empty `patches/` directory.
- [x] 1.3 Remove the `patchedDependencies` block from `pnpm-workspace.yaml`.
- [x] 1.4 Remove the `pnpm.patchedDependencies` map from the root `package.json`.
- [x] 1.5 Run `pnpm install` and commit the updated `pnpm-lock.yaml` alongside the `package.json` and config edits.

## 2. Replace editor implementation

- [x] 2.1 Rewrite `apps/web/src/components/cv/markdown-editor-impl.tsx` to render `<MDXEditor …>` with the plugin list from `design.md` Decision 1 (`headingsPlugin`, `listsPlugin`, `quotePlugin`, `thematicBreakPlugin`, `linkPlugin`, `linkDialogPlugin`, `tablePlugin`, `codeBlockPlugin`, `toolbarPlugin`, `markdownShortcutPlugin`) and a `ToolbarContents` component that switches between the inline and block presets from Decision 2. Preserve the `MarkdownEditorImpl` named export and the `MarkdownEditorProps` interface (`value?`, `onChange`, `variant?: 'inline' | 'block'`, `placeholder?`, `className?`).
- [x] 2.2 Rewrite `apps/web/src/components/cv/markdown-editor.tsx` to import `MarkdownEditorImpl` directly (no `next/dynamic` shim). Keep the `<noscript>` textarea fallback for non-JS clients. Keep the re-export of `MarkdownEditorProps` and the `MarkdownEditor` function signature.
- [x] 2.3 Verify both files have the `'use client'` directive at the top.
- [x] 2.4 Confirm with `rg "markdown-editor-skeleton" apps/web/src` that no other file imports `markdown-editor-skeleton.tsx`; if none do, delete the file.

## 3. Update CSS to target the new editor

- [x] 3.1 Rewrite the `.rich-text-editor` block in `apps/web/src/app/globals.css` per `design.md` Decision 4: replace `[data-slate-editor='true']` with `.mdxeditor [contenteditable='true']`, replace the `> .border > div > div:first-child` toolbar selectors with `.mdxeditor [role='toolbar']`, and replace `[data-item-type='button']` / `[data-item-type='divider']` with `[data-toolbar-item]`. Preserve the 30px block-toolbar height, 2.25em inline-toolbar height, 0.75rem block / 0.5rem inline content padding, 0.6875rem inline font size, square corners, and the `padding-right: 1.75rem` reservation on `.string-list-markdown-editor .rich-text-editor--inline` rows.

## 4. Tests

- [x] 4.1 Run `pnpm --filter @resumind/web test -- --run` after the swap. The existing mocks in `apps/web/src/components/cv/form-fields.test.tsx` and `apps/web/src/components/cv/create-cv-form.test.tsx` substitute `MarkdownEditor` with a textarea / contentEditable div and SHOULD compile and pass unchanged.
- [x] 4.2 If the `[contenteditable="true"]` selector in `form-fields.test.tsx` ("passes coerced empty string to markdown editor when value is null", "uses an icon remove control for markdown rows", "does not auto-focus when adding a highlight", "does not add a highlight when Enter is pressed in the editor") now matches a different element, tighten the selector to scope under `.mdxeditor` (e.g. `.mdxeditor [contenteditable="true"]`) so the test queries only the editor's content region.
- [x] 4.3 Add a colocated `apps/web/src/components/cv/markdown-editor-impl.test.tsx` that renders the impl with the plugin list stubbed (`vi.mock('@mdxeditor/editor', …)`) and asserts the rendered toolbar includes the expected inline and block items, and that no `imagePlugin` is configured.

## 5. Verify and ship

- [x] 5.1 Run `pnpm verify` (format:check → biome → typecheck → `pnpm test -- --run` → build) and resolve any failures. If `@mdxeditor/editor` reports an ESM/CJS interop error during `pnpm build`, add it to `transpilePackages` in `apps/web/next.config.*` and re-run.
- [ ] 5.2 Manual smoke test on the dashboard CV editor: open `/dashboard/cv/[id]`, exercise the Basics (block), Work (block + inline highlights), Volunteer, Projects, Awards, Publications, References tabs, plus the application workspace cover letter (block). Confirm toolbar scope matches the spec, no console warnings (no `zustand` deprecation, no Emotion `:first-child` warning), square shell, 30px block toolbar, dense inline toolbar, no image-upload affordance anywhere.
- [x] 5.3 Confirm `git status` shows no residual `patches/` directory, no `pnpm.patchedDependencies` block, and no `@wysimark/react` reference in `apps/web/package.json` or `pnpm-lock.yaml`.

## E2E test impact

- **Must pass unchanged**: none. The `apps/api/test/e2e/local-supabase.e2e-spec.ts` scenarios exercise the import / agent / cv-crud API surface and do not render the web editor; the change is web-only. No E2E spec edit is required.
- **Update required**: none.
- **Add**: none for this change. (If a future change wants to add a Playwright check that the dashboard editor hydrates without console warnings, that is a follow-up; the unit + smoke checks in section 5 above are the MVP verification surface.)
