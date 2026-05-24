## Context

Resumind stores each CV as a single JSON Resume document in `public.cv.data` (JSONB). The Nest API exposes document-level CRUD (`POST/PATCH/DELETE /cv/:id`) with schema validation and `meta.version` optimistic concurrency. The web editor (`CvEditor`) mirrors the whole document in React state and saves via one **Save CV** action.

Authors expect management-tool semantics: edit one work entry, save it, see it persisted; add a highlight without touching unrelated sections. The MIT-style resume preview (bold left column, dates/locations right, bullet highlights) is the mental model for **view mode**; forms appear only during create/edit.

Constraints: SPA talks only to Nest (no direct Supabase); validation stays on full resume after each mutation; existing `cv-editor-ui` field order, country picker, Wysimark, and media upload patterns remain.

## Goals / Non-Goals

**Goals:**

- Immediate persistence per item operation (create / update / delete) for all product-listed entity types.
- Resume-layout **view rows** with Edit → inline form → Save/Cancel; Create form at section bottom; Delete with confirmation.
- One **`TagsInput`** component for all string-list fields: `skills[].keywords`, `interests[].keywords`, `projects[].keywords`, and `projects[].roles`.
- Nest routes and web client helpers named consistently per entity.
- Preserve version conflict detection and JSON Resume validation on every write.

**Non-Goals:**

- Normalized SQL tables per resume section (JSONB document model stays).
- Real-time multi-user collaboration or operational transforms.
- Offline queue / sync engine.
- Separate CRUD endpoints for individual tag strings (tags save with their parent entity PATCH).

## Decisions

### 1. Item identity → array index in API paths

Resume arrays have no stable server ids in JSON Resume. **Use numeric indices** in URLs (`/cv/:cvId/work/2`, `/cv/:cvId/work/2/highlights/1`). The API returns the **updated full section array** (or CV fragment) after each mutation so the client reindexes.

Alternatives discarded: embedding `_id` in JSON (non-standard schema); client-only PATCH of whole document (does not meet “calling the service per item” clarity).

### 2. API surface → nested REST under `/cv/:cvId`

| Entity                                                                         | Create                                   | Update                              | Delete                               |
| ------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------- | ------------------------------------ |
| Basics                                                                         | — (always exists)                        | `PATCH .../basics`                  | —                                    |
| Profile                                                                        | `POST .../profiles`                      | `PATCH .../profiles/:index`         | `DELETE .../profiles/:index`         |
| Work                                                                           | `POST .../work`                          | `PATCH .../work/:index`             | `DELETE .../work/:index`             |
| Work highlight                                                                 | `POST .../work/:wi/highlights`           | `PATCH .../work/:wi/highlights/:hi` | `DELETE .../work/:wi/highlights/:hi` |
| Volunteer                                                                      | same pattern as Work                     |                                     |                                      |
| Volunteer highlight                                                            | nested under volunteer                   |                                     |                                      |
| Education                                                                      | `POST/PATCH/DELETE .../education/:index` |                                     |                                      |
| Education course                                                               | nested under education                   |                                     |                                      |
| Skill, Project, Award, Certificate, Publication, Language, Interest, Reference | top-level array CRUD                     |                                     |                                      |
| Project highlight                                                              | nested under project                     |                                     |                                      |

Request bodies carry entity DTO fields only (no full resume). Optional query/body field `version` carries `meta.version` for conflict checks (same semantics as today).

Implementation: **`CvItemService`** with shared `mutateCvData(user, cvId, mutator)` that loads row, applies change, validates, bumps meta, persists.

### 3. CV title → separate lightweight save

Document title (`cv.title` column) is not JSON Resume. Keep **`PATCH /cv/:id`** with `{ title }` only, or a dedicated `PATCH /cv/:id/title`. Title edits save on blur or explicit small save—not bundled with section saves.

### 4. Frontend architecture → section controllers + shared primitives

- **`ResumeItemRow`**: view layout (title left, meta right, bullets below, action menu Edit/Delete).
- **`ResumeItemForm`**: wraps existing field components; Save calls typed API; Cancel restores view.
- **`SectionCreateForm`**: collapsed “Add …” expands form at bottom; Save → `POST`.
- **`TagsInput`**: chip input for string arrays; value commits on parent entity save (not per-tag API calls).
- **`useCvItemMutation`**: loading/error/toast + version refresh hook shared across sections.
- **`CvEditor`**: loads CV once; passes `cvId`, `version`, and section data; **removes global Save CV** for resume body (title exception above).

### 5. Delete UX → AlertDialog confirmation

All deletes use shadcn **`AlertDialog`** (“Are you sure?”) before `DELETE` request. Optimistic UI optional; on failure, reload section from server.

### 6. New CV flow

`/dashboard/cv/new` creates empty CV via existing `POST /cv`, then redirects to `/dashboard/cv/:id` where granular editing applies. No bulk unsaved state on new page.

## Risks / Trade-offs

| Risk                                    | Mitigation                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Index drift after concurrent edits      | Return fresh arrays + version; 409 prompts reload (existing behavior)                                |
| Many API round-trips                    | Acceptable for management UX; debounce not used on explicit Save                                     |
| Large controller surface                | Group in `CvItemsController` + service; shared tests for mutate helper                               |
| Partial migration (some tabs still old) | Implement all listed sections in one change; feature-flag not required                               |
| Highlight/course as string vs rich text | Highlights remain plain strings (bullets in view); Wysimark only where already used on parent fields |

## Migration Plan

1. Ship Nest item routes and tests behind existing auth guard.
2. Add client API functions and shared UI primitives.
3. Refactor `cv-sections.tsx` tab by tab; remove monolithic save from `cv-editor.tsx`.
4. Manual QA: create/edit/delete each entity type (including references); tags on skill/project/interest; version conflict reload.
5. Rollback: restore `CvEditor` bulk save and hide item routes (routes can remain unused).

## Open Questions

- Whether Basics `summary` Wysimark save should PATCH on blur or explicit Save button (recommend explicit Save in form row).
- Whether Social Profiles tab stays separate or merges into Basics view rows (keep separate tab per existing `cv-editor-ui` spec).
- Auto-save for CV title field vs dedicated save icon.
