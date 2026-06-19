## Context

The application workspace at `/dashboard/applications/[id]` has a Cover letter tab that historically rendered the `MarkdownEditor` inline. The workspace owned `letterDraft` in `useState`, seeded it via a `useEffect` that watched `data?.coverLetter`, and pushed the same value back into the editor through an imperative `markdownEditorRef.current?.setMarkdown(...)` whenever the server data refreshed. Save triggered a `PATCH /applications/:id` followed by `invalidateQueries`, and Print/PDF paths used the same draft as a fallback while also calling the API. The result was two coupled sources of truth (cache + local state) plus an imperative ref bridge.

The diff removes the local draft, removes the imperative ref push, and replaces the inline editor with `MarkdownView`. Editing now happens in `ApplicationLetterEditDialog`, a new Radix Dialog that mounts the editor only while open. The mutation response (`JobApplicationSummary`) is written directly into the cache via `setQueryData`, so the read-only view re-renders without a refetch.

The MDXEditor toolbar (`_toolbarRoot`) was rendering with a transparent background, `height: 36px !important`, and `overflow: hidden !important`. With the wide Block-type select trigger on small surfaces, items wrap to a second row but get clipped — sometimes bleeding over the contentEditable area. The new styling gives the toolbar its own surface, makes it sticky, and lets it wrap naturally.

## Goals / Non-Goals

**Goals:**

- One source of truth for the cover letter: the react-query cache.
- Edit via a focused dialog; the tab stays read-only.
- Re-render the read-only view from the mutation response without an extra GET.
- Cap the cover-letter preview so long letters stay inside the tab.
- Make the MDXEditor toolbar visually distinct from the content (own surface, separator, hover/pressed states) without breaking the existing square-corner rule for the rest of the editor shell.

**Non-Goals:**

- No new endpoint; the existing `PATCH /applications/:id` (which already returns `JobApplicationSummary`) is reused.
- No redesign of the toolbar's contents; only its visual treatment and positioning.
- No changes to the Prepare Application form's cover-letter authoring surface — that uses the same `MarkdownEditor` with its own simpler chrome and is out of scope.

## Decisions

- **Single source of truth = react-query cache, not local state.** The previous `letterDraft` + `setMarkdown` ref push was the only reason the workspace needed a useState mirror. Removing it lets the cache be authoritative: the read-only view, the Copy/Print/PDF actions, and the Edit dialog all read the same `data.coverLetter`. The Print path no longer needs a "save pending edits before print" branch.

- **Editing lives in a dedicated dialog.** Three reasons: (1) it removes the editor chrome from the workspace tab when the user is not editing, which is most of the time; (2) it gives the editor a viewport-sized surface (the dialog caps at `max-h-[100dvh]` and scrolls inside) so long letters can be authored without driving the rest of the page; (3) it scopes local edit state to the lifetime of one open/edit/close cycle, which is exactly the lifetime the cache mutation is allowed to write back.

- **Mutation writes back to the cache directly.** `updateApplicationLetter` already returns the updated `JobApplicationSummary` from the API. `setQueryData(['application', applicationId], updated)` replaces the cache entry, and react-query re-renders all subscribers (the workspace read-only view, any other open tabs reading the same key) without a refetch. This avoids a `invalidateQueries` round-trip and is what removes the "double rendering" pain point from the previous code.

- **Dialog state lifecycle.** The dialog owns a `useState(initialValue)` for the editor draft and re-seeds it whenever `open` flips to true via a `useEffect`. Closing the dialog (Cancel, Escape, X) discards unsaved edits by design — the mutation is the only path that writes back to the cache. This is the simplification the user asked for: an edit either succeeds via the mutation and shows up in the read-only view, or it doesn't, and the user opens the dialog again.

- **Editor area inside the dialog is the only scroll region.** The dialog body is `flex flex-col max-h-[100dvh]`. Header is fixed at top, footer (Save button) is fixed at bottom, and the editor wrapper is `min-h-0 flex-1 overflow-y-auto` so it absorbs the rest of the viewport. Without `min-h-0` the flex child would expand to its content and defeat the scroll.

