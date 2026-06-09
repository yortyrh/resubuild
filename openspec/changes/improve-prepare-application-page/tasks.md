## 1. Breadcrumb chrome on the intake page

- [x] 1.1 In `apps/web/src/app/dashboard/applications/new/page.tsx`, remove the "← Back to applications" `Link` and render `<ApplicationWorkspaceBreadcrumb pageLabel="Preparing application…" />` from `@/components/applications/application-workspace-breadcrumb` in its place.
- [x] 1.2 Verify the breadcrumb wraps without overflowing on the existing `max-w-6xl` page container; adjust the wrapper if needed.

## 2. Top-right Cancel button

- [x] 2.1 In `apps/web/src/app/dashboard/applications/new/page.tsx`, wrap the breadcrumb and the form's `<h1>`/subtitle in a `flex items-start justify-between gap-4` row that renders a top-right `<Button asChild variant="outline"><Link href="/dashboard/applications">Cancel</Link></Button>` (import `Link` from `next/link` and `Button` from `@/components/ui/button`). The Cancel is `type="button"`-equivalent (it's a `<Link>`, not a submit).
- [x] 2.2 Confirm the Cancel button is visible on initial render AND remains visible while `inFlight` is true (it is a navigation affordance, not a job-cancel action).
- [x] 2.3 Clicking Cancel navigates to `/dashboard/applications` and does not submit the form.

## 3. Segmented Job source row

