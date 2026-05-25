## Why

The CV edit page exposes the document title as a always-visible labeled text field with a separate **Save title** button. That pattern differs from section rows (Basics, Work, etc.), which use a read-only preview with an **Edit** control, inline inputs only while editing, and **Save** / **Cancel** to commit or discard. The mismatch adds visual noise at the top of the editor and makes title changes feel disconnected from the rest of the authoring UX.

## What Changes

- Replace the persistent **CV title** label + input + **Save title** row with a view/edit cycle matching `ResumeItemRow` / `ResumeItemForm` ergonomics.
- **View mode**: Display the current title prominently (typography aligned with section headers) with an **Edit** button.
- **Edit mode**: Show an inline text input for the title with **Save** and **Cancel** actions; **Cancel** restores the last saved title without calling the API.
- **Save**: Persist via existing `updateCv(cvId, { title })` and show the same success/error toasts as today.
- Disable or guard actions while a save is in flight; avoid duplicate submissions.
- Remove the standalone **Save title** button from the default layout.

## Capabilities

### New Capabilities

<!-- None — title editing refinement within existing CV editor UI -->

### Modified Capabilities

- `cv-editor-ui`: The CV edit shell SHALL present the document title in view mode with an Edit affordance and SHALL support inline edit with Save/Cancel consistent with other managed section rows.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-editor.tsx` (title UX refactor); optional small shared component (e.g. `EditableTitle` or reuse of `ResumeItemRow`/`ResumeItemForm` patterns).
- **Tests**: Colocated Vitest tests for view/edit transitions, cancel revert, and save calling `updateCv`.
- **No API, schema, or database changes**.
