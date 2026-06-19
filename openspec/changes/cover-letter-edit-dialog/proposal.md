## Why

This change retroactively documents work already implemented in the working tree. The Cover letter tab on the application workspace was rendering an always-editable `MarkdownEditor` plus a "Save letter" button, while local `useState` mirrored the server value into a `letterDraft` so the editor and the API could both see the same string. That bidirectional state was the only place in the workspace where two sources of truth had to stay in sync — every action (print, copy) had to reconcile them by re-reading the latest server value. It also pushed the entire editor surface into the tab, so long letters pushed the rest of the workspace out of view and the toolbar floated over the content without a clear surface boundary.

This change collapses the cover-letter flow to a single source of truth (the react-query cache for `application`), moves editing into a dedicated dialog, caps the read-only preview so long letters stay inside the tab, and tightens the MDXEditor toolbar chrome so it reads as a proper tool strip instead of icons floating over content.

## What Changes

- **Cover letter tab reads via `MarkdownView`** instead of an inline `MarkdownEditor`. The `data.coverLetter` field from the `useQuery` cache is the single source of truth.
- **New `ApplicationLetterEditDialog`** (Radix Dialog) hosts the existing `MarkdownEditor` (block variant). It owns its own draft state, seeds it from `initialValue` on every open, and calls `updateApplicationLetter` via `useMutation`. On success it writes the returned `JobApplicationSummary` into `['application', id]` with `setQueryData` (no extra GET) and closes.
- **Edit button** added before **Copy letter** in the cover-letter action bar. Disabled while `updateInProgress` is true, matching the Update button.
- **Read-only preview cap**: the `MarkdownView` in the cover-letter tab is wrapped in `max-h-[60vh] overflow-y-auto pr-1` so long letters scroll inside the panel rather than expanding the tab.
- **MDXEditor toolbar polish** (global CSS): solid `hsl(var(--muted))` background with a bottom border separator, sticky positioning inside the editor's scroll container, rounded top corners that match the editor shell, multi-row wrap support (no `overflow: hidden`), hover and pressed states for toolbar buttons, and a matching hover state for the Block-type select trigger.
- **Removed**: `letterDraft` / `saving` / `markdownEditorRef` / the bidirectional sync `useEffect` / the inline Save letter button / the `MarkdownEditor` import + mock in the workspace tests.

## Capabilities

### Modified Capabilities

- `application-workspace-tabs`: the Cover letter tab no longer renders the `MarkdownEditor` or a Save letter button; it renders the read-only `MarkdownView` and exposes an Edit action that opens a dedicated edit dialog. The cover-letter actions (Edit, Copy letter, Print, PDF) remain in the action bar.
- `cv-editor-ui`: the rich-text editor toolbar now presents a solid surface (background, border separator, sticky positioning) with hover and pressed states for toolbar items; the editor shell preserves its square inner corners while the toolbar alone gets rounded top corners.

### New Capabilities

None — the dialog is implementation detail behind the modified `application-workspace-tabs` capability.

## Impact

- `apps/web/src/components/applications/application-workspace.tsx` — replace inline editor with `MarkdownView`, add dialog wiring, remove `letterDraft` / `saving` / `markdownEditorRef` and the sync effect, switch `copyRichText` + `printLetter` to read `data.coverLetter`.
- `apps/web/src/components/applications/application-letter-edit-dialog.tsx` (new) — modal with `MarkdownEditor`, `useMutation`, `setQueryData` write-back.
- `apps/web/src/components/applications/application-letter-edit-dialog.test.tsx` (new) — covers initial seed, save round-trip, closed dialog.
- `apps/web/src/components/applications/application-workspace.test.tsx` — swap `MarkdownEditor` mock for `MarkdownView`, mock new dialog, drop `updateApplicationLetter` mock, add cover-letter ordering / read-only / disabled-while-updating tests.
- `apps/web/src/app/globals.css` — MDXEditor toolbar styling.
- No API changes; `updateApplicationLetter` already returns the updated `JobApplicationSummary`.
- No backend / migration / package changes.
