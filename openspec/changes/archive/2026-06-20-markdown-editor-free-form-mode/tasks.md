## 1. MarkdownEditor wrapper — freeForm opt-in

- [x] 1.1 Add `freeForm?: boolean` (default `false`) to `MarkdownEditorProps` in `apps/web/src/components/cv/markdown-editor-impl.tsx`; document the prop on the type
- [x] 1.2 Import `headingsPlugin`, `codeBlockPlugin`, and `InsertCodeBlock` from `@mdxeditor/editor` in the same file
- [x] 1.3 Memoize the plugin list keyed on `[variant, freeForm]`; conditionally prepend `headingsPlugin()` and `codeBlockPlugin()` when `freeForm` is true; pass the memoized list to `<MDXEditor plugins={…} />`
- [x] 1.4 Extend `ToolbarContents` to accept the new `freeForm` prop; render `<InsertCodeBlock />` after `ListsToggle` in the block toolbar when `freeForm` is true; keep the inline toolbar identical

## 2. Cover letter dialog wiring

- [x] 2.1 Pass `freeForm` on the `MarkdownEditor` instance inside `ApplicationLetterEditDialog` (`apps/web/src/components/applications/application-letter-edit-dialog.tsx`); no other changes

## 3. Test updates

- [x] 3.1 Extend the `@mdxeditor/editor` mock in `apps/web/src/components/cv/markdown-editor-impl.test.tsx` with `headingsPlugin`, `codeBlockPlugin`, and an `InsertCodeBlock` toolbar button stub
- [x] 3.2 Make the existing `BlockToolbar` stub accept a `withInsertCodeBlock` flag so the mock renders `InsertCodeBlock` exactly when the plugin list contains `codeBlockPlugin`
- [x] 3.3 Add a `freeForm mode (cover letter, job description)` describe block with tests for: 10 plugins when `freeForm` is true; `InsertCodeBlock` rendered when `freeForm` is true; `InsertCodeBlock` omitted when `freeForm` is false; inline toolbar unchanged when `freeForm` is true
- [x] 3.4 Update the `MarkdownEditor` mock in `apps/web/src/components/applications/application-letter-edit-dialog.test.tsx` to track the `freeForm` prop it receives (history array + `data-free-form` attribute on the stub element)
- [x] 3.5 Add a test asserting the cover letter dialog seeds the editor with `## Some heading\nSome text` unchanged, plus a test asserting the dialog passes `freeForm=true` on the `MarkdownEditor` instance

## 4. Verification

- [x] 4.1 Run `pnpm --filter @resubuild/web test -- --run` — all web unit tests pass (21 tests across `markdown-editor-impl.test.tsx` and `application-letter-edit-dialog.test.tsx`)
- [x] 4.2 Run `pnpm --filter @resubuild/web typecheck` — `tsc --noEmit` clean
- [x] 4.3 Run `pnpm --filter @resubuild/web lint` (Biome) and Prettier `--check` on the touched files — both clean

## E2E test impact

**Must pass unchanged** — this change is web-only and does not modify the Nest API surface, the Supabase schema, the seed fixtures, or the auth flow. The cover-letter editor continues to call `PATCH /applications/:id` (the same endpoint the existing E2E suite exercises). The fix changes the editor's client-side plugin list and toolbar so `## heading` markdown renders correctly; it does not change the saved JSON shape or any server-rendered HTML. No E2E specs require updates or additions.
