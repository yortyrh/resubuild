## 1. Dependencies and shared renderer

- [x] 1.1 Add `react-markdown`, `remark-gfm`, and `rehype-sanitize` to `apps/web/package.json`
- [x] 1.2 Create `apps/web/src/components/cv/markdown-view.tsx` with `MarkdownView` supporting `variant: 'block' | 'inline'`, empty-value guard, link `rel`/`target`, and `rehype-sanitize`
- [x] 1.3 Add `.markdown-view` / `.markdown-view--inline` styles in `apps/web/src/app/globals.css` for lists, links, tables, and blockquotes at resume-preview density
- [x] 1.4 Add colocated `apps/web/src/components/cv/markdown-view.test.tsx` covering bold/list rendering, empty input, and unsafe link sanitization

## 2. Wire view mode across CV sections

- [x] 2.1 Update `apps/web/src/components/cv/managed-basics-section.tsx` to render `basics.summary` with `MarkdownView` (block) instead of `whitespace-pre-wrap`
- [x] 2.2 Update `highlightBody()` in `apps/web/src/components/cv/cv-sections.tsx` to render each bullet with `MarkdownView` (inline)
- [x] 2.3 Update Work, Volunteer, Projects, Awards, Publications, and References `renderView` bodies in `cv-sections.tsx` to use `MarkdownView` for all markdown-form fields (include Work `description` and Publications `summary` when non-empty)
- [x] 2.4 Update `apps/web/src/components/cv/managed-nested-strings.tsx` view-row titles to use `MarkdownView` (inline) when `markdown` prop is true

## 3. Verification

- [x] 3.1 Run `pnpm --filter @resumind/web test -- --run` and fix any failures
- [ ] 3.2 Manual smoke test: save formatted content on Basics, Work (summary, description, highlights), Projects, Awards, Publications, and References tabs; confirm view mode shows formatted output on each
