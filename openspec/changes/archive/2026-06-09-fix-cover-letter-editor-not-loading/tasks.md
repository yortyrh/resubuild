## 1. Expose an imperative `setMarkdown` ref on `MarkdownEditor`

- [x] 1.1 In `apps/web/src/components/cv/markdown-editor-impl.tsx`,
      convert the `MarkdownEditorImpl` export to
      `forwardRef<MarkdownEditorHandle, MarkdownEditorProps>`.
      Add a new `MarkdownEditorHandle` type with
      `setMarkdown: (value: string) => void`. Implement
      `useImperativeHandle(ref, () => ({ setMarkdown }), [])`
      whose `setMarkdown` body calls the underlying
      `MDXEditor` instance's `setMarkdown(value)` (the
      instance method is available via a ref on the
      `MDXEditor` JSX element, named `editorRef`, typed
      `RefObject<MDXEditorMethods | null>`). Re-export
      `MarkdownEditorHandle` from the file alongside
      `MarkdownEditorProps`.
- [x] 1.2 In `apps/web/src/components/cv/markdown-editor.tsx`,
      convert the `MarkdownEditor` export to
      `forwardRef<MarkdownEditorHandle, MarkdownEditorProps>`.
      Forward the ref to `MarkdownEditorImpl` so consumers
      that import `MarkdownEditor` get the same handle as
      consumers that import `MarkdownEditorImpl` directly.
      Re-export `MarkdownEditorHandle` from this file as
      well so callers can `import type { MarkdownEditorHandle
} from '@/components/cv/markdown-editor'`. The
      `<noscript>` textarea branch is unchanged — it does
      not need a setter.

## 2. Use the ref in the application workspace to push the loaded cover letter

- [x] 2.1 In
      `apps/web/src/components/applications/application-workspace.tsx`,
      add `import type { MarkdownEditorHandle } from
'@/components/cv/markdown-editor'` and a `const
markdownEditorRef = useRef<MarkdownEditorHandle>(null)`
      next to the existing `useState` declarations. Attach
      `ref={markdownEditorRef}` to the `<MarkdownEditor>`
      rendered in the cover-letter section.
- [x] 2.2 In the same file, extend the existing
      `useEffect(() => { if (data?.coverLetter != null) {
setLetterDraft(data.coverLetter); } }, [data?.coverLetter])`
      to also call `markdownEditorRef.current?.setMarkdown(
data.coverLetter )` after the `setLetterDraft` write.
      The effect key stays `data?.coverLetter`; the imperative
      setter runs only on real data transitions, not on
      every keystroke (the `letterDraft` mirror continues to
      receive the keystrokes via the existing `onChange`).
- [x] 2.3 Confirm the `letterDraft` mirror state is preserved
      on both the `<MarkdownEditor value={letterDraft}
onChange={setLetterDraft} />` props and the local
      `setLetterDraft(data.coverLetter)` write. The "Print
      without save" flow's `letterDraft !== data.coverLetter`
      comparison MUST stay intact. Do NOT remove or rename
      `letterDraft`.

## 3. Unit test for the imperative setter

- [x] 3.1 In
      `apps/web/src/components/cv/markdown-editor-impl.test.tsx`,
      extend the existing `vi.mock('@mdxeditor/editor', …)`
      factory so the mock `MDXEditor` component records the
      `markdown` prop it receives on every render in a
      module-scoped array (e.g. `let lastMarkdown = '';
const MarkdownEditorCalls: string[] = []`). Use the
      `useRef` capture pattern (the mock function pushes
      `markdown` into the array on each call). Also mock
      `forwardRef` if not already passed through (it is
      React's default `forwardRef`, which works in Vitest by
      default — verify the mock passes the ref to the
      underlying component).
- [x] 3.2 Add a new `it('exposes a setMarkdown ref that pushes
new content into the editor', …)` test in the same
      file. Mount `<MarkdownEditorImpl ref={ref} value=""
onChange={vi.fn()} variant="block" />` with a
      `createRef<MarkdownEditorHandle>()`, assert the ref's
      `setMarkdown` function exists, call
      `ref.current?.setMarkdown('Hello, world.')`, and
      assert the mock's recorded `markdown` array contains
      the new value. The test MUST be added to the
      `describe('MarkdownEditorImpl', …)` block.
- [x] 3.3 Add a second test, `it('still renders the initial
value when no ref is provided', …)`, that mounts
      `<MarkdownEditorImpl value="initial" onChange={vi.fn()}
variant="block" />` without a ref and asserts the mock
      recorded `markdown === "initial"` on first mount. This
      is the regression guard for "the existing controlled-by-
      mount path still works for consumers that don't need a
      ref" per the spec.

