## Why

The Prepare Application page at `/dashboard/applications/new` is functional but visually inconsistent with the rest of the dashboard. It uses a plain "← Back to applications" link instead of the `Breadcrumb` chrome used on `/dashboard/applications/[id]`, ships a flat list of radio-button rows that force the job source selector (URL / Text / PDF) to wrap awkwardly, uses a raw `<input type="file">` that exposes an OS-native control on top of the form, and renders the long job-description and "Optional instruction" textareas as bare `<textarea>` elements when the same Markdown editor used on the workspace cover letter would give the user a richer authoring surface (formatting, paste-as-markdown, etc.). The "PDF or screenshot" selector and the static placeholder text further signal that the intake has not kept pace with the editor polish added in later changes.

## What Changes

- Replace the "← Back to applications" link in `apps/web/src/app/dashboard/applications/new/page.tsx` with the existing `Breadcrumb` chrome, mirroring `ApplicationWorkspaceBreadcrumb` on `/dashboard/applications/[id]` (`Applications › Preparing application…`).
- Add a top-right **Cancel** button to the page header (next to the "Prepare application" title) that navigates back to `/dashboard/applications` via `<Link>`, mirroring the top-right Cancel in `apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx`. The page SHALL offer navigation back to `/dashboard/applications` from both the breadcrumb (`Applications` link) and the Cancel button — the breadcrumb is the primary affordance, the Cancel button is a quick exit.
- Lay the Job source selector (URL / Text / PDF or screenshot) out on a single row using segmented control styling, with the active control's matching input (URL `Input`, Text markdown editor, File picker) rendered in the same panel below the row.
- Render the **Text** job description input and the **Optional instruction** input with the project's `MarkdownEditor` (variant `block`) so authors get a toolbar (block type, bold/italic/underline/strikethrough, code, links, lists) and Markdown semantics on the intake side, matching the cover letter editor.
- Improve the **PDF or screenshot** file selection UI: show a single "Choose file" trigger (shadcn `Button` with `variant="outline"`) plus the selected file name, size, MIME, and a Remove action, with drag-and-drop affordance. Keep `application/pdf` and `image/{png,jpeg,webp}` accept, 5 MB max, with explicit client-side validation and toast on rejection.
- Update `ApplicationIntakeOptions` ("Optional instruction") to use the `MarkdownEditor` instead of the bare `Textarea`.
- Update `apps/web/DESIGN.md` to note that the Prepare application form uses the same breadcrumb chrome as the application workspace, and that the long text inputs are Markdown editors.
- No API, schema, or auth changes. No new backend endpoint, no new package dependency (the `MarkdownEditor` already wraps `@mdxeditor/editor`).

## Capabilities

### New Capabilities

- `prepare-application-page-ui`: Defines the layout, breadcrumb, Job source segmented control, Markdown editor usage on the intake textareas, and the file selection UI for `/dashboard/applications/new`.

### Modified Capabilities

- `job-application-preparation`: The Prepare Application form at `/dashboard/applications/new` SHALL render a Breadcrumb (Applications › Preparing application…) instead of a back link; SHALL present a top-right Cancel button linking to `/dashboard/applications`; SHALL present the three Job source modes (URL, Text, PDF or screenshot) in a single segmented row; SHALL render the Text job description and the Optional instruction inputs with the project's Markdown editor; and SHALL provide a styled file picker (button + file metadata + remove) for the PDF or screenshot mode. Delta spec only — content-source rules (URL, text, file, base CV) are unchanged.

## Impact

- `apps/web/src/app/dashboard/applications/new/page.tsx` — replace the back link with `Breadcrumb` (or reuse `ApplicationWorkspaceBreadcrumb` with `pageLabel="Preparing application…"`); wrap the breadcrumb + the form's title in a `flex items-start justify-between gap-4` row that also renders a top-right `<Button asChild variant="outline"><Link href="/dashboard/applications">Cancel</Link></Button>` (or, preferred, extract a small `PrepareApplicationHeader` component so the form's `<h1>`/subtitle and the breadcrumb share the same header strip).
- `apps/web/src/components/applications/prepare-application-form.tsx` — restructure the Job source fieldset into a single segmented row + inline control; swap the Text `Textarea` for `MarkdownEditor`; replace the raw `<Input type="file">` with a styled file picker.
- `apps/web/src/components/applications/application-intake-options.tsx` — swap the "Optional instruction" `Textarea` for `MarkdownEditor`; add a small `MessageMarkdownEditor` wrapper or accept the editor as a slot to avoid a third-party dependency in tests where the editor is heavy.
- `apps/web/src/components/applications/prepare-application-form.test.tsx` and `application-intake-options.test.tsx` (if added) — assert the breadcrumb, segmented control selection, and Markdown editor presence.
- `apps/web/DESIGN.md` — add Prepare application form rules under "Applications" table.
- No DB, API, or auth changes.
