## ADDED Requirements

### Requirement: Block-variant MarkdownEditor SHALL layer `@tailwindcss/typography` so the editable region matches the read-only MarkdownView

The shared `MarkdownEditorImpl` wrapper (`apps/web/src/components/cv/markdown-editor-impl.tsx`) SHALL layer the `@tailwindcss/typography` `prose` utility (specifically `prose prose-sm max-w-none`) onto the `contentEditableClassName` it forwards to `@mdxeditor/editor` when `variant === 'block'` (the default), so the editable region — the DOM element with `aria-label="editable markdown"` — renders headings, ordered/unordered lists, links, blockquotes, code blocks, and tables with the typography plugin's sensible defaults at the same scale as the read-only `MarkdownView` block preview. `max-w-none` strips the plugin's default 65ch cap so the editable region fills the form chrome's available width.

The inline variant (`variant === 'inline'`) SHALL NOT carry the `prose` utility classes: it MUST keep the existing `mdxeditor-content--inline` marker on its `contentEditableClassName` and MUST remain prose-free so highlight bullets keep their tight, list-friendly layout.

#### Scenario: Block editor contentEditable carries prose classes

- **WHEN** a consumer mounts `<MarkdownEditor variant="block" onChange={fn} />`
- **THEN** the `contentEditableClassName` forwarded to `MDXEditor` SHALL include the classes `prose`, `prose-sm`, and `max-w-none`
- **AND** SHALL NOT include `mdxeditor-content--inline`

#### Scenario: Inline editor contentEditable stays prose-free

- **WHEN** a consumer mounts `<MarkdownEditor variant="inline" onChange={fn} />`
- **THEN** the `contentEditableClassName` SHALL include the class `mdxeditor-content--inline`
- **AND** SHALL NOT include `prose`, `prose-sm`, or `max-w-none`

#### Scenario: Headings inside the block editor render at prose-sm scale

- **WHEN** a user types `## Heading` inside a block variant `MarkdownEditor` and the editor renders the line
- **THEN** the resulting `<h2>` element inside the editable region SHALL be sized by `@tailwindcss/typography` at the `prose-sm` heading scale
