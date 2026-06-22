# Design: markdown-editor-codeblock-descriptor

> Retroactive design document. Implementation is already present in the working tree.

## Context

`MarkdownEditorImpl` (`apps/web/src/components/cv/markdown-editor-impl.tsx`) supports two variants:

- `block` — CV section fields, constrained grammar.
- `block freeForm` — long-form authoring surfaces (cover letter, job description). Adds the `headingsPlugin` and `codeBlockPlugin` plus an `InsertCodeBlock` toolbar button.

MDX Editor's `codeBlockPlugin` only wires the data model for code blocks (import/export visitors, the `insertCodeBlock$` signal, the `CodeBlockNode` lexical node). It does **not** register a `CodeBlockEditorDescriptor`, which is what renders the actual inline code editor UI inside each code block node. When `InsertCodeBlock` fires, it inserts a `CodeBlockNode` with the configured `defaultCodeBlockLanguage` and the `CodeBlockEditorContainer` immediately looks up a matching descriptor and throws `No CodeBlockEditor registered for language=${language} meta=${meta}` if none is registered.

`codeMirrorPlugin` is the canonical companion: on init it appends a `CodeBlockEditorDescriptor` whose `match()` accepts the configured languages and any empty meta. It also registers the language picker shown inside `InsertCodeBlock`.

## Goals / Non-Goals

**Goals:**

- Make the `InsertCodeBlock` button render without throwing on `freeForm` editor surfaces.
- Default new code blocks to a recognized language (`txt`) so the descriptor always has something to match.
- Surface a small, curated set of languages in the picker (`js`, `css`, `txt`, `tsx`).

**Non-Goals:**

- Full syntax-highlighting configuration (`codeMirrorExtensions`).
- Exposing every CodeMirror language.
- Changing `freeForm=false` behavior (constrained grammar stays unchanged).

## Decisions

- **Default language `txt`.** Picked over leaving it empty because `defaultCodeBlockLanguage` is what `InsertCodeBlock` uses for the new node's language. An empty default works only by accident when the descriptor matches empty-meta strings — explicit `txt` makes the contract clear and survives future descriptor changes.
- **Curated language list (`js`, `css`, `txt`, `tsx`).** These cover the realistic authoring surface of a cover letter / job description (inline code, CSS snippets, plain code blocks, TypeScript snippets). Adding the full CodeMirror catalog is out of scope.
- **Register `codeMirrorPlugin` rather than hand-write a descriptor.** `codeMirrorPlugin` already appends the descriptor via `appendCodeBlockEditorDescriptor$` and wires the picker; reusing it keeps the editor surface idiomatic.

## Risks / Trade-offs

- [Bundle size impact from pulling in `codeMirrorPlugin`] → only registered under `freeForm=true`, so constrained CV fields are unaffected.
- [Picking `txt` as the default could surprise users expecting a recognized programming language] → the picker is always one click away in the `InsertCodeBlock` dialog.
