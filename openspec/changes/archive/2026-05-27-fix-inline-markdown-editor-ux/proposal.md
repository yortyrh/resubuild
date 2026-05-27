## Why

Recent polish to squeeze inline Wysimark editors into a single-line row (tight CSS, low min/max heights, and a side-by-side Remove button) made highlight/course list editing harder to use than a compact multiline field. Custom Slate focus retries (MutationObserver, polling, `focusRequestId`) add complexity without reliable benefit now that editors load via `next/dynamic`. This change restores a simpler, denser multiline inline editor and moves remove affordances onto the editor chrome.

## What Changes

- **String list remove control**: For markdown `StringListField` rows, replace the right-aligned text **Remove** button with an icon control positioned `absolute` at the top-right of the editor wrapper (plain-text rows keep the existing side button or equivalent).
- **Inline editor layout**: Stop forcing single-line density (zeroed block margins, ultra-tight toolbar height hacks). Allow normal multiline Slate flow with smaller typography, padding, and toolbar icons only.
- **Editor heights**: Raise inline Wysimark `minHeight` / `maxHeight` so authors can enter multiple lines without the previous 36–72px clamp fighting content.
- **Focus behavior**: Remove custom auto-focus orchestration from `MarkdownEditorImpl` (`focusSlateEditor`, MutationObserver, poll loop, `focusRequestId`, `onFocused`). Rely on standard focus behavior or a single optional `autoFocus` passthrough if still needed elsewhere—no retry machinery.
- **CSS cleanup**: Delete counterproductive `.rich-text-editor--inline` rules that collapsed paragraph spacing; keep compact font size and smaller toolbar button sizing.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Inline markdown list rows SHALL use an icon remove control overlaid on the editor; inline Wysimark fields SHALL permit multiline editing at reduced scale; custom Slate mount/focus retry logic SHALL NOT be required for markdown editors.

## Impact

- **apps/web**: `form-fields.tsx` (`StringListField` layout), `markdown-editor-impl.tsx` (heights, focus removal), `markdown-editor.tsx` (prop surface if trimmed), `globals.css` (`.rich-text-editor--inline` rules).
- **Tests**: Update `form-fields` / markdown editor tests if they assert Remove button text or focus props.
- **No API, database, or package changes**.
