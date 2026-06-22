## 1. Override the CodeMirror wrapper chrome

- [x] 1.1 In `apps/web/src/app/globals.css`, add a `.rich-text-editor .mdxeditor [class*='_codeMirrorWrapper']` rule that sets `border: 1px solid hsl(var(--border) / 0.4)`, `border-radius: 0.25rem`, `padding: 0`, `margin-bottom: 0.75rem`, and `overflow: hidden` (all `!important`) so the wrapper matches the dashboard chrome language instead of the bundled MDXEditor defaults.

## 2. Make the code area gray

- [x] 2.1 In the same file, add a `.rich-text-editor .mdxeditor .cm-editor, .rich-text-editor .mdxeditor .cm-content` rule that sets `background-color: hsl(var(--muted) / 0.45) !important` so the code area reads as a distinct gray-tinted surface instead of the bundled pure white.

## 3. Restyle the line-number gutter

- [x] 3.1 In the same file, add a `.rich-text-editor .mdxeditor .cm-gutters` rule that sets `background-color: transparent`, `border-right: 1px solid hsl(var(--border) / 0.35)`, `padding-right: 0.5rem`, and `min-width: 2rem` (all `!important`) so the gutter reads as a thin transparent rail with a divider instead of the bundled tinted column.
- [x] 3.2 In the same file, add a `.rich-text-editor .mdxeditor .cm-lineNumbers .cm-gutterElement` rule that sets `display: flex`, `align-items: center`, and `justify-content: flex-end` (all `!important`) so the line-number digit is vertically centered in its row instead of sitting at the top.

## 4. Verification

- [x] 4.1 Run `pnpm exec prettier --check apps/web/src/app/globals.css` — formatting clean.
- [x] 4.2 Run `pnpm --filter @resubuild/web typecheck` — no TS errors (CSS-only change; trivially passes).

## E2E test impact

None — UI-only change inside an existing component. No `apps/web/e2e` selectors or scenarios reference the MDXEditor code block chrome; the change is verifiable by opening a `freeForm` editor (cover letter or job description) and inserting a code block through the `InsertCodeBlock` toolbar action.
