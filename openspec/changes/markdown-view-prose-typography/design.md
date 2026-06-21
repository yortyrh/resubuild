## Context

`apps/web/src/components/cv/markdown-view.tsx` is a thin wrapper around `react-markdown` + `remark-gfm` + `rehype-sanitize`. It exports two variants: `block` (default) for prose fields and `inline` for highlight bullets and nested-string titles. View styling lives in `apps/web/src/app/globals.css` under `.markdown-view` and `.markdown-view--inline` selectors, hand-tuned for resume-preview density (`font-size: 0.875rem`, `line-height: 1.5`, tight paragraph margins, custom list paddings, indigo link color, etc.).

The hand-tuned set covers paragraphs, lists, links, blockquotes, tables, code blocks, and preformatted code, but it deliberately omits heading styles. The original `markdown-view-rendering` change (`openspec/changes/archive/2026-05-25-markdown-view-rendering/design.md`) explained: "_mirroring compact editor padding without importing full `@tailwindcss/typography` unless already present_". At the time, headings weren't a real authoring surface: the CV editor's `MarkdownEditor` wrapper constrained its plugin list to keep the toolbar tight, and CV section fields didn't accept `## heading` syntax.

The recent `markdown-editor-free-form-mode` change (`openspec/changes/archive/2026-06-20-markdown-editor-free-form-mode/design.md`) added a `freeForm` opt-in that registers `headingsPlugin()` and `codeBlockPlugin()` on the cover-letter editor. A cover letter legitimately contains `## Greeting`, `## Closing`, and section headers; the editor now promotes `## ` into an `<h2>`, but the read-only preview still renders those tags at body-text size because no heading rule lives in `.markdown-view`. This is a visible regression: the editor and the preview disagree on how a heading should look.

Hand-rolling a heading scale would duplicate work that `@tailwindcss/typography` already does, and would miss the link, list, and blockquote defaults the plugin provides for free. The plugin is also Tailwind v4-native — registering via `@plugin '@tailwindcss/typography';` matches the project's existing `@plugin 'tailwindcss-animate';` pattern at the top of `globals.css`.

## Goals / Non-Goals

**Goals:**

