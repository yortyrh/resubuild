## Context

Inline Wysimark editors power highlight bullets in Work, Volunteer, and Projects via `StringListField` with `markdown={true}`. The current layout places a full **Remove** button in a flex row beside the editor, which competes for horizontal space and breaks on narrow cards. CSS and `useEditor` options were tuned for single-line density (`minHeight: 36`, `maxHeight: 72`, zeroed Slate block margins, `calc(1.9em + 1px)` toolbar height). `MarkdownEditorImpl` also implements Slate focus retries (immediate focus, `MutationObserver`, 16ms polling up to ~2s) driven by `autoFocus` and `focusRequestId`—added in `cv-editor-ux-polish` but not wired from `StringListField` today.

## Goals / Non-Goals

**Goals:**

- Overlay remove as a small icon at the editor's top-right with adequate hit target and `aria-label`.
- Restore natural multiline editing in inline variant while staying visually smaller than block editors (font, padding, toolbar icon scale).
- Delete custom focus orchestration and unused props from the markdown editor public API.
- Keep plain-text `StringListField` behavior unchanged (side Remove button, Enter-to-add-row focus).

**Non-Goals:**

- Changing block-variant editors (Work description, Basics summary).
- Replacing Wysimark or altering toolbar presets.
- Keyboard shortcuts for markdown rows (Enter still does not add rows when `markdown` is true—unchanged).

## Decisions

### 1. Remove control lives on `StringListField`, not inside `MarkdownEditor`

**Choice:** Wrap each markdown row in `relative` container; position `Button` with `Trash2` (or existing icon set) `absolute top-1 right-1` (or similar) with `z-10` and ghost/icon size. Add right padding on the editor wrapper so text does not sit under the icon.

**Alternatives:** Embed remove inside `MarkdownEditorImpl`—rejected because remove is list semantics, not editor semantics.

### 2. Multiline inline via heights + CSS, not Slate hacks

**Choice:** Set inline `useEditor` options to modest multiline bounds (e.g. `minHeight: 56`, `maxHeight: 120`—tune in implementation). Remove `.rich-text-editor--inline [data-slate-node='element']` margin/padding zeroing. Keep smaller `font-size` on `.rich-text-editor--inline > .border` and compact toolbar button rules from `globals.css`.

**Alternatives:** Keep 36–72px clamp—rejected per user feedback.

### 3. Strip custom focus logic entirely

**Choice:** Delete `focusSlateEditor`, the `useEffect` focus loop, and props `focusRequestId` / `onFocused`. Remove `autoFocus` from `MarkdownEditorProps` unless another caller needs it—grep shows only `markdown-editor-impl` defines it; country/language fields use native `autoFocus` on inputs, not markdown. If `autoFocus` has zero callers after cleanup, remove it and any `slate`/`slate-react` imports used only for `ReactEditor.focus`.

**Alternatives:** Keep simple `autoFocus` on mount—rejected; user asked to revert custom manipulation.

### 4. Dependencies

If `slate` / `slate-react` were added solely for focus helpers, remove them from `apps/web/package.json` when no longer imported. Verify Wysimark does not require them as direct peers before removal.

## Risks / Trade-offs

- **[Icon overlaps toolbar]** → Pad editor shell top-right; icon sits above content area or toolbar's right edge with transparent ghost button.
- **[Touch targets]** → Use `size="icon"` with min 32px tap area per accessibility guidelines.
- **[Removing slate peers]** → Run `pnpm install` and editor smoke test; keep peers if Wysimark still resolves them at runtime.

## Migration Plan

Single web deploy; no data migration. Verify highlight editing on Work/Volunteer/Projects forms manually after CSS/height changes.

## Open Questions

None—requirements are explicit from product feedback.