- **Toolbar background uses the `muted` token, not a translucent overlay.** `hsl(var(--muted) / 0.5)` was tried first but read as a translucent overlay over the content. The solid `hsl(var(--muted))` gives a definite surface in both light and dark mode (`hsl(240 4.8% 95.9%)` light, `hsl(240 3.7% 15.9%)` dark) and matches the rest of the dashboard chrome.

- **Toolbar is sticky inside the editor's scroll container.** `position: sticky; top: 0` works because the editor is always wrapped in some scroll region (the dialog body for the cover-letter flow, or naturally the page for other consumers). The toolbar stays visible while the user scrolls long letters, but does not bleed outside the editor shell.

- **Toolbar can wrap onto multiple rows.** The previous `height: 36px !important; overflow: hidden !important;` was a contradiction with `flex-wrap: wrap`. The new rule drops both, sets `min-height: 2.25rem` so the toolbar still has a sensible baseline, and lets the Block-type dropdown push onto a second row when needed without clipping.

- **Toolbar button affordance.** Rounded `0.3125rem` corners, muted text color, `:hover` background that bumps to `hsl(var(--background) / 0.7)`, and an `on` / `pressed` state for `data-state='on'` / `aria-pressed='true'` MDXEditor toggles. The Block-type `selectTrigger` gets the same hover treatment so the dropdown reads as part of the same chrome.

- **Square corners for the rest of the editor shell stay.** The previous global rule forced every `> *` child of `.mdxeditor` to `border-radius: 0`. The new rule only clears the contentEditable's top two corners, which keeps the toolbar's rounded top corners intact without leaking the change to other inner shells.

- **Cover-letter preview cap is in the workspace, not the component.** `max-h-[60vh] overflow-y-auto pr-1` wraps the `MarkdownView` at the call site. The component itself stays unconstrained because it is also used by CV preview rows that legitimately want to grow.

## Risks / Trade-offs

- **Discarding unsaved edits on dialog close.** A user who types and clicks Cancel loses their work. Mitigated by the "X / Cancel / Escape" affordances being the only ways to close, and by the Save button being the only path that persists. The alternative (auto-save on every keystroke) would generate noise on the server and conflicts with concurrent edits.

- **Editor reload on dialog reopen.** MDXEditor reads its `markdown` prop once on mount. We re-seed via the `useEffect` and rely on a fresh mount each time the dialog opens (Radix Dialog unmounts content on close when not configured to keep mounted). Verified via the dialog test: opening, editing, saving, reopening all start from the new server value.

- **Toolbar sticky inside the editor.** `position: sticky` only engages inside a scroll container with overflow. If a future consumer of `MarkdownEditor` places the editor in a layout with no scroll wrapper and the page itself never scrolls, the toolbar will still render at the top of the editor (its static position), which is the desired behavior in that case.

- **CSS specificity on the editor toolbar.** MDXEditor v3.55 uses CSS modules with hashed class names (e.g. `_toolbarRoot_1e2ox_162`). The existing selector `[class*='_toolbarRoot']` continues to work; the new `!important` declarations override the library defaults without leaking to other `_root_*` classes.

- **No back-end change.** The existing `PATCH /applications/:id` returns `JobApplicationSummary`; the cache write uses that response directly. If the API contract changes (e.g. return only the updated field), the cache write would need to merge instead of replace. That change is out of scope here.

## Migration Plan

No migration required. The change is client-side only and the API contract is unchanged. The user-visible behavior shifts from "always editable inline" to "read-only preview with an Edit dialog"; existing saved letters render unchanged.

Rollback: revert the three commits (docs, feat, archive) — the previous `letterDraft`-based behavior is recovered bit-for-bit.

## Open Questions

- Should the Edit dialog also expose a "Restore original" / reset action against a stored initial letter? Out of scope for this change; deferred.
- Should the read-only preview cap be configurable per-user (e.g. remembered in localStorage)? The `60vh` default is a pragmatic cap; per-user preference is a future enhancement.
