## ADDED Requirements

### Requirement: The MarkdownEditor wrapper SHALL expose a setMarkdown ref for post-mount value pushes

The MarkdownEditor wrapper in `apps/web/src/components/cv/markdown-editor.tsx` MUST expose an imperative handle on a forwarded `ref` so that consumers that load the editor's value asynchronously (a `useQuery` GET, a server component prop, or a draft from a `useState` mirror) can push the loaded value into the editor after mount.

The underlying `@mdxeditor/editor` `MDXEditor` component is
**controlled-by-mount**: it reads the `markdown` prop once
on initial render to seed its lexical tree and does not
re-read the prop on subsequent updates. The imperative
`setMarkdown(value: string): void` method exposed on the
forwarded ref is the only documented way to push a
post-mount value into the editor instance, and it MUST
forward to the underlying `MDXEditor` instance method of
the same name. The setter MUST replace the editor's
lexical tree with the new markdown and MUST reset the
editor's selection and undo/redo history. The parent is
responsible for only calling it on real data transitions,
not on every keystroke.

The wrapper MUST keep its existing `value` / `onChange` /
`variant` / `placeholder` / `className` prop surface
unchanged; the `ref` is additive and optional (consumers
that drive the value synchronously need not thread the
ref through). The `<noscript>` plain-textarea fallback in
the same file is a read-only snapshot driven by the
`value` prop on every server-render pass and MUST NOT
require a `setMarkdown` method on the ref.

#### Scenario: Consumer pushes a loaded value into the editor after mount

- **WHEN** a parent component mounts `<MarkdownEditor value="" onChange={fn} />` with an empty value and later receives an asynchronously loaded value `V` from an API call
- **AND** the parent has attached a `ref` of type `MarkdownEditorHandle` to the editor
- **THEN** the parent MAY call `ref.current?.setMarkdown(V)` to push `V` into the editor
- **AND** the editor's rendered text MUST become `V` after the call returns

#### Scenario: Consumer without a ref continues to work

- **WHEN** a parent mounts `<MarkdownEditor value={x} onChange={fn} />` without attaching a ref
- **THEN** the editor MUST render the `value` prop on first mount exactly as today
- **AND** MUST NOT throw a runtime error from a missing ref

#### Scenario: Block and inline variants both expose the ref

- **WHEN** a parent mounts `<MarkdownEditor variant="block" ref={…} />` or `<MarkdownEditor variant="inline" ref={…} />`
- **THEN** the ref's `setMarkdown` method MUST be available on both variants
- **AND** MUST update the editor's rendered text in both variants
