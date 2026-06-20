## ADDED Requirements

### Requirement: MarkdownEditor SHALL expose a freeForm opt-in for full markdown grammar

The `MarkdownEditor` wrapper in `apps/web/src/components/cv/markdown-editor.tsx` SHALL accept an optional `freeForm?: boolean` prop. When `freeForm` is omitted or `false`, the editor's plugin list SHALL remain the existing constrained set (no headings, no code blocks). When `freeForm` is `true`, the editor's plugin list SHALL additionally include `headingsPlugin` and `codeBlockPlugin` so that markdown containing `## heading` syntax and fenced code blocks renders correctly.

The block-variant toolbar SHALL additionally render `InsertCodeBlock` when `freeForm` is `true`. The inline-variant toolbar SHALL NOT change when `freeForm` is `true` (inline editors remain restricted to Undo/Redo, Bold/Italic, Strikethrough, Code toggle, and Link).

#### Scenario: Default block editor omits headings and code block plugins

- **WHEN** a consumer mounts `<MarkdownEditor variant="block" onChange={fn} />` without passing `freeForm`
- **THEN** the editor's plugin list SHALL NOT include `headingsPlugin` or `codeBlockPlugin`
- **AND** the block toolbar SHALL NOT render `InsertCodeBlock`

#### Scenario: Free-form block editor registers headings and code block plugins

- **WHEN** a consumer mounts `<MarkdownEditor variant="block" freeForm onChange={fn} />`
- **THEN** the editor's plugin list SHALL include both `headingsPlugin` and `codeBlockPlugin`
- **AND** the block toolbar SHALL render `InsertCodeBlock`

#### Scenario: Free-form inline editor keeps the inline toolbar

- **WHEN** a consumer mounts `<MarkdownEditor variant="inline" freeForm onChange={fn} />`
- **THEN** the inline toolbar SHALL be unchanged (Undo/Redo, Bold/Italic, Strikethrough, Code toggle, Link)
- **AND** SHALL NOT render `InsertCodeBlock`

#### Scenario: Existing CV-section consumers keep the constrained plugin list

- **WHEN** any call site that does not pass `freeForm` (e.g. `form-fields.tsx`, `prepare-application-form.tsx`, `application-intake-options.tsx`) mounts the editor
- **THEN** that instance SHALL continue to register the constrained 8-plugin set
- **AND** SHALL NOT expose headings or `InsertCodeBlock` in the block toolbar
