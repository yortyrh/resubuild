## Context

The `normalize-cv-database` change introduces normalized section tables where only non-date multi-valued entities carry a `sort` column: `cv_basics_profile`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`. New rows receive auto-assigned `sort = max(sort) + 1`. List queries order by `sort ASC, id ASC`. Reorder API endpoints (`PUT /cv/:cvId/{section}/reorder`) persist manual order updates server-side.

The editor currently renders sections via `ManagedArraySection` with create/edit/delete only — no reorder affordance.

Five sections lack reliable date-based ordering for authors:

| Section         | Table               | Typical sort intent         |
| --------------- | ------------------- | --------------------------- |
| Social profiles | `cv_basics_profile` | Prominence (LinkedIn first) |
| Skills          | `cv_skill`          | Priority / grouping         |
| Languages       | `cv_language`       | Fluency prominence          |
| Interests       | `cv_interest`       | Personal emphasis           |
| References      | `cv_reference`      | Preferred contact order     |

Date-primary sections (Work, Education, etc.) are explicitly **out of scope**; they order by date fields from the normalization change.

**Prerequisite:** `normalize-cv-database` merged and deployed (including reorder API endpoints).

## Goals / Non-Goals

**Goals:**

- Let users reorder entries in the five listed sections via drag-and-drop in view mode.
- Provide keyboard-accessible move-up / move-down as an equivalent path.
- Call the existing reorder API to persist order; refresh local section state and version on success.
- Keep URL `:index` semantics aligned with post-reorder positions (indices follow `sort` order from the server).
- Honor 409 stale-version flow (reload section on conflict).

**Non-Goals:**

- API routes, DTOs, or server-side reorder logic (shipped in `normalize-cv-database`).
- Database schema or `sort` column design.
- Reordering Work, Volunteer, Education, Projects, Awards, Certificates, Publications.
- Reordering string lists within an entity (keywords, highlights).
- Cross-section drag (moving a skill into languages).
- Multi-user live reorder sync.
- Auto-sort heuristics (alphabetical, fluency level inference).

## Decisions

### 1. UI-only change — consume existing reorder API

**Choice:** This change adds only the React UI and web API client calls. Reorder persistence (`PUT /cv/:cvId/{section}/reorder`, `sort` assignment, `meta_version` bump) is implemented in `normalize-cv-database`.

**Rationale:** Keeps persistence and presentation concerns separate; UI change can ship immediately after normalization without duplicating API work.

### 2. UI — `@dnd-kit/sortable` on view rows only

**Choice:** Add `SortableManagedArraySection` (or extend `ManagedArraySection`) wrapping `ResumeItemRow` list with:

- Drag handle icon (grip) visible in view mode when ≥2 items and not editing/creating.
- `@dnd-kit/core` + `@dnd-kit/sortable` with pointer + keyboard sensors.
- Move up / down icon buttons on each row for accessibility (WCAG 2.5.7 alternative).
- On drop or button click: compute new id order locally, call `reorderCvSection`, refresh list + version on success.

Disable sortable while a row is in edit/create mode to avoid conflicting interactions.

**Rationale:** Industry-standard React DnD; keyboard sortable support built-in; matches resume-style view rows.

**Alternatives considered:**

- Up/down buttons only — accessible but tedious for long lists; keep as supplement.
- Native HTML drag — poor a11y and mobile UX.

### 3. Client requires row `id` from normalization API responses

**Choice:** Section GET/create responses (from normalization) include internal `id` (uuid) per row. Web stores id alongside item for reorder payloads (`order: uuid[]`).

**Rationale:** Reorder body requires uuids; index-only responses are insufficient.

### 4. Concurrency — same 409 flow as item save

**Choice:** Reorder calls pass current `cv.meta_version`; on 409 the client reloads the section (same as item create/update/delete).

## Risks / Trade-offs

| Risk                             | Mitigation                                                    |
| -------------------------------- | ------------------------------------------------------------- |
| Reorder during active edit       | Disable drag while editing/creating; show inline hint         |
| Missing row ids in API responses | Blocked by prerequisite; normalization must include `id`      |
| DnD on mobile                    | Touch sensor in dnd-kit; up/down buttons fallback             |
| Index drift after reorder        | Replace local array from reorder response                     |
| Normalization not deployed       | Feature gated on prerequisite; no reorder UI until API exists |

## Migration Plan

1. **Prerequisite:** Complete `normalize-cv-database` (including reorder endpoints).
2. Add `@dnd-kit` dependencies to `apps/web`.
3. Add `reorderCvSection(cvId, section, order, version)` in `cv-item-api.ts`.
4. Create `SortableManagedArraySection`; wire five sections in `cv-sections.tsx`.
5. Component tests for sortable list behavior.
6. Manual QA: drag reorder in each section; verify export/preview order.
7. Rollback: hide drag handles via feature flag; no server changes needed.

## Open Questions

- Whether Social profiles tab label stays "Social profiles" in reorder aria labels — yes, use section display name.
