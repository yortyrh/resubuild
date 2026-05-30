## Why

This change retroactively documents work already implemented in the working tree.

JSON export landed on the preview page (`jsonresume-export`), but users editing a CV still had to open preview to download PDF or JSON. The editor header now exposes **Export** and **Preview** together; the remaining diff tightens mobile/tablet layout (icon-only labels, Export before Preview).

## What Changes

- **`CvEditorHeaderActions`** — shared toolbar with **Export** dropdown (Download PDF / Download JSON) and **Preview** link to `/dashboard/cv/[id]/preview`.
- **`CvEditorChrome`** — responsive header row: breadcrumb wraps on small viewports; actions align right (full width on mobile, inline from `sm`).
- **Responsive labels** — below `lg`, Export and Preview show icons only with `aria-label`; text labels appear from `lg` up.
- **Button order** — Export appears before Preview (export-first on the left of the pair).

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `cv-editor-ui`: Editor chrome export/preview toolbar behavior and responsive layout.

## Impact

- **Web**: `apps/web/src/components/cv/cv-editor-header-actions.tsx`, `cv-editor-header-actions.test.tsx`, `cv-editor-chrome.tsx`
- **No API or database changes**
- **No E2E changes** (UI-only; existing export E2E covers endpoints)
