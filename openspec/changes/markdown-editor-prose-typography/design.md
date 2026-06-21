## Context

`apps/web/src/components/cv/markdown-editor-impl.tsx` exports `MarkdownEditorImpl`, the shared wrapper around `@mdxeditor/editor` used by every markdown-authored form field in the dashboard: Basics summary, Work summary/description, Volunteer summary, Project description, Award summary, Publication summary, Reference text, the cover letter editor (in `freeForm` mode), and the long-form job description on the Prepare Application page. The wrapper exposes a `variant: 'inline' | 'block'` prop; the inline variant renders inside `<li>` highlight bullets and nested-string titles, the block variant renders long-form prose.

The wrapper forwards a `contentEditableClassName` prop to the underlying `MDXEditor`. Today, the inline variant passes `mdxeditor-content--inline` and the block variant passes nothing. The block variant's editable region is the DOM element with `aria-label="editable markdown"`, and because no typography rules are layered on it, headings, ordered/unordered lists, links, blockquotes, code blocks, and tables authored inside the editor render at body-text size with no list markers, no heading scale, and no blockquote rule.

The companion read-only renderer `apps/web/src/components/cv/markdown-view.tsx` was just updated by the `markdown-view-prose-typography` change to layer `prose prose-sm max-w-none` (from `@tailwindcss/typography`) onto its block variant. The plugin is already a dev dependency (`@tailwindcss/typography@^0.5.20`) and is already registered in `apps/web/src/app/globals.css` via `@plugin '@tailwindcss/typography';`. The block editor and the block view now need the same typography layering so the editing experience and the read-only preview agree on what a heading or a bullet list looks like.

## Goals / Non-Goals

**Goals:**

- Layer `prose prose-sm max-w-none` onto the block variant of `MarkdownEditorImpl`'s `contentEditableClassName` so the editable region (the element with `aria-label="editable markdown"`) renders headings, ordered/unordered lists, links, blockquotes, code blocks, and tables at the same typography scale as the read-only `MarkdownView` block preview.
- Keep the inline variant unchanged: it must keep the `mdxeditor-content--inline` marker and remain prose-free because it renders inside `<li>` highlight bullets where prose-grade spacing would break the existing CV list layout (the same trade-off the `markdown-view-prose-typography` change made for the read-only inline variant).
- Pin the new contract with a colocated test so a future regression that drops the prose classes on the block variant fails CI.

**Non-Goals:**

