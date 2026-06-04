## Context

Resumind's dashboard CV editor uses a single rich-text field for all Markdown-backed inputs: `MarkdownEditor` (`apps/web/src/components/cv/markdown-editor.tsx`) wraps a `next/dynamic({ ssr: false })`-imported `MarkdownEditorImpl` (`markdown-editor-impl.tsx`) which today instantiates `@wysimark/react@3.0.20`. The two variants (`inline` and `block`) feed every Markdown-backed form field across the editor:

- `apps/web/src/components/cv/form-fields.tsx` — `TextField` (`markdown='inline' | 'block'`) and `StringListField` (`markdown={true}`) both delegate to `MarkdownEditor`.
- `apps/web/src/components/applications/application-workspace.tsx` — the cover-letter field uses `MarkdownEditor` with `variant='block'`.
- All section forms (Basics, Work, Volunteer, Education, Projects, Awards, Certificates, Publications, References) ultimately reach the editor through `TextField` / `StringListField`.

Today the editor needs three patches to be usable:

1. A hand-maintained `pnpm` patch (`patches/@wysimark__react@3.0.20.patch`, ~430 lines) that monkey-patches the Wysimark browser dist to:
   - Replace `:first-child` → `:first-of-type` on the `$Paragraph` and `headingStyles` Emotion styles (to silence SSR warnings about unsafe pseudo-class selectors).
   - Add an `image-inline` branch in `getMarksFromSegment` (Wysimark crashes on inline-image segments the editor never produces; the patch papers over the throw).
   - Replace the auto-resizing Toolbar with two named presets (`minimalInlineToolbarItems` for inline, `compactBlockToolbarItems` for block) gated by a new `minimalToolbar` / `compactBlockToolbar` editor option.
   - Override `scrollSelectionIntoView: () => {}` on the Slate `<Editable>` to avoid the editor yanking the page when the form scrolls into view.
