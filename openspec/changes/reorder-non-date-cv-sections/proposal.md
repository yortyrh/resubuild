## Why

After normalized CV storage lands, multi-valued sections persist display order in a `sort` column but the editor offers no way to change that order for sections without meaningful dates. Users need to control how Profiles, Skills, Languages, Interests, and References appear on the exported CV without editing unrelated fields or relying on insertion order alone.

## What Changes

- Add reorder API endpoints for five non-date sections: **Profiles**, **Skills**, **Languages**, **Interests**, **References** (maps to `cv_basics_profile`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`).
- Persist reorder by updating `sort` values on normalized rows in a single transaction; bump `cv.meta_version` for optimistic concurrency.
- Add drag-and-drop reorder UI (view mode) in the corresponding editor tabs via a shared sortable list component.
- Expose keyboard-accessible move-up / move-down controls as a fallback alongside drag handles.
- Reflect new order immediately in section lists, assembled export, and preview without full-page reload.

**Prerequisite:** `normalize-cv-database` MUST be implemented first (requires `sort` columns and stable row ids).

**Out of scope:** Reordering date-primary sections (Work, Volunteer, Education, Projects, Awards, Certificates, Publications) — those may later sort by date fields; not part of this change.

## Capabilities

### New Capabilities

- `cv-section-reorder`: Reorder semantics, API contract, allowed sections, concurrency, and editor UX for manual ordering of non-date CV entities.

### Modified Capabilities

- `cv-rest-api`: Add authenticated reorder routes under `/cv/:cvId/{section}/reorder`.
- `cv-item-crud`: Section list UI gains reorder affordances; indices in URLs reflect post-reorder positions.
- `cv-editor-ui`: Social profiles, Skills, Languages, Interests, and References tabs support drag-and-drop and keyboard reorder in view mode.

## Impact

- **Depends on:** `openspec/changes/normalize-cv-database` (normalized tables + `sort` column).
- **API:** `CvItemService` or dedicated reorder handler in `apps/api/src/cv/`; new DTOs and controller routes.
- **Web:** `ManagedArraySection` or successor, section components in `cv-sections.tsx`, `cv-item-api.ts` helpers; new dependency `@dnd-kit/core` + `@dnd-kit/sortable` (or equivalent).
- **Testing:** API e2e for reorder + 409 conflict; component tests for sortable list; verify export order matches `sort`.
