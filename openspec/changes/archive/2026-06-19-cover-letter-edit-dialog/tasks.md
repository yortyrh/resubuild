## 1. Cover letter tab refactor in application-workspace

- [x] 1.1 Remove `letterDraft`, `saving`, `setLetterDraft`, `setSaving`, `markdownEditorRef`, and the bidirectional `useEffect` that synced `data.coverLetter` into the draft + ref from `apps/web/src/components/applications/application-workspace.tsx`
- [x] 1.2 Replace the inline `MarkdownEditor` in the `cover-letter` `TabsContent` with `<MarkdownView value={data.coverLetter} variant="block" />` and remove the now-unused `MarkdownEditor` import
- [x] 1.3 Add an **Edit** button (`PenLine` icon) before **Copy letter** in the cover-letter action bar, toggling a new `letterEditOpen` state and disabled while `updateInProgress` is true
- [x] 1.4 Wrap the read-only `MarkdownView` in `<div className="max-h-[60vh] overflow-y-auto pr-1">` to cap the preview height and enable internal scrolling for long letters
- [x] 1.5 Update `copyRichText` and `printLetter` to read `data.coverLetter ?? ''` directly from the cache, removing any reliance on the deleted `letterDraft` state
- [x] 1.6 Remove the inline "Save letter" button from the Cover letter tab
- [x] 1.7 Mount `<ApplicationLetterEditDialog applicationId={application.id} open={letterEditOpen} onOpenChange={setLetterEditOpen} initialValue={data.coverLetter ?? ''} />` in the workspace tree

## 2. ApplicationLetterEditDialog implementation

- [x] 2.1 Create `apps/web/src/components/applications/application-letter-edit-dialog.tsx` exporting `ApplicationLetterEditDialogProps`, `ApplicationLetterEditDialog` (default export of component), and re-exporting `JobApplicationSummary` from `@/lib/api`
- [x] 2.2 Implement local draft state via `useState(initialValue)` and a `useEffect` that re-seeds the draft whenever `open` flips to true
- [x] 2.3 Implement `useMutation` calling `updateApplicationLetter(applicationId, draft)`, on success writing the returned `JobApplicationSummary` into `['application', applicationId]` via `queryClient.setQueryData`, showing a success toast, and closing the dialog via `onOpenChange(false)`
- [x] 2.4 On mutation error show a Sonner error toast with the error message and keep the dialog open
- [x] 2.5 Compose the dialog body with `flex flex-col gap-4 max-h-[100dvh] max-w-[min(100vw-2rem,80rem)]`, fixed header (title + description), a `min-h-0 flex-1 overflow-y-auto` wrapper around `MarkdownEditor`, and a footer containing a small right-aligned Save button (`size="sm"`, `self-end`) with a `Loader2` spinner while pending

## 3. Tests

- [x] 3.1 Create `apps/web/src/components/applications/application-letter-edit-dialog.test.tsx` with mocked `MarkdownEditor` (`data-testid="mock-markdown-editor"`) and `updateApplicationLetter` from `@/lib/api`; cover seeding on open, mutation call on save, dialog closure on success, dialog stays open on error, and toast feedback
- [x] 3.2 Update `apps/web/src/components/applications/application-workspace.test.tsx`: remove the `MarkdownEditor` mock and `mockUpdateApplicationLetter`, add a `MarkdownView` mock (`data-testid="mock-markdown-view"`) and an `ApplicationLetterEditDialog` mock that lets the test toggle its open state
- [x] 3.3 Add cover-letter tests asserting: read-only `MarkdownView` renders the saved letter, the Edit button sits before Copy letter in the action bar, the Edit button is disabled while the workspace update mutation is in progress, and the preview wrapper applies `max-h-[60vh]` and `overflow-y-auto`

## 4. MDXEditor toolbar polish

- [x] 4.1 In `apps/web/src/app/globals.css` rewrite the `.rich-text-editor [class*='_toolbarRoot']` rule: sticky at `top: 0` with `z-index: 5`, solid `hsl(var(--muted))` background, bottom border separator, rounded top corners, `flex-wrap: wrap`, `min-height: 2.25rem`, `height: auto`, `overflow: visible`
- [x] 4.2 Style MDXEditor toolbar items and the Block-type select trigger with rounded corners, muted text color, transition, and a `:hover` background toward `--background`; add a pressed/active state for `data-state='on'` and `aria-pressed='true'`
- [x] 4.3 Override only the contentEditable top-left / top-right corners (set to `0`) so the seam between toolbar and content has no visible gap, keeping the rest of the editor shell at `border-radius: 0` per the existing global rule

## 5. Verification

- [x] 5.1 Run `pnpm -w turbo run test --filter @resumind/web -- --run` — all web unit tests pass (39 tests across 4 files: application-workspace, application-letter-edit-dialog, markdown-editor, cv tabs)
- [x] 5.2 Run `pnpm -w turbo run lint --filter @resumind/web` and `pnpm -w turbo run format:check` — Biome lint and Prettier formatting clean for the touched files

## E2E test impact

**Must pass unchanged** — this change is web-only and does not modify the Nest API surface, the Supabase schema, the seed fixtures, or the auth flow. The existing `pnpm samples:seed` + `pnpm test:e2e` workflow runs the workspace via the same `application` API as today; the cover-letter tab will render the read-only preview by default, and the Edit dialog exercises the existing `PATCH /applications/:id` endpoint that the E2E suite already covers. No new E2E specs are required and no existing specs need updates — `openspec/specs/e2e-testing/spec.md` and any application-workspace E2E cases (if present) MUST pass unmodified.
