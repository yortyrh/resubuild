## Context

The CV editor uses `@wysimark/react` (`MarkdownEditor` wrapper) for block and inline rich-text fields. Wysimark persists **Markdown strings** in JSON Resume `data` (e.g. `basics.summary`, `work[].summary`, highlight bullets). View mode uses `ResumeItemRow` / `ManagedArraySection.renderView` and currently outputs:

- `<p className="whitespace-pre-wrap">` for block fields (Basics summary, References text)
- `<p className="text-sm font-normal">` for other summaries/descriptions
- `<ul><li>{raw markdown string}</li></ul>` via `highlightBody()` and `ManagedNestedStrings` list bodies

No Markdown renderer exists in `apps/web` today (`react-markdown` is not installed). Edit mode is WYSIWYG; view mode must mirror that output read-only.

## Goals / Non-Goals

**Goals:**

- Single shared read-only Markdown renderer used everywhere a markdown-authored value appears in view mode.
- Parity with Wysimark-supported constructs: emphasis, links, ordered/unordered lists, block quotes, tables (block fields); inline emphasis and links in highlight bullets.
- Safe rendering (sanitized HTML, `rel="noopener noreferrer"` on external links).
- Compact styling consistent with existing resume-preview row density (`text-sm`, sensible list spacing).

**Non-Goals:**

- Changing edit-mode Wysimark configuration or toolbar presets.
- Rendering Markdown on public resume export/PDF (out of scope unless already sharing the same component later).
- Adding Markdown editing to fields that are plain text today (e.g. Education courses).
- SSR/hydration of the renderer on first paint (client-only dynamic import is acceptable, matching the editor pattern).

## Decisions

### 1. Use `react-markdown` with `remark-gfm` and `rehype-sanitize`

**Choice:** Add `react-markdown`, `remark-gfm`, and `rehype-sanitize` to `apps/web`.

**Rationale:** Lightweight, widely used, tree-shakeable, works in React 19/Next.js App Router. `remark-gfm` covers tables, strikethrough, and task lists aligned with Wysimark output. `rehype-sanitize` enforces an allowlist (no raw `<script>`, safe links).

**Alternatives considered:**

- **Wysimark read-only component:** No documented standalone viewer in current dependency; would couple view to editor bundle size.
- **Custom regex replacement:** Fragile, unsafe, poor table/list support.
- **`dangerouslySetInnerHTML` + marked:** Requires manual sanitization; more error-prone.

### 2. Shared `MarkdownView` component with `variant: 'block' | 'inline'`

**Choice:** `apps/web/src/components/cv/markdown-view.tsx` exporting `MarkdownView({ value, variant?, className? })`.

- **`block`:** Prose wrapper for summaries, descriptions, reference text (default).
- **`inline`:** Tighter typography for highlight `<li>` content and nested-string row titles; avoids block-level `<p>` margins inside list items.

Empty/whitespace-only `value` returns `null`.

Load via `next/dynamic` with `ssr: false` only if hydration warnings appear; prefer direct import first since view output is static HTML without Emotion runtime.

### 3. Centralize list rendering in `highlightBody`

**Choice:** Update `highlightBody()` in `cv-sections.tsx` to render each bullet with `<MarkdownView variant="inline" />` instead of raw `{value}`.

Nested highlight rows in `ManagedNestedStrings` view mode (`ResumeItemRow` title) get the same inline renderer.

### 4. Replace all plain-text view bindings for markdown-form fields

| Location                             | Field(s)                 | Current               | Target                                      |
| ------------------------------------ | ------------------------ | --------------------- | ------------------------------------------- |
| `ManagedBasicsSection`               | `summary`                | `whitespace-pre-wrap` | `MarkdownView block`                        |
| Work `renderView`                    | `summary`, `description` | plain `<p>` / omitted | `MarkdownView block`                        |
| Volunteer `renderView`               | `summary`                | plain `<p>`           | `MarkdownView block`                        |
| Projects `renderView`                | `description`            | plain `<p>`           | `MarkdownView block`                        |
| Awards `renderView`                  | `summary`                | plain `<p>`           | `MarkdownView block`                        |
| Publications `renderView`            | `summary`                | not shown             | show with `MarkdownView block` when present |
| References `renderView`              | `reference`              | `whitespace-pre-wrap` | `MarkdownView block`                        |
| Highlights (Work/Volunteer/Projects) | bullet strings           | raw in `<li>`         | `MarkdownView inline`                       |
| `ManagedNestedStrings`               | nested markdown rows     | raw title text        | `MarkdownView inline`                       |

Work `description` is markdown in the form but absent from view today—add it to the body when non-empty.

### 5. Prose styling via Tailwind `@layer` utility class

**Choice:** Add `.markdown-view` (and `.markdown-view--inline`) in `globals.css` with list, link, table, and blockquote rules scoped under the class—mirroring compact editor padding without importing full `@tailwindcss/typography` unless already present.

## Risks / Trade-offs

- **[Risk] Markdown dialect mismatch between Wysimark and `remark-gfm`** → Mitigation: Test representative Wysimark outputs (bold, link, list, table, blockquote); adjust allowed schema if Wysimark emits uncommon constructs.
- **[Risk] XSS via user links** → Mitigation: `rehype-sanitize` default schema; force `target="_blank"` + `rel` via custom `components` map for `<a>`.
- **[Risk] Layout shift if dynamically imported** → Mitigation: Prefer static import; reserve min-height only if needed.
- **[Trade-off] Slightly larger client bundle** → Acceptable for correct preview; tree-shake unused remark plugins.

## Migration Plan

1. Add dependencies and `MarkdownView` with tests.
2. Swap view bindings tab-by-tab (Basics → sections in `cv-sections.tsx` → nested strings).
3. Manual smoke test on each tab with formatted content.
4. No data migration; stored Markdown unchanged.

**Rollback:** Revert component and bindings; plain text fallback restores prior behavior.

## Open Questions

- None blocking MVP. Optional follow-up: extract a single map of `{ fieldPath, markdownVariant }` to avoid drift between form `markdown` props and view renderers.
