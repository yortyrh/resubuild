## Context

The Prepare Application intake lives in two files:

- `apps/web/src/app/dashboard/applications/new/page.tsx` — a server component that renders a back link plus `<PrepareApplicationForm />`.
- `apps/web/src/components/applications/prepare-application-form.tsx` — a client component that owns the Job source fieldset (URL / Text / PDF), the Base CV picker, the Optional instruction textarea, and the submit/progress flow.

The companion `ApplicationIntakeOptions` (`apps/web/src/components/applications/application-intake-options.tsx`) renders the Base CV radios and the "Optional instruction" textarea as bare `<Textarea>`.

The application workspace at `/dashboard/applications/[id]` already shows the right pattern: a `Breadcrumb` (`Applications › <job>`), a tabbed `Tabs` chrome, and the cover letter in a `MarkdownEditor` (`@mdxeditor/editor` via `apps/web/src/components/cv/markdown-editor.tsx`). The intake page was authored before the workspace polish and has not been revisited, so the visual language diverges (textareas vs Markdown editor, back link vs breadcrumb, native `<input type="file">` vs styled picker, vertical list of radios vs segmented control, no top-right Cancel).

The "Import from file" page at `/dashboard/cv/new/import/file` already implements the top-right Cancel pattern via `apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx` — a `flex items-start justify-between` header with the title/subtitle on the left and a `<Button asChild variant="outline"><Link href="/dashboard">Cancel</Link></Button>` on the right. The Prepare application page borrows that pattern but points the Cancel at `/dashboard/applications` (the applications list) rather than `/dashboard` (the CV list).

Constraints:

- The `MarkdownEditor` is a client component and is heavy; rendering two of them in a single form (Text job description + Optional instruction) is acceptable because the same `MDXEditor` instance is already loaded for the cover letter on the workspace. The intake form only mounts after `useAiAgentActive` resolves configured, so the editor bundle is not loaded for users without an active agent.
- `apps/web/DESIGN.md` reserves `surface-soft text-card-foreground` for dashboard panels; the new layout should not introduce bare `rounded-lg border` chrome.
- No backend or schema changes. `POST /applications/prepare` still accepts `url`, `text`, `message`, `sourceCvId`, and `file` — only the client-side authoring surface changes.

## Goals / Non-Goals

**Goals:**

- Breadcrumb chrome on the intake page matches the application workspace (`Applications › Preparing application…`); remove the legacy "Back to applications" link.
- A top-right Cancel button in the page header mirrors the import page's Cancel (`new-cv-layout-chrome.tsx`), navigating to `/dashboard/applications` instead of `/dashboard`.
- Job source modes (URL / Text / PDF or screenshot) render in a single segmented row; the active control's input renders directly below the row.
- Text job description and Optional instruction inputs use the project's `MarkdownEditor` (block variant) so authors get the same toolbar and Markdown semantics as the cover letter on the workspace.
- PDF or screenshot mode uses a styled file picker (Choose file button + selected file metadata + Remove action) with client-side 5 MB cap and MIME validation.
- Update `DESIGN.md` to record the new chrome.
- All new behavior is covered by Vitest specs colocated with the components.

**Non-Goals:**

- New dependency, new package install, or new editor library — reuse the existing `MarkdownEditor`.
- New API endpoint, no payload schema change, no error message change in the API.
- Drag-and-drop file drop (only the affordance is in scope; the actual `drop` handler is a follow-up).
- i18n for the breadcrumb or button labels.
- Dark/light mode adjustments beyond what `surface-soft` and the existing segmented-control styles already give us.

## Decisions

### Decision: Reuse `ApplicationWorkspaceBreadcrumb` with `pageLabel="Preparing application…"`

`apps/web/src/components/applications/application-workspace-breadcrumb.tsx` already supports a static `pageLabel` prop and renders the standard `Breadcrumb` chrome with `Applications` linked to `/dashboard/applications`. The new page uses the same component — no new breadcrumb primitive, no parallel implementation. The back link in `apps/web/src/app/dashboard/applications/new/page.tsx` is removed; the page provides two affordances back to the applications list — the breadcrumb and the top-right Cancel button.

