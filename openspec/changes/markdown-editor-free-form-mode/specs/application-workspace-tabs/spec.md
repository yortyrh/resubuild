## ADDED Requirements

### Requirement: Cover letter edit dialog SHALL mount the MarkdownEditor in freeForm mode

The `ApplicationLetterEditDialog` SHALL mount its `MarkdownEditor` instance with the `freeForm` prop set so the editor accepts the full markdown grammar (headings, code blocks) when authoring a cover letter. CV section constraints (no headings, no code blocks, no image upload) MUST NOT apply to the cover letter authoring surface.

#### Scenario: Cover letter dialog enables full markdown

- **WHEN** the dialog renders an `ApplicationLetterEditDialog` with non-empty `initialValue`
- **THEN** the `<MarkdownEditor>` instance inside the dialog SHALL receive `freeForm=true`
- **AND** saved cover letter markdown that begins with `## ` SHALL render as an `<h2>` (or equivalent heading) inside the editor

#### Scenario: Heading markdown seeds the editor unchanged

- **WHEN** a user opens the dialog with `initialValue` equal to `"## Some heading\nSome text"`
- **THEN** the editor SHALL receive the full string `"## Some heading\nSome text"` on its `markdown` prop without truncation or escape
- **AND** `markdownShortcutPlugin` plus `headingsPlugin` SHALL promote the `## ` prefix into a heading node

#### Scenario: Cover letter preview is unaffected

- **WHEN** a user saves a heading-prefixed cover letter and reopens the Cover letter tab in read-only mode
- **THEN** the `MarkdownView` preview SHALL continue to render the heading via its existing `react-markdown` + `remark-gfm` pipeline
- **AND** no editor-preview drift SHALL occur
