## Why

Work highlights, volunteer highlights, project highlights, and education courses are edited today via `ManagedNestedStrings`—separate view rows with their own Edit/Delete/Add flows beneath each saved parent entry. That splits one logical entry into two editing surfaces, adds extra API calls per bullet, and feels disconnected from the parent create/edit form. Authors expect highlights and courses to behave like other string lists on the parent (similar to project keywords): edited inline while creating or editing the parent entry, then saved together on parent Save.

## What Changes

- Move **highlights** editing for Work, Volunteer, and Projects into each section's parent **create/edit form** using the shared `StringListField` with inline markdown rich text (`markdown` variant).
- Move **courses** editing for Education into the parent **create/edit form** using `StringListField` with plain text inputs (no markdown).
- Remove `ManagedNestedStrings` usage (and `renderAfterView` hooks) for highlights and courses in those four sections; view mode continues to show bullet lists in the resume-preview row body.
- Persist highlights and courses when the **parent entity** is saved (create or update), matching the TagsInput pattern for keywords/roles—no per-item nested CRUD from the editor UI.
- Retain contextual field hints for Highlights on Work and Projects per existing sparse-field guidance.

## Capabilities

### New Capabilities

<!-- None — UX realignment within existing CV editor and item CRUD -->

### Modified Capabilities

- `cv-editor-ui`: Highlights (Work, Volunteer, Projects) and courses (Education) SHALL be edited inline inside parent create/edit forms via `StringListField`, not as separate nested item rows beneath view mode.
- `cv-item-crud`: Highlights and courses SHALL persist as ordered string arrays on the parent entity save, consistent with TagsInput string lists; the editor SHALL NOT invoke separate Work Highlight, Volunteer Highlight, Project Highlight, or Education Course CRUD endpoints for routine authoring.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-sections.tsx` (wire `StringListField` into `renderForm`, remove `renderAfterView` + `ManagedNestedStrings` for affected sections); `managed-nested-strings.tsx` may become unused and removable if no other consumers remain; `form-fields.tsx` (`StringListField` already exists).
- **Client API**: `apps/web/src/lib/cv-item-api.ts` — nested highlight/course helpers unused by editor (may remain for backward compatibility or be cleaned up in a follow-up).
- **Backend**: No required API changes for MVP—parent work/volunteer/education/project update payloads already accept `highlights` / `courses` arrays. Nested sub-resource routes may remain but are out of editor scope.
- **Tests**: Update component tests covering Work/Volunteer/Education/Projects form rendering if present.
- **No schema or database changes**.