- Adopt `@tailwindcss/typography` and layer `prose prose-sm max-w-none` onto the `MarkdownView` block variant so headings, lists, links, blockquotes, tables, and code blocks render with sensible defaults at cover-letter and CV-summary density.
- Keep the inline variant unchanged: it renders inside `<li>` highlight bullets and would break the existing CV list layout if prose spacing were applied.
- Adapt the plugin's hardcoded colors to the project's design tokens so dark-mode previews stay readable (the plugin only adapts via the `prose-invert` variant, which we don't use — the app drives dark mode through `@media (prefers-color-scheme: dark)`).
- Lock the new contract with colocated tests so a future regression that drops the prose classes on the block variant fails CI.

**Non-Goals:**

- No change to the `MarkdownView` API: callers still pass `value`, `variant`, and `className` exactly as before. The prose layering is internal to the component.
- No change to the inline variant (highlight bullets stay tight).
- No change to the MDXEditor wrapper, the cover letter dialog, the editor toolbar, or any server-rendered cover-letter HTML.
- No refactor of the existing `.markdown-view` overrides. The override selectors target nested elements (`.markdown-view p`, `.markdown-view ul`, etc.) with equal specificity but later source position than `.prose p`, so the cascade keeps the project's hand-tuned spacing.
- No introduction of additional typography variants (e.g. `prose-base`, `prose-lg`, `prose-neutral`). The cover letter preview is the only consumer that needs headings sized; `prose-sm` matches the existing `font-size: 0.875rem` and `prose-sm` heading scale reads correctly at compact density.

## Decisions

### D1. Layer `prose prose-sm max-w-none` on the block variant only

In `apps/web/src/components/cv/markdown-view.tsx`, the wrapper's class string becomes:

```text
markdown-view {proseClass} markdown-view--inline? {className}
```

where `proseClass` is `"prose prose-sm max-w-none"` when `variant === 'block'` and the empty string otherwise. `max-w-none` strips the plugin's default `65ch` cap so the cover letter uses the full width of the scrollable tab wrapper (`max-h-[60vh] overflow-y-auto`); without it, long lines would wrap prematurely inside a narrow viewport.

**Why this combination:**

- `prose` is the plugin entry point that registers headings, lists, links, blockquotes, tables, code blocks, and preformatted code.
- `prose-sm` matches the existing `.markdown-view` `font-size: 0.875rem` density. `prose` defaults to `1rem`; without `prose-sm`, the cover letter preview would render slightly larger than the existing CV summary text, breaking visual consistency.
- `max-w-none` is required because the prose plugin's default `max-width: 65ch` would constrain the cover letter to a narrow column inside the wider workspace tab.

**Alternatives considered:**

- Apply `prose` to both block and inline variants: rejected — the inline variant is sized for `<li>` bullets where prose spacing (`margin-block: 1.14286em`, etc.) would push bullets apart and break the existing CV list layout. The inline variant's `.markdown-view--inline` rules (`display: inline`, hidden block-level elements) override prose, but the spacing cascade would still leak.
- Hand-roll heading sizes: rejected — duplicates work the plugin already does, and misses link/list/blockquote defaults. Hand-rolled rules would also drift from the rest of the Tailwind ecosystem over time.
- Apply `prose` only to the cover letter call site (i.e. not via the shared component): rejected — the cover letter and every CV-summary view row need consistent typography; centralizing in `MarkdownView` keeps one source of truth and benefits future call sites for free.

### D2. Use `@tailwindcss/typography@^0.5.20` (Tailwind v4 compatible)

The plugin's v0.5.20 release notes confirm stable Tailwind v4 support, including `prose-invert` and the `not-prose` escape hatch. The project already runs Tailwind v4 (`@tailwindcss/postcss` + `@import 'tailwindcss';` + `@plugin 'tailwindcss-animate';`), so v0.5.20 is the correct major.

**Why pin via `@plugin '@tailwindcss/typography';` in `globals.css`:** matches the existing `@plugin 'tailwindcss-animate';` pattern, keeps Tailwind config in CSS-first form, and avoids resurrecting a JavaScript `tailwind.config.js`.

### D3. Remap `--tw-prose-*` tokens inside `.markdown-view`

The plugin defines its color palette via CSS custom properties (`--tw-prose-body`, `--tw-prose-headings`, `--tw-prose-links`, etc.). The defaults are hardcoded hex / Lab values that don't adapt to dark mode unless `prose-invert` is applied. The project drives dark mode via `@media (prefers-color-scheme: dark)` rather than a `.dark` class, so `prose-invert` is never emitted.

In `apps/web/src/app/globals.css`, two new rule blocks sit immediately after `body { ... }`:

```css
.markdown-view {
  --tw-prose-body: hsl(var(--foreground));
  --tw-prose-headings: hsl(var(--foreground));
  --tw-prose-lead: hsl(var(--muted-foreground));
  --tw-prose-links: hsl(var(--primary));
  /* …and the remaining tokens, each remapped to a project token… */
}

@media (prefers-color-scheme: dark) {
  .markdown-view {
    --tw-prose-invert-body: hsl(var(--foreground));
    /* …and the remaining invert tokens… */
  }
}
```

The rule targets `.markdown-view` (the wrapper that carries both `markdown-view` and `prose`) so the remap is scoped to read-only previews, not other `prose` consumers the project may add later. Because both `.prose { --tw-prose-body: #364153 }` and `.markdown-view { --tw-prose-body: hsl(...) }` declare the same custom property on the same element at the same specificity, the cascade resolves to whichever rule appears later in the source — and the project's `globals.css` is loaded after Tailwind's generated utility layer in the same CSS chunk, so the remap wins.

**Why this scope:** confining the remap to `.markdown-view` means the project's other CSS components (which don't use the plugin) are untouched, and any future `prose` consumer can choose its own token strategy. The dark-mode block is required even though `.markdown-view` already gets light-mode remap, because the plugin's `prose` color tokens (without `prose-invert`) are evaluated against the light palette; remapping only the invert tokens preserves the plugin's intended cascade path.

**Alternatives considered:**