**Alternatives considered:**

- _Inline `<Breadcrumb>` JSX in the page file_: works but duplicates the markup and would drift from the workspace breadcrumb over time. The shared component is the single source of truth.
- _Different label (e.g. "New application")_: rejected for consistency with the existing "Preparing application…" copy used in the workspace's preparing state.

### Decision: Top-right Cancel button mirrors the import page's Cancel pattern

The page header renders a `flex items-start justify-between gap-4` row with the "Prepare application" `<h1>` and subtitle on the left and a shadcn `Button` (variant `outline`) labeled `Cancel` on the right, wrapping a `next/link` `<Link href="/dashboard/applications">`. This mirrors `apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx` (the chrome used by the import file page) but with two differences:

- The Cancel `href` is `/dashboard/applications` (the applications list), not `/dashboard` (the CV list). The import page's Cancel goes to `/dashboard` because the CV library is the "home" for CV flows; for the prepare-application flow the "home" is the applications list.
- The Cancel is rendered by the page file itself (or a tiny `PrepareApplicationHeader` component), not by a shared `NewCvLayoutChrome` — the prepare page lives in the `applications/` tree, not `cv/new/`, so it does not inherit the CV-create layout.

The Cancel button does not submit the form. It is a navigation affordance only; it remains visible while a prepare is in flight (the in-flight job continues to run if the user navigates away).

**Alternatives considered:**

- _Reuse the existing `NewCvLayoutChrome` and pass a custom `cancelHref` prop_: would force the prepare page into the `cv/new` layout tree, which is wrong because the route is `dashboard/applications/new`. The cancel pattern is small enough to inline.
- _A separate `<X>` icon button in the page header_: matches some design systems but breaks parity with the rest of the dashboard (every other "exit" affordance in the project uses a labeled `Button`).

### Decision: Segmented control for Job source using a shadcn `Tabs` look-alike

The Job source fieldset becomes a single-row segmented control with three buttons styled like the active/inactive tabs in `apps/web/src/components/ui/tabs.tsx`. We do **not** use the Radix Tabs primitive here because the segmented control drives which input panel renders below, not which Radix panel mounts. The implementation is a row of three `Button` (variant `ghost` for inactive, `default`/subtle for active) inside a `surface-soft` strip, with `aria-pressed` for assistive tech.

**Alternatives considered:**

- _Native `<input type="radio">` list (current behavior)_: matches HTML semantics but produces the vertical wrapping the change is fixing.
- _Shadcn `Tabs` primitive_: would require us to map each tab to a `TabsContent`, which conflicts with the "one input panel below" pattern (Text job description and Optional instruction live in different fieldsets, not under different tabs).

### Decision: `MarkdownEditor` for the Text job description and the Optional instruction

Both inputs use `MarkdownEditor` with `variant="block"`. The `MarkdownEditor` is a `forwardRef` component; we do not need a ref here because the parent owns the string state and passes it as `value`/`onChange`. The component already provides the standard block toolbar (block type, bold/italic/underline/strikethrough, code, link, lists) used on the workspace cover letter.

For the test environment, the existing `markdown-editor.test.tsx`/`markdown-editor-impl.test.tsx` patterns mock `@mdxeditor/editor` lazily. The intake test files can rely on the same lazy import or use `vi.mock('@/components/cv/markdown-editor', () => ({ MarkdownEditor: (props) => <textarea data-testid="md-editor" value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value)} /> }))` to keep tests fast and not pull in the editor.

**Alternatives considered:**

- _Keep the existing `<Textarea>` and add a Markdown preview alongside_: doubles the vertical space and adds a second editor pattern.
- _Plain `<Textarea>` with monospace styling_: explicitly rejected — the user asked for the Markdown editor, and the project already has one in `cv/markdown-editor.tsx`.

