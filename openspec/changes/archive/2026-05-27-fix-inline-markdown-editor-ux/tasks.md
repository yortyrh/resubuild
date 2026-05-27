## 1. String list layout

- [x] 1.1 In `apps/web/src/components/cv/form-fields.tsx`, wrap markdown `StringListField` rows in `relative` container with top-right icon remove (`Trash2` or project icon) and `aria-label`
- [x] 1.2 Hide side **Remove** button for markdown rows only; keep plain-text row layout unchanged
- [x] 1.3 Add trailing/top padding on editor wrapper so text and toolbar do not sit under the remove icon

## 2. Markdown editor simplification

- [x] 2.1 In `apps/web/src/components/cv/markdown-editor-impl.tsx`, remove `focusSlateEditor`, focus `useEffect`, and props `focusRequestId`, `onFocused`, `autoFocus` (and Slate imports if unused)
- [x] 2.2 Raise inline `useEditor` `minHeight` / `maxHeight` for multiline editing (per design)
- [x] 2.3 Trim exported `MarkdownEditorProps` in `markdown-editor.tsx` if props removed

## 3. Styles

- [x] 3.1 In `apps/web/src/app/globals.css`, remove single-line Slate hacks (e.g. zeroed `[data-slate-node='element']` margins); keep smaller font and compact toolbar icon rules for `--inline`
- [x] 3.2 Relax inline toolbar height from `calc(1.9em + 1px)` to em-based compact height aligned with multiline shell
- [x] 3.3 Add CSS for remove-icon overlay positioning if not fully handled in component classes

## 4. Dependencies and tests

- [x] 4.1 Remove `slate` / `slate-react` from `apps/web/package.json` if no remaining imports
- [x] 4.2 Update colocated tests (`form-fields.test.tsx`, any markdown editor tests) for icon remove and removed focus props
- [x] 4.3 Run `pnpm --filter web test -- --run` for affected packages

## E2E test impact

- **Must pass unchanged** — no API or persistence changes; visual/UX-only editor and list chrome.
- Manual smoke: edit Work highlights with multiline markdown, remove a row via icon, confirm plain-text Education courses still use side Remove.
