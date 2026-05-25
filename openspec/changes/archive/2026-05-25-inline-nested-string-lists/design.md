## Context

The CV editor uses `ManagedArraySection` for Work, Volunteer, Education, and Projects. Each section renders a resume-preview row in view mode and an inline form on Edit/Create. Highlights (Work, Volunteer, Projects) and courses (Education) were split out into `ManagedNestedStrings` via `renderAfterView`, giving each bullet its own Edit/Delete/Add flow and dedicated nested API routes (`cvWorkHighlightApi`, etc.).

The codebase already has `StringListField` in `form-fields.tsx` for ordered string arrays with Add/Remove rows—used historically and aligned with how `TagsInput` handles keywords/roles on parent save. Parent create/update already sends the full item payload (`toPayload={(item) => item as Record<string, unknown>}`), so `highlights` and `courses` arrays are persisted on parent save without nested endpoints.

## Goals / Non-Goals

**Goals:**

- Edit highlights and courses inside the parent create/edit form only.
- Use `StringListField` with `markdown={true}` for highlights (inline Wysimark) and plain inputs for courses.
- Keep view-mode bullet rendering unchanged in `renderView` body.
- Align persistence with TagsInput: one Save on the parent writes the full string array.

**Non-Goals:**

- Removing or deprecating nested highlight/course API routes (may remain unused by the editor).
- Changing JSON Resume schema or database shape.
- Altering Social profiles or other nested entities that legitimately need separate CRUD.
- Changing `ManagedNestedStrings` for any future nested use unless fully unused (cleanup optional).

## Decisions

### 1. Use `StringListField` in `renderForm`, not a new component

**Rationale:** `StringListField` already supports markdown inline editors and Add/Remove rows—the exact UX requested. Reusing it matches project conventions and the archived cv-editor-ui-simplification work.

**Alternative considered:** Extend `TagsInput` for markdown highlights—rejected because highlights need rich text per row, not comma-separated tags.

### 2. Remove `renderAfterView` for affected sections

**Rationale:** Nested management UI beneath view rows is the behavior being reverted. View mode shows bullets only; all list editing happens in form mode.

**Alternative considered:** Keep view-mode quick-add—rejected as out of scope and inconsistent with parent Save flow.

### 3. Persist via parent entity API only

**Rationale:** Matches `cv-item-crud` TagsInput requirement pattern. Parent PATCH/POST already accepts full `highlights` / `courses` arrays.

**Alternative considered:** Keep nested CRUD for incremental saves—rejected per product request for inline unified editing.

### 4. Filter empty strings on save (optional normalization)

**Rationale:** `StringListField` allows empty rows while editing; before API call, trim and drop blank entries so stored JSON stays clean—same pattern as other list fields if already applied in `toPayload` or section save.

**Implementation note:** If not already normalized, filter in `toPayload` or a small helper shared across sections.

### 5. Field placement in forms

- **Work / Volunteer / Projects:** Highlights field after Summary/Description (Work) or Summary (Volunteer/Projects), with existing hint copy for Highlights where applicable.
- **Education:** Courses field after study-type/area fields, before save actions.

## Risks / Trade-offs

- **[Risk] Users lose per-bullet immediate save** → Mitigation: Parent Save still persists immediately per `cv-item-crud`; one Save writes all bullets—fewer round trips, not deferred document save.
- **[Risk] Unsaved nested edits if user had old UI mental model** → Mitigation: All list changes are draft until parent Save/Cancel; Cancel discards form draft including list edits (existing parent form behavior).
- **[Risk] `ManagedNestedStrings` and nested API client code become dead** → Mitigation: Remove editor usage in this change; optional follow-up to delete unused module and API client exports.
- **[Risk] Empty highlight rows saved** → Mitigation: Trim/filter empty strings on parent save.

## Migration Plan

1. Add `StringListField` to each affected `renderForm` in `cv-sections.tsx`.
2. Remove `renderAfterView` blocks and `ManagedNestedStrings` imports/usages for Work, Volunteer, Education, Projects.
3. Verify create and update payloads include `highlights` / `courses` arrays.
4. Manual QA: create entry with multiple highlights/courses, edit parent, cancel restores view, delete parent removes all nested strings.
5. Remove `managed-nested-strings.tsx` if zero imports remain (optional in same PR or follow-up).

No backend deployment steps required. Rollback: revert frontend changes; nested API routes remain available.

## Open Questions

- None blocking implementation. Nested API route removal can be a separate change if desired.
