## MODIFIED Requirements

### Requirement: MarkdownEditor SHALL expose a freeForm opt-in for full markdown grammar

The `MarkdownEditor` wrapper in `apps/web/src/components/cv/markdown-editor.tsx` SHALL accept an optional `freeForm?: boolean` prop. When `freeForm` is omitted or `false`, the editor's plugin list SHALL remain the existing constrained set (no headings, no code blocks). When `freeForm` is `true`, the editor's plugin list SHALL additionally include `headingsPlugin`, `codeBlockPlugin` (configured with `defaultCodeBlockLanguage: 'txt'` so inserted blocks always have a language a registered descriptor can render), and `codeMirrorPlugin` (configured with `codeBlockLanguages: { js: 'JavaScript', css: 'CSS', txt: 'text', tsx: 'TypeScript' }` so the descriptor registered by the plugin matches the languages the toolbar picker exposes). The `codeMirrorPlugin` registration MUST ensure that clicking the `InsertCodeBlock` toolbar action produces a code block the editor can render — i.e., a matching `CodeBlockEditorDescriptor` is registered — instead of throwing `No CodeBlockEditor registered`.

The block-variant toolbar SHALL additionally render `InsertCodeBlock` when `freeForm` is `true`. The inline-variant toolbar SHALL NOT change when `freeForm` is `true` (inline editors remain restricted to Undo/Redo, Bold/Italic, Strikethrough, Code toggle, and Link).

#### Scenario: Default block editor omits headings and code block plugins

- **WHEN** a consumer mounts `<MarkdownEditor variant="block" onChange={fn} />` without passing `freeForm`
- **THEN** the editor's plugin list SHALL NOT include `headingsPlugin`, `codeBlockPlugin`, or `codeMirrorPlugin`
- **AND** the block toolbar SHALL NOT render `InsertCodeBlock`

#### Scenario: Free-form block editor registers headings, code block, and code mirror plugins

- **WHEN** a consumer mounts `<MarkdownEditor variant="block" freeForm onChange={fn} />`
- **THEN** the editor's plugin list SHALL include `headingsPlugin`, `codeBlockPlugin` (with `defaultCodeBlockLanguage: 'txt'`), and `codeMirrorPlugin` (with `codeBlockLanguages` covering `js`, `css`, `txt`, `tsx`)
- **AND** the block toolbar SHALL render `InsertCodeBlock`
- **AND** clicking `InsertCodeBlock` SHALL insert a code block the editor can render (no `No CodeBlockEditor registered` error)

#### Scenario: Free-form inline editor keeps the inline toolbar

- **WHEN** a consumer mounts `<MarkdownEditor variant="inline" freeForm onChange={fn} />`
- **THEN** the inline toolbar SHALL be unchanged (Undo/Redo, Bold/Italic, Strikethrough, Code toggle, Link)
- **AND** SHALL NOT render `InsertCodeBlock`

#### Scenario: Existing CV-section consumers keep the constrained plugin list

- **WHEN** any call site that does not pass `freeForm` (e.g. `form-fields.tsx`, `prepare-application-form.tsx`, `application-intake-options.tsx`) mounts the editor
- **THEN** that instance SHALL continue to register the constrained 8-plugin set
- **AND** SHALL NOT expose headings or `InsertCodeBlock` in the block toolbar