- [x] 3.1 In `apps/web/src/components/applications/prepare-application-form.tsx`, refactor the Job source fieldset so the three modes (`URL`, `Text`, `PDF or screenshot`) render as a single horizontal segmented row using shadcn `Button` (`ghost` for inactive, `default` for active) inside a `surface-soft` strip. Each button uses `aria-pressed` to expose the selection.
- [x] 3.2 Keep exactly one mode selected at a time. Default to `Text` (matching today's default). The matching input control renders directly below the row; the other two inputs unmount.
- [x] 3.3 Confirm the fieldset remains disabled while a prepare is in flight.

## 4. Markdown editor for the Text job description and the Optional instruction

- [x] 4.1 In `apps/web/src/components/applications/prepare-application-form.tsx`, replace the bare `<Textarea>` for the Text job description with the project's `MarkdownEditor` (variant `block`) from `@/components/cv/markdown-editor`. Pass `value={text}` and `onChange={setText}` and the existing `placeholder` ("Paste job description…").
- [x] 4.2 In `apps/web/src/components/applications/application-intake-options.tsx`, replace the bare `<Textarea>` for "Optional instruction" with `MarkdownEditor` (variant `block`). Pass `value={message}` and `onChange={onMessageChange}` and the existing `placeholder` ("Emphasize React experience…"). Keep the `messageId` so the `Label` still binds.
- [x] 4.3 Confirm the submit handler still sends `text: sourceMode === 'text' ? text : undefined` and `message: message || undefined` so the existing `POST /applications/prepare` payload is unchanged.

## 5. Styled PDF / screenshot file picker

- [x] 5.1 Create `apps/web/src/components/applications/prepare-application-file-picker.tsx` exporting `<PrepareApplicationFilePicker value={file | null} onChange={setFile} disabled={inFlight} />`. The component renders a shadcn `Button` (variant `outline`) labeled "Choose file" that triggers a hidden `<Input type="file">` (`tabIndex={-1}` `aria-hidden` `accept="application/pdf,image/png,image/jpeg,image/webp"`). The hidden input's `onChange` validates the picked file (MIME allow-list and ≤ 5 MB) and either calls `onChange(file)` or `toast.error(...)` and leaves the state untouched.
- [x] 5.2 When `value` is set, render a metadata row next to the button with the file's name, formatted size, and MIME type, plus a Remove icon button that calls `onChange(null)`. Use a small `formatBytes` helper colocated in the file (or in `apps/web/src/lib/format.ts` if such a helper already exists).
- [x] 5.3 In `prepare-application-form.tsx`, replace the raw `<Input type="file">` in the `file` branch of the Job source fieldset with `<PrepareApplicationFilePicker value={file} onChange={setFile} disabled={inFlight} />`.
- [x] 5.4 Confirm the disabled state disables both the trigger button and the Remove action while `inFlight` is true.

## 6. Tests

- [x] 6.1 In `apps/web/src/components/applications/prepare-application-form.test.tsx`, add Vitest cases:
  - Renders the breadcrumb with `Applications` linked to `/dashboard/applications` and the static "Preparing application…" label, and does NOT render the legacy "Back to applications" link.
  - Renders the top-right `Cancel` button as a `Link` with `href="/dashboard/applications"`.
  - The three Job source modes render as a single row; switching the active mode swaps the visible input.
  - When `sourceMode === 'text'`, the `MarkdownEditor` for the job description is mounted (mocked in tests, see 6.4).
  - The submit handler sends `text` and `message` from the editor state unchanged.
- [x] 6.2 Create `apps/web/src/components/applications/application-intake-options.test.tsx` with a case asserting the "Optional instruction" `MarkdownEditor` is mounted and the editor's `onChange` updates the parent `message` state.
- [x] 6.3 Create `apps/web/src/components/applications/prepare-application-file-picker.test.tsx` with cases:
  - Renders the "Choose file" button.
  - Selecting a `application/pdf` file under 5 MB calls `onChange` with the file and shows name + size + MIME.
  - Selecting a file over 5 MB does not call `onChange` (toast error mocked).
  - Selecting a file with a non-allowed MIME does not call `onChange`.
  - Clicking Remove calls `onChange(null)` and returns to the empty state.
- [x] 6.4 In all new tests, mock `@/components/cv/markdown-editor` with a lightweight `<textarea data-testid="md-editor">` shim so the heavy `MDXEditor` bundle is not loaded in the test environment. Mock `sonner.toast` for the file picker tests. Follow the pattern already used in `apps/web/src/components/cv/markdown-editor-impl.test.tsx`.

## 7. Documentation

- [x] 7.1 In `apps/web/DESIGN.md`, add a row to the "Applications" table documenting the new Prepare application form chrome: breadcrumb (`surface-soft` row), Job source segmented row (`surface-soft` strip + buttons), Markdown editor usage for the long-form inputs, the styled file picker, and the top-right Cancel button.
- [x] 7.2 In `apps/web/DESIGN.md`, note under "Checklist for agents" that the Prepare application form is one of the dashboard surfaces that uses `surface-soft`, the breadcrumb, and the Markdown editor.

## 8. Verification

- [x] 8.1 Run `pnpm --filter web test -- --run` and confirm all new and existing Vitest specs pass. _(79 files / 366 tests pass.)_
- [x] 8.2 Run `pnpm --filter web typecheck` and `pnpm lint` and confirm no new errors. _(typecheck clean; `biome check` clean on every touched file under `apps/web/src/components/applications/` and `apps/web/src/app/dashboard/applications/new/`; remaining repo-wide lint errors are pre-existing and outside this change.)_
- [x] 8.3 Run `pnpm --filter web build` and confirm the production build still succeeds (catches accidental dynamic-import regressions around `MDXEditor`). _(`/dashboard/applications/new` is statically prerendered, no build regressions.)_
- [ ] 8.4 Manual visual check at narrow (≤ 640 px) and wide (≥ 1024 px) viewports: the breadcrumb fits; the Cancel button sits at the top-right; the segmented row is a single row; the Markdown editor toolbar is reachable; the file picker shows the chosen file's metadata.
- [ ] 8.5 Manual check: with the AI agent unconfigured, the gate message still renders (regression guard for the existing prepare-application-form.test.tsx case).

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — none of the existing scenarios depend on the intake form's authoring surface. They assert API contract (`POST /applications/prepare` accepts `url`, `text`, `message`, `sourceCvId`, `file`; size limits; `400` on missing content), which is unchanged by this change.
- All `apps/api/test/e2e/*.e2e-spec.ts` scenarios for auth, CV CRUD, export, media, and import — none of them exercise the intake page chrome; the change is purely client-side authoring surface.

### Update required

- None — the API contract, accepted payload shape, validation rules, and 5 MB cap are all unchanged.

### Add

- None — this is a UI-only change. New coverage lives in Vitest unit tests colocated with the components (see Tasks 6.1–6.4). E2E scenarios for the intake form's segmented control, Cancel button, or Markdown editor are not added because they are client-side authoring concerns that do not extend the API contract.

If a reviewer later wants E2E coverage for the intake flow, that is a follow-up change with its own proposal and tasks.