### Decision: Styled file picker as a small wrapper around `<Input type="file">`

The PDF or screenshot mode replaces the bare `<Input type="file">` with a small wrapper that:

1. Renders a shadcn `Button` (variant `outline`) labeled "Choose file" that triggers a hidden `<Input type="file" ref={inputRef}>`.
2. Shows the selected file's name, size (formatted to KB/MB with `Intl.NumberFormat` or a tiny helper), and MIME type next to the button.
3. Shows a Remove (X) icon button when a file is selected that clears the file state.
4. Validates the selected file in `onChange`: rejects files larger than 5 MB or with a MIME type outside `application/pdf | image/png | image/jpeg | image/webp` with a `toast.error(...)` and leaves the state untouched.

The wrapper lives in a new `apps/web/src/components/applications/prepare-application-file-picker.tsx` (or inline in `prepare-application-form.tsx` if it stays under ~50 lines — see Risks). The wrapper hides the native file input behind a `Button` via `useRef` + `.click()` so the OS picker still works.

**Alternatives considered:**

- _Drop zone with drag-and-drop_: explicitly out of scope per the proposal.
- _Replace the native picker with a custom dialog_: rejected — adds dependency on a dialog primitive and breaks the OS file picker affordances users expect.
- _Use shadcn `Input type="file"` as-is_: that primitive is just a thin wrapper around the native control; it does not give us the metadata row or the Remove action.

### Decision: Add a small helper `formatBytes(bytes: number)` (or reuse an existing one) for the file size display

A two-line `Intl.NumberFormat` based helper, exported from `apps/web/src/lib/format.ts` (or added to an existing file). The file picker's metadata row formats sizes like `2.3 MB` or `412 KB`.

**Alternatives considered:**

- _Inline format in the component_: fine, but the helper is more reusable and testable. We co-locate a Vitest spec for it.

## Risks / Trade-offs

- [Two `MarkdownEditor` instances on the same page may inflate the initial JS payload] → Acceptable: the same `MDXEditor` plugin bundle is loaded once; the second instance shares the bundle. Worst case the intake is heavier than today, but the user explicitly asked for the editor.
- [Test runtime grows because `MDXEditor` is heavy] → Mitigation: tests mock `MarkdownEditor` (see Decision above). The runtime hit is a Vitest config concern, not a production concern.
- [The segmented control diverges from the shadcn `Tabs` styling] → Mitigation: we follow the same `bg-muted` / `data-[state=active]` patterns from `ui/tabs.tsx` so the look matches.
- [The intake form used to submit empty string for `message` when the textarea was empty; the editor's `onChange` may emit a different sentinel] → Mitigation: the editor's `onChange` is called with the current Markdown string, including the empty string. The submit handler keeps the existing `message || undefined` guard so behavior is unchanged.
- [The styled file picker's hidden native input may not pick up keyboard activation (Space/Enter) the same way the visible control does] → Mitigation: the trigger is a real `<Button>` so it gets keyboard activation for free; the hidden `<input type="file">` is `tabIndex={-1}` and `aria-hidden`.
- [A user clicks Cancel while a prepare is in flight and expects the job to stop] → Acceptable: the spec explicitly states Cancel is a navigation affordance, not a job-cancel action. The in-flight job continues to run; the user can return to the applications list to see it. (Job cancel is a separate API/UI feature, not in scope here.)

## Migration Plan

No data migration. Rollout:

1. Land the new components behind the existing `/dashboard/applications/new` route; no flag, no toggle.
2. Roll back by reverting the commit; the previous textarea + native file picker + back link restore cleanly because the components live in their own files.
3. `DESIGN.md` is updated in the same change so the new chrome is documented before any reviewer can confuse it for an oversight.

## Open Questions

- None at proposal time. If we later want a drag-and-drop file drop zone, that is a follow-up change (same `PrepareApplicationFilePicker` component, extended with a `drop` handler) — out of scope here.
