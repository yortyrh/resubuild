## Why

The CV editor stores rich-text fields as Markdown via `@wysimark/react`, but view mode (resume-preview rows across all tabs) renders those values as plain text—raw Markdown syntax, `whitespace-pre-wrap` paragraphs, or unformatted list items. Authors see formatting while editing but lose it when viewing saved entries, which breaks preview fidelity and makes saved CV content harder to read.

## What Changes

- Introduce a shared **Markdown view** component that renders stored Markdown as formatted HTML in read-only resume-preview rows.
- Replace plain-text rendering for every field authored with `markdown="block"` or inline markdown (highlights) across **all CV editor tabs** (Basics, Work, Volunteer, Education highlights where applicable, Projects, Awards, Publications, References, and nested highlight rows).
- Apply consistent typography and list styling so block fields (summaries, descriptions) and inline fields (highlight bullets) match Wysimark output semantics (bold, italic, links, lists, block quotes, tables).
- Sanitize rendered HTML to prevent XSS from user-authored Markdown links and inline HTML.
- Add unit tests for the shared renderer and representative view integrations.

## Capabilities

### New Capabilities

<!-- None — presentation behavior within existing CV editor -->

### Modified Capabilities

- `cv-editor-ui`: View-mode resume-preview rows SHALL render Markdown-authored field values as formatted Markdown (not raw source text) for every field that uses the shared markdown editor in form mode, across all section tabs.

## Impact

- **Frontend**: New `MarkdownView` (or equivalent) in `apps/web/src/components/cv/`; updates to `managed-basics-section.tsx`, `cv-sections.tsx` (`highlightBody`, `renderView` bodies), and `managed-nested-strings.tsx` view rows.
- **Dependencies**: Likely add `react-markdown` (+ `remark-gfm`, `rehype-sanitize`) to `apps/web`; no backend or schema changes.
- **Tests**: Colocated Vitest tests for the renderer and at least one section integration case.
- **CSS**: Prose/list styles in `globals.css` or component-scoped classes aligned with existing editor typography.