- Use `prose-invert` in dark mode and rely on Tailwind's `dark:` variant: rejected — the project drives dark mode via media query, not a `.dark` class, and Tailwind v4's `dark:` variant would not match without a `prefers-color-scheme` prefix the project doesn't use.
- Apply the remap globally (`:root`): rejected — would leak the project's foreground color into any future consumer of `prose` and conflate the typography plugin's defaults with the brand palette.
- Skip the remap and accept light-on-dark in dark mode: rejected — violates the project's existing accessibility bar (the cover letter is a primary surface).

### D4. Existing `.markdown-view` overrides win the cascade for nested elements

The current `.markdown-view p { margin-block: 0.25em }`, `.markdown-view ul { padding-inline-start: 1.25em }`, `.markdown-view a { color: hsl(244 70% 45%) }`, and friends remain in place. Both `.prose p` and `.markdown-view p` are single-class-plus-element selectors (specificity 0,1,1); because the project source is emitted after Tailwind's generated utility CSS in the same cascade layer, the `.markdown-view` overrides win on equal specificity. This preserves the existing compact density (paragraph margin `0.25em` instead of prose's `1.14286em`, list padding `1.25em` instead of `1.57143em`) while letting prose handle the elements `.markdown-view` doesn't customize (headings, kbd, pre, etc.).

### D5. Test coverage pin

Two new tests in `markdown-view.test.tsx`:

1. Block variant carries `prose`, `prose-sm`, and `max-w-none` on the wrapper element.
2. Inline variant does NOT carry any of `prose`, `prose-sm`, `max-w-none`.

Both use `classList.contains(...)` against the wrapper element. Existing tests already cover `markdown-view` / `markdown-view--inline` presence, so the new tests are additive — no risk of breaking the existing class-presence assertions.

## Risks / Trade-offs

- **[Risk] `prose` adds paragraph margin (`margin-top/bottom: 1.14286em` at `prose-sm`) that conflicts with the existing `.markdown-view p { margin-block: 0.25em }` override.** → Mitigation: equal-specificity selectors resolve by source order; the project's `.markdown-view p` rule appears later in the same CSS chunk, so the override wins. Verified visually during implementation and in the generated CSS.
- **[Risk] Headings inside a `surface-soft` workspace card (cover letter tab) need to keep the heading color readable.** → Mitigation: `--tw-prose-headings` remap uses `hsl(var(--foreground))`, which is the project's high-contrast text color in both light and dark mode.
- **[Risk] Future call sites that want `prose` outside `MarkdownView` (e.g. a help page) would inherit the `.markdown-view` color remap.** → Mitigation: the remap is scoped to `.markdown-view`, not a global `:root` rule. A future standalone `prose` consumer is unaffected.
- **[Risk] `max-w-none` removes prose's 65ch reading-width cap, which is normally a typography best practice.** → Mitigation: the cover letter preview lives inside a scrollable container with `max-h-[60vh]`. Long lines already wrap inside the tab wrapper's natural width. The cap would also conflict with the project's existing CV preview rows, which deliberately use the full width.
- **[Trade-off] Slightly larger client bundle.** → Acceptable: `@tailwindcss/typography` is a fixed-cost plugin shared across all prose consumers and adds ~10 KB of generated CSS at `prose-sm`. The cover letter and every CV summary view row benefit, so the per-call-site cost is amortized.

## Migration Plan

No data migration. No backend change. The fix ships as a client-side CSS plugin registration plus an internal class change to `MarkdownView` and a scoped color-token remap in `globals.css`.

The existing `pnpm verify` (format:check, Biome lint, typecheck, `pnpm test -- --run`, build) exercises the change. The visual regression surface (cover letter preview at `/dashboard/applications/[id]`, CV summary on every section tab) is verifiable manually by saving a letter with `## Greeting` and confirming the preview shows an `<h2>`-sized heading.

**Rollback:** revert the change. `MarkdownView` falls back to its hand-tuned CSS without prose styling; headings in the cover letter preview render at body-text size again. No data is lost.

## Open Questions

None — the fix is local, the affected capability (`cv-editor-ui`, `application-workspace-tabs`) is well-bounded, and the existing test patterns cover the new contract.
