## Why

The application workspace at `/dashboard/applications/[id]` shows a blank
cover-letter rich-text editor even though `data.coverLetter` is populated
by the API and the Cover letter Copy, Print, and PDF actions all work
(those actions render the letter server-side and bypass the editor).
The editor renders the placeholder "Cover letter markdown…" instead of
the saved Markdown draft. We confirmed this in the running app: the
editor's contenteditable region contains an empty `<p><br></p>` while
the `data.coverLetter` value is non-null server-side.

Root cause: the workspace initializes `letterDraft` with `useState('')`
and then loads the saved value via a `useEffect` keyed on
`data.coverLetter`. The `MarkdownEditor` re-renders with the new value,
but the underlying `MDXEditor` instance was created with `markdown=""`
on first mount and does not re-sync from the `markdown` prop on
subsequent updates. Once the lexical editor tree is constructed, the
component owns the source of truth internally and ignores prop changes.

## What Changes

- Make the `MarkdownEditor` in `apps/web/src/components/cv/markdown-editor-impl.tsx`
  forward prop changes to the live `MDXEditor` instance so that
  `markdown={value}` updates after initial mount populate the editor.
  The cleanest way to do this in `@mdxeditor/editor` v4 is to expose a
  `ref` that returns a handle with a `setMarkdown` method, then have
  the parent call it from a `useEffect` that runs whenever `value`
  changes. We will add a `useImperativeHandle` on the impl that
  exposes `{ setMarkdown }` and a `forwardRef` wrapper in
  `markdown-editor.tsx` so consumers can call
  `markdownEditorRef.current?.setMarkdown(value)`.
- Fix the `ApplicationWorkspace` cover-letter flow to use that ref: a
  `useEffect` keyed on `data.coverLetter` calls
  `markdownEditorRef.current?.setMarkdown(data.coverLetter)` when the
  value arrives after initial mount, so the user sees the saved
  letter instead of an empty editor. The existing `letterDraft`
  mirror state stays (it powers the Copy/Print/Print-pending-save
  paths), but the editor's internal state is the source of truth for
  the rendered text after the prop sync fires.
- Keep the existing Copy/Print/PDF contract (which renders HTML
  server-side via `getApplicationLetterHtml`) unchanged — those paths
  do not depend on the editor's internal state and continue to work
  as today.
- Add a unit test in
  `apps/web/src/components/cv/markdown-editor-impl.test.tsx` (or a new
  sibling spec) that asserts the imperative `setMarkdown` handle
  updates the `MDXEditor` instance when called after mount.

## Capabilities

### New Capabilities

- None. The Markdown editor is an existing UI primitive; the change is
  a bug fix in how it synchronizes prop updates to the underlying
  editor instance.

### Modified Capabilities

- `cv-editor-ui`: an additive requirement clarifies that the
  block-variant markdown editor in this app MUST keep its rendered
  text in sync with the `value` prop after the first non-empty
  update, by exposing an imperative `setMarkdown` ref the parent
  can call on data load. The change documents the symptom (editor
  shows placeholder after async data load) and the contract
  (parent can call `ref.current?.setMarkdown(value)` to push the
  loaded value into the editor).
- `job-application-preparation`: an additive scenario under the
  "Users SHALL copy and export the cover letter for email or PDF"
  requirement makes it explicit that the cover-letter editor in the
  workspace MUST display the saved `cover_letter` Markdown when the
  application is loaded, not the empty placeholder.

## Impact

- `apps/web/src/components/cv/markdown-editor-impl.tsx` — wrap the
  export in `forwardRef`, add `useImperativeHandle({ setMarkdown })`,
  and re-render the editor when the imperative setter is called.
  The `<noscript>` textarea branch in `markdown-editor.tsx` does not
  need to change because plain textareas already follow the value
  prop on every render.
- `apps/web/src/components/cv/markdown-editor.tsx` — wrap the
  exported `MarkdownEditor` in `forwardRef` so consumers can grab
  the imperative handle.
- `apps/web/src/components/applications/application-workspace.tsx` —
  add a `useRef<MarkdownEditorHandle>` on the cover-letter editor
  and a `useEffect` that calls `ref.current?.setMarkdown(...)` when
  `data.coverLetter` is loaded, in addition to the existing
  `setLetterDraft` mirror. Keep the `letterDraft` state (Copy /
  Print-without-save rely on it for their snapshot logic).
- `apps/web/src/components/cv/markdown-editor-impl.test.tsx` (or a
  sibling spec colocated with the modified file) — extend the
  existing `MDXEditor` mock to record `setMarkdown` calls and add a
  test that mounts the editor with an empty `value`, then calls
  `ref.current?.setMarkdown('new text')` and asserts the mock
  received the call.
- `openspec/specs/cv-editor-ui/spec.md` — additive requirement
  delta.
- `openspec/specs/job-application-preparation/spec.md` — additive
  scenario delta under the existing "Users SHALL copy and export
  the cover letter for email or PDF" requirement.

No API contract changes, no database migrations, no new
dependencies, no changes to the Copy / Print / PDF code paths.
