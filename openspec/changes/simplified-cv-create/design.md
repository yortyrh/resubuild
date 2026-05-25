## Context

`/dashboard/cv/new` is implemented by `NewCvPageClient`, which runs `createCv({ title: 'Untitled CV', data: createEmptyResume() })` inside a `useEffect` on mount, then `router.replace` to `/dashboard/cv/:id`. The full editor (`CvEditor` + `CvSections`) handles all resume sections with per-item save semantics. Basics editing already lives in `ManagedBasicsSection` with a rich field set (name, label, summary, contact, location, profile photo).

The Nest `POST /cv` endpoint already accepts optional `title` and required `data`, validates via `@resumind/types`, and applies schema meta — no API changes are needed.

## Goals / Non-Goals

**Goals:**

- Present a dedicated **create CV** page with only title + basics fields in a single always-visible form (no view/edit toggle).
- Persist the CV **only** when the user clicks **Save** (or **Create CV**).
- On success, navigate to `/dashboard/cv/:id` for full section editing.
- Reuse existing basics field widgets and validation patterns where practical.
- Avoid orphan empty CV rows from visiting `/dashboard/cv/new` without saving.

**Non-Goals:**

- Changing `POST /cv` contract or create semantics on the API.
- Including work, education, or other tabs on the create page.
- Auto-save or draft persistence in localStorage.
- Bulk migration or cleanup of existing orphan CVs.

## Decisions

### 1. Single-page form instead of auto-create redirect

**Choice:** Replace `useEffect` auto-create with a client form component holding local state until Save.

**Rationale:** Matches user expectation and aligns with granular save UX elsewhere. Eliminates wasted API calls and orphan rows.

**Alternative considered:** Keep auto-create but delete on unmount if basics empty — rejected as fragile (tab close, network races) and still creates transient rows.

### 2. Extract shared basics form fields

**Choice:** Extract a presentational `BasicsFormFields` (or similar) component used by both `ManagedBasicsSection` (edit mode) and the new create form, parameterized with `value` + `onChange` and optional `onProfilePhotoUpload`.

**Rationale:** Avoid duplicating ~15 field definitions; keeps create and edit basics in sync as fields evolve.

**Alternative considered:** Copy-paste fields into create page — rejected for maintenance cost.

### 3. Create payload assembly

**Choice:** On Save, build `data` as `{ ...createEmptyResume(), basics: formBasics }` and call `createCv({ title: trimmedTitle || 'Untitled CV', data })`. Trim title; default title when empty matches existing API default.

**Rationale:** Server applies meta and validation on create; empty arrays from `createEmptyResume()` satisfy schema.

### 4. Profile photo during create

**Choice:** Allow the same upload + URL paste controls as Basics edit. Upload calls `uploadResumeMedia` immediately (media is user-scoped, not CV-scoped); set returned URL on local `basics.image` before Save.

**Rationale:** Photo is part of basics; upload API does not require a CV id.

### 5. Navigation and cancel

**Choice:** Provide **Cancel** linking back to `/dashboard` (or browser back). No API call on cancel.

**Save UX:** Disable Save while submitting; show inline error on failure; toast on success optional (redirect is sufficient feedback).

### 6. Page shell

**Choice:** Update `page.tsx` heading/copy to describe the simplified create flow ("Create a new CV" / subtitle explaining Save creates the CV).

## Risks / Trade-offs

| Risk                                                  | Mitigation                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| User uploads photo then abandons create               | Orphan media rows possible today too; out of scope unless media GC is added later |
| Duplicated validation between create and patch basics | Rely on server validation on POST; client only trims title                        |
| Large form feels heavy for "simplified"               | Single column layout, no tabs; only basics — still fewer fields than full editor  |
| Unsaved changes lost on navigate away                 | Acceptable for v1; optional future "leave site?" prompt                           |

## Migration Plan

1. Add shared basics form fields component; refactor `ManagedBasicsSection` edit branch to use it.
2. Implement `CreateCvForm` + rewrite `NewCvPageClient`.
3. Add unit tests (no fetch on mount; Save calls `createCv` with expected payload; redirect on success).
4. Manual QA: create with/without title, with basics partial fill, cancel leaves no new row, photo upload before save.
5. Rollback: restore auto-create `useEffect` in `NewCvPageClient`.

## Open Questions

- Whether to warn on unsaved form navigation (defer unless product requests).
- Default title placeholder vs required title field (recommend optional with "Untitled CV" fallback, matching API).
