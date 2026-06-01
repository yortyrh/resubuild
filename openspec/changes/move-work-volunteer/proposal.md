## Why

Work and volunteer experiences share the same JSON Resume shape (dates, role, summary, highlights) but live in separate editor tabs. Authors often misclassify an entry or want to recategorize unpaid leadership as volunteer work (or the reverse) without retyping fields. Today they must copy values manually, create a new entry, and delete the old one—a error-prone multi-step flow.

## What Changes

- Add a **Move to Volunteer** action on each saved Work entry row in the CV editor.
- Add a **Move to Work** action on each saved Volunteer entry row in the CV editor.
- On confirm, map shared fields between sections, create the entry in the target section via existing item CRUD, delete the source entry, and refresh both sections in editor state.
- Show a confirmation dialog explaining the target section and that the source entry will be removed.
- Map section-specific fields on transfer:
  - Work → Volunteer: `name` → `organization`; persist `location` and `description` on the volunteer row as hidden storage fields (not shown in the editor or exported to JSON Resume).
  - Volunteer → Work: `organization` → `name`; restore `location` and `description` from hidden storage when present, otherwise leave unset for the author to fill.
- Preserve `position`, `url`, `startDate`, `endDate`, `summary`, and `highlights` unchanged.
- Disable move actions while create/edit/delete/reorder is in progress; hide move on unsaved draft rows without a persisted `id`.

## Capabilities

### New Capabilities

<!-- None — cross-section move is an editor affordance on existing item CRUD -->

### Modified Capabilities

- `cv-editor-ui`: Work and Volunteer entry rows SHALL expose cross-section move actions with confirmation, field mapping, and optimistic UI refresh of both sections.
- `cv-item-crud`: Cross-section move SHALL persist by creating the mapped payload on the target section API and deleting the source item; the operation SHALL fail safely if create fails (source entry remains). Volunteer rows MAY store hidden `location` and `description` for round-trip moves; those fields SHALL NOT appear in JSON Resume export.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-item-ui.tsx` (optional extra row action slot), `managed-array-section.tsx` or dedicated work/volunteer wrappers, new field-mapping helper, confirmation dialog, `work-section.tsx`, `volunteer-section.tsx`, `cv-editor-provider` or query invalidation for both sections.
- **API / DB**: Add optional `location` and `description` columns on `cv_volunteer` (hidden from editor UI and JSON Resume export). No new move routes required if client orchestrates create-then-delete; optional future atomic move endpoint remains out of scope unless rollback pain warrants it.
- **Tests**: Colocated Vitest for field mapping and move orchestration; no E2E contract change if existing work/volunteer CRUD endpoints are reused.