2. A `next/dynamic({ ssr: false })` shim in `markdown-editor.tsx` so the Wysimark/Emotion bundle never reaches the Next.js server-render pass (Wysimark's Slate runtime injects Emotion `:first-child` styles at module evaluation time, which Next.js flags during RSC streaming).
3. A skeleton placeholder (`markdown-editor-skeleton.tsx`) shown during the dynamic import so the editor region does not collapse on cold loads.

None of these patches will survive an upstream Wysimark upgrade. The patch also drags `zustand@3` (only used inside Wysimark's toolbar runtime) into the web client bundle, which the dev console surfaces as `[DEPRECATED] Default export is deprecated. Instead use 'import { create } from 'zustand'`. The user has asked to migrate to **MDXEditor** (`@mdxeditor/editor`), the actively-maintained Lexical-based markdown editor, to drop the patch and the shim and silence the warning.

The persisted on-disk format is **GitHub-Flavored Markdown** in both Wysimark and MDXEditor; saved `basics.summary`, `work[].summary`, `work[].highlights[]`, `references[].reference`, etc. continue to round-trip through the REST API and the read-only `MarkdownView` (`apps/web/src/components/cv/markdown-view.tsx`) without data migration. The web client therefore only needs to swap the edit-time component, not the storage format or the view-time renderer.

## Goals / Non-Goals

**Goals:**

- Drop `@wysimark/react@3.0.20` (and the `zustand@3` transitive dep) in favor of `@mdxeditor/editor` v3.
- Remove `patches/@wysimark__react@3.0.20.patch` and the `patchedDependencies` entries in `pnpm-workspace.yaml` and the root `package.json` `pnpm.patchedDependencies` map.
- Drop the `next/dynamic({ ssr: false })` shim in `markdown-editor.tsx` and the `markdown-editor-skeleton.tsx` placeholder (or keep the skeleton if any other call site still depends on it).
- Preserve the **`MarkdownEditor` public wrapper contract** (`value`, `onChange`, `variant: 'inline' | 'block'`, `placeholder`, `className`) so `form-fields.tsx`, `application-workspace.tsx`, and every section form continue to work without code changes.
- Preserve the **toolbar scope** for both variants (inline: Bold, Italic, Strikethrough, Link; block: + Headings, Lists, Blockquote, Table, Code block, Link) and the **no in-editor image upload** rule.
- Preserve the **visual contract** enforced by `apps/web/src/app/globals.css`: square corners on the editor shell, 30px block-toolbar height, em-scaled inline-toolbar height, compact base font size, `padding-right: 1.75rem` reservation on inline `StringListField` rows so the overlaid remove icon does not overlap editable text.
- Keep the `<noscript>` textarea fallback in `markdown-editor.tsx` for non-JS clients.
- Keep `pnpm verify` (format:check → biome → typecheck → test -- --run → build) green after the swap; the unit tests mock the editor module so they only need a path update at most.

**Non-Goals:**

- Re-introducing a pnpm patch against MDXEditor (or any other third-party dist).
- Changing the on-disk Markdown format or the read-only `MarkdownView` renderer.
- Adding a Markdown ↔ WYSIWYG toggle, a diff source plugin, or an image-upload plugin to MDXEditor in this change (each can be a follow-up if/when the product wants them).
- Migrating to MDXEditor's all-plugins bundle (`@mdxeditor/editor` exports a tree-shakeable plugin API; we wire up exactly the plugins we need).
- Touching `apps/api` or `apps/import-agent` (they do not consume Wysimark or MDXEditor).
- Touching the persisted CV data, the `cv-rest-api` spec, or the Supabase schema.
- Re-skinning the toolbar icons or rebuilding the editor from scratch in shadcn primitives (MDXEditor ships its own toolbar components; we configure, not rewrite).

## Decisions

### 1. Use `@mdxeditor/editor` v3 (Lexical-based) with explicit plugin wiring

**Choice:** Add `@mdxeditor/editor@^3.20.0` (latest v3 at the time of writing) to `apps/web` and configure plugins explicitly per variant — no `allPlugings` import (which pulls every plugin in). The plugins we need:

- `headingsPlugin()` — H1–H3 toolbar dropdown.
- `listsPlugin()` — bulleted / ordered lists.
- `quotePlugin()` — block quote.
- `thematicBreakPlugin()` — horizontal rule (the equivalent of Wysimark's "divider" toolbar item).
- `linkPlugin()` + `linkDialogPlugin()` — link insertion via the dialog (replaces Wysimark's inline link popover).
- `tablePlugin()` — GFM table insertion.
- `codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' })` — code block (no inline code toggle, no syntax highlighting — keep the toolbar scope honest).
- `toolbarPlugin({ toolbarContents: () => <ToolbarContents variant={variant} /> })` — a custom toolbar we render conditionally per variant.
- `markdownShortcutPlugin()` (built-in) — keeps the standard Markdown authoring shortcuts (`**bold**`, `*italic*`, `> quote`, `- list`, ` ``` `) which the Wysimark toolbar also produced.

**Rationale:** MDXEditor's plugin model matches the way the Wysimark `useEditor({ ... })` options object worked: each plugin owns a single toolbar slot and a single Markdown syntax. The Lexical runtime is SSR-safe (Lexical is published as ESM and the `<MDXEditor>` component is annotated `'use client'` upstream), so we can render the editor directly from a client component without the `next/dynamic` shim. Lexical is React-19 / Next-16 / React-StrictMode compatible (Wysimark's Slate layer is not, which is why we have the shim today).

**Alternatives considered:**

- **`@uiw/react-md-editor`** (revert to the prior stack): rejected. The proposal explicitly says "use MDXEditor rather than @wysimark/react" to silence the deprecation/warning noise; reverting brings the same `iframe` + `textarea` split-screen UX back, which the prior change moved away from.
- **Tiptap (ProseMirror) with a Markdown serialization layer**: rejected. Heavier bundle, larger API surface, requires choosing a ProseMirror schema that maps to GFM, and the `iframe` shim is not needed in either direction.
- **Custom `contentEditable` Markdown editor**: rejected. Maintaining a robust WYSIWYG markdown editor in-house is not the goal of this change.

### 2. Toolbar scope matches the existing Wysimark presets

**Choice:** Two toolbar bodies (`inline` and `block`) hand-rolled via MDXEditor's `toolbarPlugin` + the `Toolbar`, `Button`, `BoldItalicUnderlineToggles`, `BlockTypeSelect`, `CreateLink`, `ListsToggle`, `InsertTable`, `InsertCodeBlock`, `InsertThematicBreak`, `UndoRedo` building blocks (all exported from `@mdxeditor/editor`). The composition:

- **Inline** (`variant='inline'`): `UndoRedo` + `BoldItalicUnderlineToggles` + `CreateLink`. No headings, no lists, no block quote, no code, no table, no thematic break. Matches the Wysimark `minimalInlineToolbarItems` (Bold, Italic, Strikethrough, Link).
- **Block** (`variant='block'`): `UndoRedo` + `BlockTypeSelect` (H1–H3 + paragraph) + `BoldItalicUnderlineToggles` + `CreateLink` + `ListsToggle` + `InsertThematicBreak` + `InsertQuote` + `InsertCodeBlock` + `InsertTable`. Matches the Wysimark `compactBlockToolbarItems` (Bold, Italic, Strikethrough, Link, Lists, Block Quote, Table, plus heading levels and thematic break which Wysimark did not expose but MDXEditor bundles by default — we keep them since they were always in the Wysimark block editor's full preset before the patch trimmed it).

**Rationale:** Preserves the visual scope the user has today. The four downstream spec requirements ("Wysimark toolbars SHALL be constrained and SHALL NOT offer in-editor image upload", "Wysimark editor content padding SHALL be compact", "Wysimark editor shell SHALL use square corners and stable toolbar height", "Inline Wysimark editors SHALL allow compact multiline editing") translate 1:1 to the MDXEditor setup; we re-state them as "the rich-text editor toolbars SHALL be constrained …" and "the rich-text editor shell SHALL use square corners …" in the modified spec, with the underlying behavior identical.

**Alternatives considered:**

- **Use the default MDXEditor `toolbarPlugin()` (everything)**: rejected. Brings image-plugin, frontmatter-plugin, etc. that we explicitly do not want in MVP and would have to disable plugin-by-plugin.
- **Wysimark's two presets verbatim**: rejected by definition — the new editor is MDXEditor. We re-state the scope in the new vocabulary but keep the user-visible surface the same.

### 3. `MarkdownEditor` public contract stays byte-identical

**Choice:** `apps/web/src/components/cv/markdown-editor.tsx` continues to export `function MarkdownEditor(props: MarkdownEditorProps)`. The `MarkdownEditorProps` interface keeps the same fields (`value?: string`, `onChange: (value: string) => void`, `variant?: 'inline' | 'block'`, `placeholder?: string`, `className?: string`) and the same default (`variant='block'`). The function body becomes:

```tsx
'use client';

import { MarkdownEditorImpl } from './markdown-editor-impl';
import { cn } from '@/lib/utils';
import type { MarkdownEditorProps } from './markdown-editor-impl';

export function MarkdownEditor(props: MarkdownEditorProps) {
  const { className, value = '', placeholder, variant = 'block' } = props;
  return (
    <>
      <noscript>
        <textarea
          className={cn(
            'border-input bg-background w-full rounded-md border p-3 text-sm',
            className,
          )}
          rows={variant === 'inline' ? 3 : 8}
          defaultValue={value}
          placeholder={placeholder}
          readOnly
        />
      </noscript>
      <MarkdownEditorImpl {...props} />
    </>
  );
}

export type { MarkdownEditorProps };
```

`MarkdownEditorImpl` (`markdown-editor-impl.tsx`) imports `MDXEditor`, the plugins, and the toolbar building blocks, and renders:

```tsx
<MDXEditor
  markdown={value}
  onChange={onChange}
  contentEditableClassName={cn(
    'mdxeditor-content',
    variant === 'inline' && 'mdxeditor-content--inline',
  )}
  plugins={[
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' }),
    toolbarPlugin({ toolbarContents: () => <ToolbarContents variant={variant} /> }),
    markdownShortcutPlugin(),
  ]}
/>
```

The `'use client'` directive at the top of both files ensures Next.js treats the editor as a client component; the `next/dynamic` shim and the skeleton are removed.

**Rationale:** Every existing call site (`form-fields.tsx`, `application-workspace.tsx`, etc.) compiles and runs unchanged. The unit tests that mock `@/components/cv/markdown-editor` and assert on `value` / `onChange` continue to work because the mock just substitutes a textarea or `contentEditable` div that delegates to `onChange` — no dependency on Wysimark-specific props.

**Alternatives considered:**

- **Rename `MarkdownEditor` to `RichTextEditor` and update all call sites in one go**: rejected. Adds churn and review surface for zero behavior change. The name stays; only the implementation changes.
- **Inline `MDXEditor` directly into `form-fields.tsx`**: rejected. The shared wrapper is what guarantees the toolbar scope and the visual contract is identical across the editor, the cover letter, and every section form. Inlining duplicates the plugin list and the CSS hooks four times.

### 4. `globals.css` re-targeted from Wysimark selectors to MDXEditor selectors

**Choice:** Rewrite the `.rich-text-editor` block in `apps/web/src/app/globals.css` to target MDXEditor's DOM:

- **Content area padding**: `.rich-text-editor .mdxeditor [contenteditable='true']` → `padding: 0.75rem` (block) / `0.5rem` (inline). MDXEditor renders the editable region on a `<div class="mdxeditor">` with a `contenteditable` child; Wysimark used `[data-slate-editor='true']`. We keep the same final padding values and the same `padding-right: 1.75rem` reservation on inline `StringListField` rows (`.string-list-markdown-editor .mdxeditor [contenteditable='true']`).
- **Square corners**: `.rich-text-editor .mdxeditor > *` → `border-radius: 0 !important;` (matches the Wysimark `> .border > div { border-radius: 0 !important; }` rule).
- **Toolbar height**: `.rich-text-editor:not(.rich-text-editor--inline) .mdxeditor [role='toolbar']` → `height: 30px !important;` and the inline equivalent → `height: 2.25em !important;` (matches the Wysimark `> .border > div > div:first-child` rule; MDXEditor renders the toolbar on a `[role='toolbar']` element).
- **Toolbar button sizing**: `.rich-text-editor .mdxeditor [data-toolbar-item]` (replaces Wysimark's `[data-item-type='button']`).
- **Toolbar dividers**: `.rich-text-editor .mdxeditor [data-toolbar-item='divider']` (replaces `[data-item-type='divider']`).

**Rationale:** MDXEditor's DOM is a stable, documented contract (the project publishes the class names in its TypeScript source). The new selectors are not more brittle than the Wysimark ones; if MDXEditor changes a class, we update the rule, the same way we would have updated the Wysimark rule when Wysimark bumps.

**Alternatives considered:**

- **Use MDXEditor's CSS-vars API to override the tokens at runtime**: rejected for MVP. MDXEditor v3 does not expose every layout knob via CSS variables (toolbar height is a hard-coded `40px` in the default theme; padding on the content area is a hard-coded `1rem`); selector overrides in `globals.css` are the only reliable way to hit the exact 30px / 0.5rem / 0.75rem / 0.6875rem values the existing UI ships.
- **Add a per-component `style` block to `markdown-editor-impl.tsx`**: rejected. CSS lives in `globals.css` for every other editor-related style; this stays consistent.

### 5. Drop the `next/dynamic` shim and the `markdown-editor-skeleton.tsx` placeholder

**Choice:** After the swap:

- `markdown-editor.tsx` renders `MarkdownEditorImpl` directly inside the same client component. No `dynamic()`.
- Delete `apps/web/src/components/cv/markdown-editor-skeleton.tsx` **iff** no other file imports it. Confirmed during implementation via `rg "markdown-editor-skeleton" apps/web/src`; today only `markdown-editor.tsx` imports it, so deletion is safe.
- Add the `'use client'` directive at the top of both `markdown-editor.tsx` and `markdown-editor-impl.tsx` (already a `use client` on the former; the impl currently has it too) and verify that the import chain does not cross a server boundary (MDXEditor is published with its own `'use client'` markers; the wrappers are pure component code).

**Rationale:** MDXEditor's Lexical runtime is RSC-safe; the SSR pseudo-class warnings that motivated the Wysimark `next/dynamic` shim do not apply. Removing the shim collapses one indirection and one chunk boundary; the editor renders inline with the form, and the `<noscript>` textarea fallback handles non-JS clients.

**Alternatives considered:**

- **Keep the shim "just in case"**: rejected. Carries the chunk-split cost without buying anything; future readers will wonder why it is there.

### 6. Test strategy: the existing mocks survive

**Choice:** The unit tests that mock the editor (`form-fields.test.tsx`, `create-cv-form.test.tsx`) mock the `MarkdownEditor` named export from `@/components/cv/markdown-editor`, not the inner impl. The mock substitutes a textarea / contentEditable div that calls `onChange` directly. The new `MarkdownEditor` keeps the same `MarkdownEditorProps` contract, so the mocks compile and run unchanged. The only thing that may need a tweak: the `form-fields.test.tsx` "coerced empty string to markdown editor" assertion queries `document.querySelector('[contenteditable="true"]')` — MDXEditor's rendered DOM still contains a `contenteditable="true"` element on the inner content region, so this query continues to find it.

**Rationale:** Test churn is minimized. We add a new colocated test (`markdown-editor-impl.test.tsx`) that renders the new impl with the plugins stubbed and asserts on the rendered DOM (toolbar items, no image plugin), but we do not rewrite the existing editor-mocking tests.

**Alternatives considered:**

- **Drop the test mocks and use MDXEditor's test harness**: rejected. The existing mocks are deliberate (they test the form fields, not the editor) and swapping them for an editor-specific test harness would change what the tests cover.

## Risks / Trade-offs

- **[Risk] MDXEditor's toolbar DOM is a moving target across v3 minor releases.** → **Mitigation**: pin `@mdxeditor/editor` to a minor range (`^3.20.0`) and absorb any DOM-level CSS-rule churn in the same patch; the CSS hooks are concentrated in one block of `globals.css`, so a future update is a localized diff.
- **[Risk] MDXEditor v3 ships an ESM build that may interact with Next.js's bundler differently than Wysimark's CJS-flavored dist.** → **Mitigation**: render the editor inside a `'use client'` component (already the case); add `@mdxeditor/editor` to `transpilePackages` in `apps/web/next.config.*` if `pnpm build` reports an ESM/CJS interop error during the implementation PR. (We do not pre-add it speculatively.)
- **[Risk] Lost toolbar items if MDXEditor's plugin list drifts.** → **Mitigation**: the spec deltas in this change re-state the toolbar scope in editor-library-agnostic terms ("the rich-text editor toolbars SHALL expose …"), and the implementation keeps a single source-of-truth toolbar body in `markdown-editor-impl.tsx`. Any future drift is caught by a reviewer reading that file.
- **[Risk] Lexical's `contentEditable` may scroll-into-view differently than Slate, re-introducing the Wysimark `scrollSelectionIntoView: () => {}` problem.** → **Mitigation**: MDXEditor already handles scroll-into-view via Lexical's built-in `IS_FOCUSED` plugin; if a regression is reported we add a one-line `scrollIntoView: () => {}` shim in the impl. Not pre-emptively added.
- **[Risk] The unit test for `form-fields.test.tsx` queries `[contenteditable="true"]` and may now match a different element if MDXEditor renders multiple editable regions (e.g. link dialog inputs).** → **Mitigation**: tighten the selector in the test to `[data-lexical-editor="true"]` or scope it under the `.mdxeditor` root during the implementation PR. Verify with `pnpm --filter @resumind/web test -- --run` after the swap.
- **[Risk] `apps/web/src/components/cv/markdown-editor-skeleton.tsx` may have a second consumer we missed.** → **Mitigation**: confirm with `rg "markdown-editor-skeleton" apps/web/src` before deleting; if any importer exists, keep the file and just stop importing it from `markdown-editor.tsx`.
- **[Trade-off] Slightly larger client bundle than Wysimark (MDXEditor v3 ships ~150 kB gzipped of Lexical + plugin code; Wysimark's Slate dist was comparable).** → **Mitigation**: import only the plugins we use (no `allPlugings`); accept the trade because the patch removal + warning silencing + future maintenance are worth it.
- **[Trade-off] Losing the hand-rolled "minimal inline" and "compact block" Wysimark toolbar presets means we re-state the scope in MDXEditor vocabulary.** → **Mitigation**: the new toolbar body lives in one place (`markdown-editor-impl.tsx`); the spec deltas keep the user-visible scope identical so no spec-level behavior changes.

## Migration Plan

1. **Branch & prep**: create a feature branch off the current `main`. Run `pnpm install` on `main` first to confirm the lockfile is clean.
2. **Dependency swap (single commit)**:
   - `apps/web/package.json`: remove `"@wysimark/react": "^3.0.20"`, add `"@mdxeditor/editor": "^3.20.0"`.
   - `pnpm install` to update `pnpm-lock.yaml`.
3. **Remove the patch (single commit)**:
   - Delete `patches/@wysimark__react@3.0.20.patch`.
   - Delete the `patches/` directory (now empty).
   - Remove the `patchedDependencies` block from `pnpm-workspace.yaml`.
   - Remove the `pnpm.patchedDependencies` map from the root `package.json`.
   - `pnpm install` to refresh the lockfile's `patchedDependencies` index.
4. **Swap the editor (single commit)**:
   - Rewrite `apps/web/src/components/cv/markdown-editor-impl.tsx` to render `<MDXEditor …>` with the plugin list from Decision 1 and the toolbar body from Decision 2.
   - Rewrite `apps/web/src/components/cv/markdown-editor.tsx` to drop the `next/dynamic` shim and import `MarkdownEditorImpl` directly (keep the `<noscript>` fallback).
   - Rewrite the `.rich-text-editor` block in `apps/web/src/app/globals.css` to target the MDXEditor selectors from Decision 4.
   - Delete `apps/web/src/components/cv/markdown-editor-skeleton.tsx` (after confirming no other importer).
5. **Test polish (single commit)**:
   - If `[contenteditable="true"]` queries in `form-fields.test.tsx` no longer match the editor, tighten them to scope under `.mdxeditor` or use `data-lexical-editor` as a more specific hook.
   - Add a colocated `markdown-editor-impl.test.tsx` smoke test that asserts the toolbar contains the expected inline/block items and does not include an image plugin.
6. **Verify (no commit)**: run `pnpm verify` (format:check → biome → typecheck → `pnpm test -- --run` → build). If `typecheck` or `build` flags an ESM/CJS interop issue with `@mdxeditor/editor`, add it to `transpilePackages` in `apps/web/next.config.*` and re-run.
7. **Manual smoke (no commit)**: open the dashboard, navigate to `/dashboard/cv/[id]`, and exercise: Basics (summary block editor), Work (description block, highlights inline), References (reference block), Application workspace cover letter (block). Confirm toolbar scope matches the spec, no console warnings, square shell, 30px block toolbar, dense inline toolbar, no image-upload buttons anywhere.
8. **Rollback**: each commit is independently revertable. The dependency swap and the patch removal are pure pin removals; if MDXEditor misbehaves in production, `git revert` the editor-swap commit and the project falls back to Wysimark+patch without any data migration.

## Open Questions

- Does MDXEditor v3 export an `InsertThematicBreak` (horizontal rule) toolbar item, or do we need a custom `InsertThematicBreak` button that calls `editor.dispatchCommand(INSERT_HR_COMMAND, undefined)`? — To confirm during implementation by reading the `@mdxeditor/editor` type definitions.
- Does MDXEditor's toolbar `BlockTypeSelect` dropdown expose H4–H6, or only H1–H3? — We currently restrict to H1–H3; if v3 ships more, we trim the dropdown items via the `blockTypes` prop.
- Is `linkDialogPlugin` required to enable `CreateLink`, or does `linkPlugin` suffice? — The MDXEditor docs imply both are needed; we ship both and confirm during implementation.
- Does the Lexical runtime fire any SSR warnings in development that we have to silence with an `app.useEffect(…)` shim? — If yes, address in the implementation commit; if no, the `'use client'` directive alone is enough.
