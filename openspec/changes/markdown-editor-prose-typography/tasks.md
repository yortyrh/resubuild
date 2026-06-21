## 1. Layer `prose prose-sm max-w-none` on the MarkdownEditor block variant

- [x] 1.1 In `apps/web/src/components/cv/markdown-editor-impl.tsx`, extend the `contentEditableClassName={cn(...)}` expression so the block variant adds `prose prose-sm max-w-none` alongside any existing inline marker
- [x] 1.2 Confirm the inline variant still forwards `mdxeditor-content--inline` only (no `prose` classes)

## 2. Update colocated tests to pin the new contract

- [x] 2.1 In `apps/web/src/components/cv/markdown-editor-impl.test.tsx`, rename the existing `applies empty contentEditable class for block variant` test to assert the block variant's `data-content-class` is exactly `prose prose-sm max-w-none`
- [x] 2.2 Verify the existing `applies inline contentEditable class for inline variant` test still asserts the inline variant's `data-content-class` is `mdxeditor-content--inline` (no `prose` token present)
- [x] 2.3 Run `pnpm --filter @resubuild/web test -- --run src/components/cv/markdown-editor-impl.test.tsx` and confirm all `MarkdownEditorImpl` tests pass

## 3. Verification

- [x] 3.1 Run `pnpm --filter @resubuild/web test -- --run` — all web unit tests pass
- [x] 3.2 Run `pnpm --filter @resubuild/web typecheck` — `tsc --noEmit` clean
- [x] 3.3 Run `pnpm --filter @resubuild/web lint` (Biome) and Prettier `--check` on the touched files — both clean
- [x] 3.4 Spot-check the generated CSS by mounting a block editor on `/dashboard/cv/[id]` (Basics summary) and confirming `## Heading` and bullet lists render at the same scale the read-only `MarkdownView` block preview already shows

## E2E test impact

**Must pass unchanged** — this change is web-only and does not modify the Nest API surface, the Supabase schema, the seed fixtures, the auth flow, the server-rendered cover-letter HTML, the editor plugin list, or the toolbar presets. The change only adds three CSS classes (`prose`, `prose-sm`, `max-w-none`) to the editor's `contentEditableClassName` for the block variant; the underlying DOM structure, the markdown value, the API payload, and every E2E selector that targets the editor's contenteditable region remain identical (the `aria-label="editable markdown"` attribute is unchanged). No E2E specs require updates or additions.