## 4. Verify

- [x] 4.1 Run `pnpm --filter @resubuild/web typecheck` (or
      `pnpm typecheck`) and confirm the new `forwardRef` and
      `useImperativeHandle` types compile cleanly. The
      `MarkdownEditorHandle` type MUST be exported from both
      `markdown-editor.tsx` and `markdown-editor-impl.tsx`
      per the spec.
- [x] 4.2 Run `pnpm test -- --run` from the repo root and
      confirm the new tests in
      `markdown-editor-impl.test.tsx` pass and the existing
      tests in that file stay green (the toolbar-shape and
      plugin-count assertions remain valid because the mock
      `MDXEditor` component is unchanged in shape).
- [x] 4.3 Run `pnpm format:check && pnpm lint` and confirm
      the modified files pass Prettier and Biome. The
      `forwardRef` typing MUST NOT trigger a Biome
      `useExhaustiveDependencies` warning in the new
      `useEffect` (the effect's dependency array stays
      `[data?.coverLetter]` and the ref is read inside the
      effect — no `markdownEditorRef` in the deps because
      React refs are stable and ESLint / Biome exempt them).
- [x] 4.4 Open the dev server (the workspace is already
      running in the user's IDE per the active
      `pnpm dev` command in the terminals folder) and
      navigate to `/dashboard/applications/:id` for an
      existing `ready` application. Confirm the cover-letter
      editor now renders the saved Markdown text instead of
      the empty placeholder. Open the browser DevTools and
      inspect the editor's contenteditable region:
      `document.querySelector('.cover-letter-editor
[contenteditable]')?.textContent?.length` MUST be > 0
      (today: 0; after the fix: matches the saved letter
      length).
- [x] 4.5 Confirm the existing Copy / Print / PDF actions
      still work end-to-end. The `printLetter` function
      calls `getApplicationLetterHtml(id)` and
      `printHtmlDocument(html)` and MUST continue to produce
      the same server-rendered letter as before — this
      change is editor-only and the export paths are
      untouched.
- [x] 4.6 Navigate from one application to another in the
      same dev session and confirm the editor's rendered
      text updates to the second application's cover letter
      (per the third scenario in the
      `job-application-preparation` spec delta).

## 5. Follow-up: archive the change (post-`/opsx:apply`)

- [ ] 5.1 After the implementation lands and `pnpm verify`
      passes locally (format:check, Biome lint, typecheck,
      unit tests, build), archive the change with
      `openspec archive fix-cover-letter-editor-not-loading
--yes`. The archive step copies `proposal.md`,
      `design.md`, `tasks.md`, and the two spec deltas into
      `openspec/changes/archive/<date>-fix-cover-letter-
editor-not-loading/` and merges the spec deltas into
      the live specs at `openspec/specs/cv-editor-ui/spec.md`
      and `openspec/specs/job-application-preparation/spec.md`.

## E2E test impact

### Must pass unchanged

- All scenarios in
  `apps/api/test/e2e/local-supabase.e2e-spec.ts` (auth,
  CV, media, export, template presentation, lifecycle,
  sections, AI agent, import LLM, import URL, MCP, JSON
  export). This change is UI-only: it touches the
  `MarkdownEditor` wrapper in `apps/web/src/components/cv/`
  and the `ApplicationWorkspace` consumer in
  `apps/web/src/components/applications/`. It does NOT
  modify the Nest API contract, the database schema, the
  auth flow, the CV persistence shape, the
  `apps/api/test/e2e/jest-e2e.config.cjs` config, or the
  letter HTML / PDF export routes.

### Update required

- None. The `GET /applications/:id` response shape
  (`coverLetter: string | null`) is unchanged. The
  `GET /applications/:id/export/letter/html` and
  `/export/letter/pdf` endpoints are unchanged. No E2E
  scenario currently asserts the in-browser editor's
  rendered text — that is a DOM-level concern outside
  the E2E scope defined by
  `openspec/specs/e2e-testing/spec.md`.

### Add

- None. The new behavior is exercised by the new unit
  tests in
  `apps/web/src/components/cv/markdown-editor-impl.test.tsx`
  (the imperative setter test and the no-ref
  regression-guard test) and by the dev-server smoke
  check in task 4.4. The third "navigate between
  applications" scenario in the
  `job-application-preparation` spec delta is a manual
  smoke check, not an automated E2E test — it is
  covered by the dev-server walkthrough in task 4.6.
