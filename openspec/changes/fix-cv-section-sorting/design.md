## Context

Date-primary CV sections use `sortSectionRows` in `packages/types/src/resume-normalized.ts`, applied when the API loads and assembles sections (`cv-normalized.repository.ts`). Today `sortWorkRows` (and Education/Volunteer/Project variants) sort by **`start_date DESC`**, then `end_date DESC`, then `id ASC`. The OpenSpec `cv-normalized-schema` requirement mirrors this with `start_date DESC` primary.

The web editor displays dates via `formatDateRange` in `cv-section-helpers.tsx`, which shows only the start date when `endDate` is missing (no "Current" label). After create, `ManagedArraySection` refetches the section from the API; after update it merges by id **without re-sorting**, so order can drift until a full refetch. Date edits in the form do not reorder the list until save completes.

User-facing validation for required dates is not enforced in section forms today; JSON Resume schema treats most date fields as optional.

## Goals / Non-Goals

**Goals:**

- Single shared sort contract in `@resumind/types` used by API assembly and web client.
- Ongoing entries (no `endDate`) appear first, then entries by most recent `endDate`.
- Editor shows `{start} – Current` for ongoing date-range sections.
- Block Save on user create/edit when required dates are missing (client-side); show field-level errors.
- Re-sort list immediately when any sort-affecting date changes in the form, and align with server order after mutations.
- Update tests and E2E to match new ordering.

**Non-Goals:**

- Requiring dates on AI import, PDF/URL import, or bulk `POST /cv` with full resume payloads (imports may omit dates; authors fix in editor).
- Server-side mandatory DTO validation that rejects API creates without `startDate` (would break import/agent flows). Optional: soft validation logging only.
- Manual drag reorder for date-primary sections (remains excluded per `cv-section-reorder`).
- Changing sort-backed sections (profiles, skills, languages, interests, references).
- Template-specific date formatting beyond the shared editor helper (templates may keep existing formatters until a follow-up).

## Decisions

### 1. Primary sort key is `end_date` (or single `date` / `release_date`)

**Choice:** Work, Volunteer, Education, Projects: `end_date DESC NULLS FIRST`, then `start_date DESC`, then `id ASC`. Awards/Certificates: `date DESC NULLS LAST`, then `id ASC`. Publications: `release_date DESC NULLS LAST`, then `id ASC`.

**Rationale:** Matches user expectation—current roles first, then most recently ended. NULL `end_date` means "still active" and must rank above any fixed end date.

**Alternative considered:** Keep `start_date` primary — rejected because it pushes ongoing roles below past jobs that started more recently.

### 2. Centralize sort in `@resumind/types`; client imports same helpers

**Choice:** Update `compareDateDesc` / `sort*Rows` and export a small `compareEndDateDescNullsFirst` comparator. Web imports `sortSectionRows` or section-specific helpers after local state updates.

**Rationale:** Avoids drift between API and UI; repository already calls `sortSectionRows` after fetch.

**Alternative:** DB-only `ORDER BY` without in-memory sort — insufficient because client merges updates without refetch and needs optimistic reorder on date edit.

### 3. "Current" is display-only; storage unchanged

**Choice:** Do not persist a sentinel end date. `formatDateRange(start, end)` returns `{start} – Current` when `start` is set and `end` is empty; if both empty, return `''`.

**Rationale:** JSON Resume uses absent `endDate` for ongoing roles; templates and export already understand optional end dates.

### 4. Required dates enforced in editor forms only

**Choice:** Add `required` to `IsoDateField` and section `validateBeforeSave` hooks in `ManagedArraySection` (or per-section `canSave` callbacks). Awards/Certificates/Publications require date only on **create**; Work/Volunteer/Education/Projects require `startDate` on create and edit.

**Rationale:** User explicitly exempts AI/import paths from required start dates.

### 5. Re-sort triggers

**Choice:**

- **On date change in form:** When `onChange` updates a sort-affecting field, if the row is in edit/create mode, re-sort the section array in parent state using shared helpers (for edit mode, apply sort to the full list including the in-flight draft values).
- **After successful create:** Refetch section (existing) — already server-sorted.
- **After successful update:** Replace item then **re-sort** full section array (don't rely on merge-only order).
- **After delete:** Order unchanged except removal.

**Alternative:** Always refetch on update — simpler but extra network; re-sort locally is sufficient when sort helpers match server.

### 6. Tiebreaker when `end_date` equal

**Choice:** `start_date DESC`, then `id ASC`.

**Rationale:** Not specified by user; provides stable order for overlapping date ranges.

## Risks / Trade-offs

- **[Risk] Import creates entries without start dates** → Mitigation: Editor blocks save until user fills start date; view mode still shows imported rows.
- **[Risk] E2E and unit tests assume start-date order** → Mitigation: Update assertions in same change; document in tasks E2E impact.
- **[Risk] Edit-mode re-sort moves the row being edited** → Mitigation: Re-sort is list-level only; `editingId` tracks by stable uuid, not index.
- **[Risk] NULL end_date vs empty string** → Mitigation: Treat `undefined`, `null`, and `''` as ongoing in sort and display; existing `sanitizeResumeItemPayload` already omits empty strings.

## Migration Plan

No database migration. Deploy API + types + web together; existing rows sort correctly on next read. No backfill.

Rollback: revert sort helpers and UI validation; order reverts to start-date primary.

## Open Questions

- None — user requirements are explicit. Template preview date formatting for "Current" can follow in a separate change if templates don't use `formatDateRange`.
