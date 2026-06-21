## MODIFIED Requirements

### Requirement: Cover letter preview SHALL render headings at prose-sm typography scale

The Cover letter tab's read-only `MarkdownView` preview SHALL render headings authored with `## ` syntax at the typography scale provided by `@tailwindcss/typography` (`prose-sm`), so the preview size matches what the cover-letter editor (mounted in `freeForm` mode per the cover letter `MarkdownEditor` `freeForm` requirement) shows while editing. The preview SHALL NOT render heading text at body-text size.

This requirement scopes the cv-editor-ui `MarkdownView` block-variant prose layering to the Cover letter preview context; the underlying capability lives in the `cv-editor-ui` spec.

#### Scenario: Heading markdown renders at heading size in cover letter preview

- **WHEN** a user saves a cover letter that begins with `## Greeting` and reopens the Cover letter tab in read-only mode
- **THEN** the Cover letter preview SHALL render `## Greeting` as an `<h2>` sized by the project's typography scale (larger than body text)
- **AND** no editor-preview drift SHALL occur (the preview size matches the editor's heading size)

#### Scenario: Dark-mode cover letter preview is readable

- **WHEN** the user's `prefers-color-scheme` is `dark` and the Cover letter tab is active with a non-empty saved letter
- **THEN** the Cover letter preview text SHALL use the project's dark-mode foreground color
- **AND** headings, links, and blockquotes SHALL use the project's dark-mode color palette (not the prose plugin's hardcoded light palette)
