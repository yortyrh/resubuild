## Why

After normalized CV storage lands, five non-date sections persist display order in a `sort` column and expose reorder API endpoints, but the editor offers no way to change that order. Users need drag-and-drop (and keyboard) controls to reorder Profiles, Skills, Languages, Interests, and References without editing unrelated fields or relying on insertion order alone.

## What Changes

- Add a shared React sortable list component (`SortableManagedArraySection`) with drag-and-drop and keyboard move-up / move-down in view mode.
- Wire the component into the five editor tabs: Social profiles, Skills, Languages, Interests, References.
- Call existing reorder API endpoints (`PUT /cv/:cvId/{section}/reorder` from `normalize-cv-database`) via the web API client; refresh local section state and version on success.
- Reflect new order immediately in section lists and preview without full-page reload.

**Prerequisite:** `normalize-cv-database` MUST be implemented first (requires `sort` columns, auto-assignment on create, stable row ids, and reorder API endpoints).

**Out of scope:** API implementation, database schema, reorder persistence logic, or reordering date-primary sections (Work, Volunteer, Education, Projects, Awards, Certificates, Publications).

## Capabilities

### New Capabilities

- `cv-section-reorder`: Editor UX for manual ordering of non-date CV entities via drag-and-drop and keyboard controls.

### Modified Capabilities

- `cv-editor-ui`: Social profiles, Skills, Languages, Interests, and References tabs support drag-and-drop and keyboard reorder in view mode.

## Impact

- **Depends on:** `openspec/changes/normalize-cv-database` (normalized tables, `sort` column, reorder API).
- **Web:** `SortableManagedArraySection` (or extension of `ManagedArraySection`), section components in `cv-sections.tsx`, `cv-item-api.ts` client helper; new dependency `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Testing:** Component tests for sortable list; manual QA verifying export/preview order matches UI order.
- **No API changes** in this change set.