- No change to the `MarkdownEditorImpl` API: callers continue to pass `value`, `onChange`, `variant`, `placeholder`, `className`, and `freeForm` exactly as before. The prose layering is internal to the component.
- No change to the inline variant's `contentEditableClassName` (`mdxeditor-content--inline`).
- No change to `MarkdownView`, the read-only renderer: it was already updated by the `markdown-view-prose-typography` change and continues to own its own prose layering independently.
- No change to the MDXEditor plugin list, the toolbar presets, the `freeForm` opt-in, the `setMarkdown` ref, the toolbar styling rules in `globals.css` (`.rich-text-editor [class*='_toolbarRoot']` etc.), or the override rules in `globals.css` for `.rich-text-editor .mdxeditor p` / `ul` / `li` / `blockquote` / `a`. Those rules remain in place and continue to win the cascade at equal specificity (the project source emits after Tailwind's generated utility CSS in the same cascade layer).
- No new CSS, no new color remap, no new token. The existing `.markdown-view` color remap from the `markdown-view-prose-typography` change is scoped to `.markdown-view` and does not affect the editor; the editor inherits the same `--tw-prose-*` defaults the plugin defines globally, which is acceptable because the editable region is always wrapped by application chrome that already provides a high-contrast surface.
- No new dependencies. `@tailwindcss/typography` is already installed and registered.

## Decisions

### D1. Layer `prose prose-sm max-w-none` on the block variant only

In `apps/web/src/components/cv/markdown-editor-impl.tsx`, the `contentEditableClassName` expression becomes:

```ts
contentEditableClassName={cn(
  variant === 'inline' && 'mdxeditor-content--inline',
  variant === 'block' && 'prose prose-sm max-w-none',
)}
```

This mirrors the precedent set by `MarkdownView` (`apps/web/src/components/cv/markdown-view.tsx`), which already layers the same three classes on its block variant wrapper. The same `cn(...)` expression handles both variants in a single call, keeping the change mechanical and the diff small.

**Why this combination:**

- `prose` is the plugin entry point that registers headings, lists, links, blockquotes, tables, code blocks, and preformatted code.
- `prose-sm` matches the existing `.rich-text-editor .mdxeditor` `font-size: 0.875rem` baseline in `globals.css` (line 200). Without `prose-sm`, prose would default to `1rem` and the editor body would render slightly larger than the rest of the CV editor chrome.
- `max-w-none` strips the plugin's default 65ch cap. The editor's editable region is rendered inside the form chrome and fills the available width; without `max-w-none`, long lines would wrap prematurely inside narrow inputs (e.g. the Job description field on the Prepare Application page).

**Alternatives considered:**

- Apply `prose` to the inline variant as well: rejected — the inline variant is sized for `<li>` bullets where prose spacing (`margin-block: 1.14286em`, list padding `1.57143em`, etc.) would push bullets apart and break the existing CV list layout. The same trade-off was made for the read-only `MarkdownView` inline variant.
- Hand-roll heading/list/blockquote rules in `globals.css` for `.rich-text-editor .mdxeditor`: rejected — duplicates work the plugin already does, and would drift from the rest of the Tailwind ecosystem. The existing `.rich-text-editor .mdxeditor p` / `ul` / `li` / `blockquote` / `a` overrides in `globals.css` already use this hand-rolled approach and they only cover paragraph, list, blockquote, and link — not headings. Layering `prose` fills the gap without inventing new rules.
- Apply `prose` at a different DOM layer (e.g. the outer `.rich-text-editor` wrapper instead of the inner `contentEditableClassName`): rejected — MDXEditor does not let the outer wrapper see the rendered markdown content; only `contentEditableClassName` reaches the editable region. The precedent change applied the same way.

### D2. Reuse the already-installed `@tailwindcss/typography` plugin

`@tailwindcss/typography@^0.5.20` is already a dev dependency in `apps/web/package.json` and is already registered in `apps/web/src/app/globals.css` via `@plugin '@tailwindcss/typography';` (registration landed in the `markdown-view-prose-typography` change). The editor fix relies on the existing registration — no new `@plugin` directive, no new dependency, no lockfile change.

### D3. Do not re-introduce a `.rich-text-editor` color remap

The read-only `MarkdownView` block variant remaps `--tw-prose-*` and `--tw-prose-invert-*` inside `.markdown-view` so the plugin's hardcoded palette follows the project's design tokens in both light and dark mode. The editor fix does NOT replicate that remap inside `.rich-text-editor`. The editable region lives inside a white-background input chrome (`.rich-text-editor .mdxeditor [contenteditable='true'] { background-color: white !important; }` in `globals.css`), so the plugin's default light-palette text colors remain readable. Introducing a second remap would duplicate the `MarkdownView` work, leak the design tokens into editor chrome where they are not needed, and complicate the cascade for any future call site that wants `prose` outside `MarkdownView` and `MarkdownEditorImpl`.

### D4. Update the colocated test to pin the new contract

In `apps/web/src/components/cv/markdown-editor-impl.test.tsx`, the existing test that asserted the block variant's `data-content-class` was the empty string is renamed and reasserted to check for `prose prose-sm max-w-none`. The mock `MDXEditor` already exposes `data-content-class` as a debugging seam, so the assertion maps directly to the rendered class list. The existing inline-variant test (`applies inline contentEditable class for inline variant`) is left unchanged so the inline contract continues to be pinned independently.

## Risks / Trade-offs

- **[Risk] `prose` adds paragraph margin (`margin-top/bottom: 1.14286em` at `prose-sm`) that may conflict with the existing `.rich-text-editor .mdxeditor p { margin-block: 0.25em }` override in `globals.css`.** → Mitigation: equal-specificity selectors (`.prose p` vs `.rich-text-editor .mdxeditor p`) resolve by source order. The project's `.rich-text-editor .mdxeditor p` rule is emitted by the application source, which sits after the generated Tailwind utility CSS in the same cascade layer, so the override wins. The same cascade reasoning already applies to the read-only `MarkdownView` block variant and was verified visually during that change.
- **[Risk] The new `prose` classes might bleed into the inline variant by mistake.** → Mitigation: the `cn(...)` expression guards the prose classes on `variant === 'block'` only, and the existing inline-variant test continues to assert that the inline variant's `data-content-class` is `mdxeditor-content--inline` (no `prose` token present). A future regression that drops the block guard fails both the new test and the existing inline test.
- **[Risk] `prose-sm` heading scale may render headings too small inside the block editor.** → Mitigation: `prose-sm` matches the existing `.rich-text-editor .mdxeditor` `font-size: 0.875rem` baseline that the application already enforces, and the plugin's `prose-sm` heading scale is designed for compact density. The cover letter editor and every CV-section editor now render `## Heading` at the same scale the read-only `MarkdownView` block preview already uses.
- **[Risk] `max-w-none` removes prose's 65ch reading-width cap, normally a typography best practice.** → Mitigation: the editor's editable region is rendered inside a form input that already constrains its width to the parent form chrome. The 65ch cap would conflict with the project's existing input layout (e.g. the Job description field on the Prepare Application page). The same `max-w-none` was applied to the read-only `MarkdownView` block variant for the same reason.
- **[Trade-off] Block editors now render with the typography plugin's default color palette inside the editable region (no `.rich-text-editor` color remap).** → Acceptable: the editable region is always wrapped by a white-background input chrome, and the plugin's default light-palette text colors remain readable against that surface. Adding a second color remap inside `.rich-text-editor` would duplicate the `MarkdownView` work without a concrete readability win.

## Migration Plan

No data migration. No backend change. No new dependency. The fix ships as a single class change to the editor wrapper's `contentEditableClassName` and a one-line update to the colocated test.

The existing `pnpm verify` (format:check, Biome lint, typecheck, `pnpm test -- --run`, build) exercises the change. The visual regression surface is every block markdown field in the dashboard: Basics summary, Work summary/description, Volunteer summary, Project description, Award summary, Publication summary, Reference text, the cover letter editor, and the Job description field on Prepare Application. Each is verifiable by typing `## Heading` into the editor and confirming it renders at the same scale the read-only `MarkdownView` block preview already shows.

**Rollback:** revert the change. The block editor falls back to body-text rendering for headings and other prose elements, matching the pre-change behavior. The `@tailwindcss/typography` plugin registration remains in place and continues to support the read-only `MarkdownView` block variant. No data is lost.

## Open Questions

None — the fix is local, the affected capability (`cv-editor-ui`) is well-bounded, and the existing test patterns cover the new contract.
