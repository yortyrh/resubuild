## Context

The application workspace at `/dashboard/applications/[id]` renders a
`MarkdownEditor` (the same `MDXEditor`-based primitive used by every
rich-text field in the CV editor, see
`apps/web/src/components/cv/markdown-editor.tsx` and
`apps/web/src/components/cv/markdown-editor-impl.tsx`) for the
saved cover letter. The workspace initializes a local
`letterDraft` state to `''` and then mirrors the loaded
`data.coverLetter` value into it via a `useEffect`:

```tsx
const [letterDraft, setLetterDraft] = useState('');
useEffect(() => {
  if (data?.coverLetter != null) {
    setLetterDraft(data.coverLetter);
  }
}, [data?.coverLetter]);
```

The Copy, Print, and PDF actions all render the letter server-side
via `getApplicationLetterHtml(id)` and work today (the user
confirmed: "I know the text is there because the Copy letter, the
print and the pdf export all work"). What does not work is the
editor's rendered text: the user sees the placeholder
"Cover letter markdown…" in an empty `<p><br></p>` region even
though `data.coverLetter` is non-null.

We reproduced this in the running dev server: the editor's
contenteditable element renders `<div … contenteditable="true"
…><p dir="auto"><br></p></div>` with `textContent.length === 0`
while the same data drives a 2,300+ character letter when fetched
through the letter HTML/PDF endpoints.

The root cause is a documented limitation of `@mdxeditor/editor`
v4: the `markdown` prop is read once at mount; subsequent prop
changes do not propagate to the live lexical tree. The library
expects the parent to drive updates through an imperative
`setMarkdown` handle on a ref. Our `MarkdownEditor` wrapper
exposes neither a ref nor a setter, so any consumer that loads
the value asynchronously (like the application workspace, which
sources `data.coverLetter` from a `useQuery` GET) sees a blank
editor until the user types into it.

## Goals / Non-Goals

**Goals:**

- Make the `MarkdownEditor` in
  `apps/web/src/components/cv/markdown-editor-impl.tsx` keep its
  rendered text in sync with the `value` prop after the first
  non-empty update, by exposing an imperative `setMarkdown` ref
  consumers can call from a `useEffect` once the data arrives.
- Fix the application workspace cover-letter flow to use that
  ref so the user sees the saved letter text on load.
- Keep the existing Copy/Print/PDF contract unchanged.
- Add a unit test that exercises the new imperative setter
  against the existing `MDXEditor` mock.

**Non-Goals:**

- No change to the underlying `MDXEditor` library or its
  configuration. The fix lives entirely in this app's wrapper.
- No change to the CV editor's rich-text fields — they author
  their own values synchronously (the user types into them
  directly), so they are not affected by the prop-sync
  limitation and do not need a ref.
- No change to the `letterDraft` mirror state in the workspace.
  It still powers the "Print without save" flow's snapshot
  comparison (`letterDraft !== data.coverLetter`), so we keep
  it; we only add a second, parallel push into the editor's
  imperative handle.
- No change to the `MarkdownEditor`'s noscript fallback
  (the plain `<textarea>` branch in `markdown-editor.tsx`).
  Plain textareas already follow the `value` prop on every
  render, so they are not affected by the bug.
- No change to the placeholder, the toolbar configuration, the
  plugins, or the `contentEditableClassName` — those all stay
  as today.

## Decisions

### D1. Imperative `setMarkdown` ref on `MarkdownEditor`

**Decision.** Wrap `MarkdownEditor` (the wrapper in
`markdown-editor.tsx`) and `MarkdownEditorImpl` (the
`MDXEditor`-backed implementation) in `forwardRef` and expose
a `{ setMarkdown: (value: string) => void }` handle via
`useImperativeHandle`. The handle is what consumers call from a
`useEffect` to push a freshly loaded value into the editor.

**Why.** `MDXEditor` is a controlled-by-mount editor: the
`markdown` prop seeds the lexical tree on first render and the
component does not re-read the prop on later updates. The
library's documented escape hatch is an imperative setter on
the ref (the editor exposes `setMarkdown` as an instance
method; we surface it as `ref.current.setMarkdown(...)`).
Surfacing that setter through our wrapper is a one-method,
zero-dependency change that fixes the bug for every existing
and future async-loaded consumer (the application workspace
today, any future "load existing value into editor" use case
tomorrow).

**Alternatives considered.**

- Remount the editor with a `key` prop tied to the loaded
  data id (e.g. `key={data?.id}`). Works, but loses the
  editor's internal focus / selection / undo history on every
  data update and discards the user's in-progress edits if a
  `refetch` arrives mid-typing. Bad UX, easy to regress.
- Drop MDXEditor and roll our own rich-text editor. Out of
  scope for a bug fix; the editor is shared by 20+ call
  sites.
- Use a "controlled" mode with `onChange` only and remove
  `markdown` prop, treating the editor as fully
  uncontrolled. MDXEditor v4 does not have a "fully
  uncontrolled" mode — it always reads `markdown` on mount
  and exposes `setMarkdown` for sync. Going uncontrolled
  would mean we still need a ref to call `setMarkdown` once
  on first data load, so the controlled-by-mount design is
  preserved.
- A "useLayoutEffect inside the wrapper that calls
  `MDXEditor`'s setMarkdown when value changes" — that would
  also work, but it makes the wrapper mutate the editor
  silently on every prop change, which can fight with the
  user typing into the editor (any keystroke updates
  `onChange` → parent state → wrapper reruns the effect →
  editor resets to the parent value, including mid-edit
  characters the user just typed). Imperative ref + parent-
  controlled "push only when you really mean to" is safer.

### D2. `MarkdownEditor` wrapper keeps the same `value` prop and adds `ref` only

**Decision.** The public `MarkdownEditorProps` stays as today
(`value`, `onChange`, `variant`, `placeholder`, `className`).
The only API change is an additional optional `ref: Ref<
MarkdownEditorHandle>` where `MarkdownEditorHandle` is
`{ setMarkdown: (value: string) => void }`. No existing call
site is forced to use the ref.

**Why.** The CV editor and inline string-list fields all
author their own values synchronously and never load from an
async source. They never need the ref and would otherwise
have to thread an unused handle through 20+ call sites. The
ref is opt-in: a parent that loads its value asynchronously
(like the application workspace) opts in to the imperative
setter, and a parent that drives the value synchronously
(like the CV editor) keeps using the existing `onChange` /
`value` contract.

**Alternatives considered.**

- Make `setMarkdown` automatic inside the wrapper whenever
  `value` changes. Rejected (see D1) — fights with user
  typing and could clobber in-progress edits.
- Add a `defaultValue` prop alongside `value` and reset the
  editor only when `defaultValue` changes. Rejected —
  mixes controlled and uncontrolled semantics, and the CV
  editor already uses `value`/`onChange` everywhere; a
  parallel `defaultValue` prop invites mistakes.

### D3. The `noscript` fallback stays unchanged

**Decision.** The `<noscript>` plain-textarea branch in
`markdown-editor.tsx` (which renders when JavaScript is
disabled) keeps its current shape: a `<textarea defaultValue=
{value} rows={…} readOnly />` whose text is driven by the
`value` prop on every render via React's controlled
textarea behavior. We do NOT wrap it in a ref, and we do
NOT add a `setMarkdown` setter to it.

**Why.** The bug is specific to `MDXEditor`'s lexical
runtime, which is a JS-only path. The `<noscript>` textarea
is a fallback for users without JavaScript and is rendered as
a static, read-only snapshot. It does not have the prop-sync
limitation because it is a native form control. Adding a
setter to it would be dead code.

### D4. The `ApplicationWorkspace` keeps the `letterDraft` mirror state and adds a ref + `useEffect`

**Decision.** In
`apps/web/src/components/applications/application-workspace.tsx`,
add a `useRef<MarkdownEditorHandle>(null)` next to the
existing `useState` declarations, attach it to the
`MarkdownEditor` via the new `ref` prop, and add a second
`useEffect` keyed on `data.coverLetter` that calls
`markdownEditorRef.current?.setMarkdown(data.coverLetter)`
when the value arrives. The existing `setLetterDraft` mirror
stays — it powers the "Print without save" flow.

**Why.** The two writes target two different state holders.
`letterDraft` is a plain `useState` that the JSX layer reads
when building the "Print without save" snapshot and the
"Copy as plain text" fallback; the editor is an
imperative-by-mount component that needs an explicit push.
Driving both keeps the two consumers (`letterDraft` for the
plain-text paths, the editor's lexical tree for the visual
editor) consistent. The `useEffect` only calls the imperative
setter on real data transitions (empty → loaded, or
application id swap); it does not run on every keystroke
because `setLetterDraft` is the only state change triggered
by typing, and the new effect's key is `data.coverLetter`,
not `letterDraft`.

**Alternatives considered.**

- Remove the `letterDraft` state entirely and let the editor
  be the only source of truth, reading the current
  markdown through the ref on Copy / Print. Rejected — the
  Copy fallback path calls `formatCoverLetterPlainText(
emailSubject, letterDraft )` synchronously before the
  async HTML fetch resolves, and the print-without-save
  path compares `letterDraft !== data.coverLetter` to decide
  whether to issue a save first. Reading the editor's
  current value on demand would require an extra ref
  callback and would make those flows async, complicating
  their error handling. Keeping the mirror is cheaper and
  matches the existing pattern in this file.
- Run both `setLetterDraft` and `markdownEditorRef.current?.
setMarkdown(...)` from a single `useEffect`. Effectively
  what we are doing — the spec lists the two writes as one
  effect to keep the code shape simple.

### D5. Test the imperative setter against the existing `MDXEditor` mock

**Decision.** Extend the existing
`apps/web/src/components/cv/markdown-editor-impl.test.tsx`
file (which already mocks `MDXEditor` and asserts toolbar
shape, plugin count, and the inline vs. block variant) with
a new test that:

- Mounts `<MarkdownEditorImpl ref={ref} value="" onChange={…
} variant="block" />` (wrapped in `forwardRef` from
  inside the test).
- Asserts the mock received `markdown === ""` on initial
  mount.
- Calls `ref.current?.setMarkdown('Hello, world.')`.
- Asserts the mock received the new markdown (the existing
  mock is extended to record `markdown` on every render so
  the test can read the latest value).

**Why.** The existing mock already intercepts
`@mdxeditor/editor` and renders a stub element. Adding a
`markdown` recorder to the mock is a five-line change, and
the new test exercises the only piece of public surface the
change introduces (the imperative setter). No new test
infrastructure, no new test file.

**Alternatives considered.**

- A new test file colocated with the modified wrapper
  (`markdown-editor.ref.test.tsx`). The existing impl test
  already covers the wrapper's toolbar / plugin shape;
  adding a sibling file duplicates setup code (the same
  `vi.mock('@mdxeditor/editor', …)`) for one extra test.
  Extending the existing file is leaner.
- An E2E test in `apps/api/test/e2e/local-supabase.e2e-
spec.ts`. The bug is purely UI rendering — there is no
  server-side contract to verify. E2E tests are scoped to
  API contracts, not to "the editor visually renders the
  saved text" UX behavior, per the existing
  `openspec/specs/e2e-testing/spec.md`.

## Risks / Trade-offs

- **Existing call sites that DO want a controlled editor
  could accidentally start using the ref and bypass their
  own `onChange` flow.** → Mitigation: the ref is opt-in
  (only the application workspace will use it in this
  change); the public type marks `ref` as optional; a
  follow-up change can audit other consumers for ref usage.
  The PR description and the spec delta will call out that
  the ref is for async-loaded values only.
- **Calling `setMarkdown` resets the editor's undo/redo
  history and current selection.** → Mitigation: in the
  application workspace, we call `setMarkdown` only on
  `data.coverLetter` transitions (initial load or a
  different application id), not on every keystroke. The
  user's typing still flows through the controlled
  `value`/`onChange` path via the existing `letterDraft`
  mirror; the imperative setter never runs in response to
  typing. The undo history is reset only when the user
  navigates to a different application or the application
  data is refetched, which matches the user's mental model
  ("I switched to a different application, of course the
  editor is now showing that application").
- **The `MDXEditor` mock used by the existing test does
  not exercise the real lexical tree.** → Mitigation: the
  imperative setter is a one-line call into the editor
  instance (`editor.setMarkdown(value)`); the wrapper just
  forwards to it. The unit test asserts the call is wired
  correctly; the real lexical behavior is exercised by the
  dev-server smoke check in the verify step (open the
  application workspace, confirm the editor renders the
  saved letter text).
- **The application workspace previously relied on
  `letterDraft` being a `useState` mirror of
  `data.coverLetter`. If the new imperative push and the
  mirror ever drift (e.g. due to a future refactor that
  removes one of the two `useEffect`s), Copy / Print might
  show stale text.** → Mitigation: the two writes live in
  the same `useEffect` and use the same key
  (`data?.coverLetter`), so they stay in lockstep. A
  follow-up code-review checklist item: any future change
  to the cover-letter flow MUST update both writes
  together. The spec delta calls this out.
- **`<noscript>` users still see a static snapshot of the
  value at server-render time.** → Out of scope. The
  `<noscript>` branch renders a read-only snapshot of the
  current `value` prop on every server-render pass. If
  JavaScript is disabled the user cannot load the
  application workspace at all (the page is a `'use client'`
  component that needs the auth token from
  `sessionStorage`); the noscript branch is a defensive
  fallback, not a real UX path.

## Migration Plan

No data migration, no API change, no deploy step. The fix
ships as a normal Next.js client-side change; the existing
`pnpm verify` (format, lint, typecheck, test, build)
exercises it.

**Rollback.** Revert the commits; the imperative setter is
opt-in (no other consumer uses it), so a revert leaves the
CV editor untouched and the application workspace returns
to its pre-fix "blank editor" behavior (Copy / Print / PDF
still work, as today).

## Open Questions

- None. The bug, the fix, and the test surface are all
  clear from the code and from a single reproduction in the
  running dev server. The implementation slots into the
  existing wrapper without introducing a new dependency or
  changing the public API in a breaking way.
