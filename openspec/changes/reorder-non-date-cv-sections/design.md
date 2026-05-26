## Context

The `normalize-cv-database` change introduces normalized section tables with a `sort integer not null` column on every multi-valued entity. New rows receive `sort = max(sort) + 1`. List queries order by `sort ASC, id ASC`. The editor currently renders sections via `ManagedArraySection` with create/edit/delete only — no reorder affordance.

Five sections lack reliable date-based ordering for authors:

| Section         | Table               | Typical sort intent         |
| --------------- | ------------------- | --------------------------- |
| Social profiles | `cv_basics_profile` | Prominence (LinkedIn first) |
| Skills          | `cv_skill`          | Priority / grouping         |
| Languages       | `cv_language`       | Fluency prominence          |
| Interests       | `cv_interest`       | Personal emphasis           |
| References      | `cv_reference`      | Preferred contact order     |

Date-primary sections (Work, Education, etc.) are explicitly **out of scope**; they may later auto-sort by `startDate` / `endDate`.

**Prerequisite:** `normalize-cv-database` merged and deployed.

## Goals / Non-Goals

**Goals:**

- Let users reorder entries in the five listed sections via drag-and-drop in view mode.
- Provide keyboard-accessible move-up / move-down as an equivalent path.
- Persist order by rewriting `sort` values server-side in one atomic operation.
- Keep URL `:index` semantics aligned with post-reorder positions.
- Bump `cv.meta_version` on reorder; honor 409 stale-version flow.
- Reflect order in assembled JSON Resume export/preview.

**Non-Goals:**

- Reordering Work, Volunteer, Education, Projects, Awards, Certificates, Publications.
- Reordering string lists within an entity (keywords, highlights).
- Cross-section drag (moving a skill into languages).
- Multi-user live reorder sync.
- Auto-sort heuristics (alphabetical, fluency level inference).

## Decisions

### 1. Reorder API — single endpoint per section with ordered id list

**Choice:** `PUT /cv/:cvId/{section}/reorder` where `{section}` is one of `profiles`, `skills`, `languages`, `interests`, `references`.

Request body:

```json
{
  "version": "abc123",
  "order": ["uuid-row-1", "uuid-row-2", "uuid-row-3"]
}
```

Server validates: caller owns CV; `order` is a permutation of all row ids for that section; updates each row's `sort` to array index; bumps `meta_version`; returns `{ items: [...], version }` with entities in new order (indices implied).

**Rationale:** One round-trip; stable uuid ids survive reorder; client sends full desired order after drag (simple to reason about).

**Alternatives considered:**

- `PATCH` with `{ fromIndex, toIndex }` — multiple calls for long moves; harder to batch.
- Reuse numeric indices only — ambiguous during concurrent edits; normalization gives stable uuids internally.

### 2. `sort` assignment — dense 0..n-1 on reorder

**Choice:** After reorder, set `sort = index` for each id in `order` (0, 1, 2, …).

**Rationale:** Simple; matches list rendering; no gap management needed at current scale.

**Alternatives considered:**

- Sparse sorts (10, 20, 30) — useful for single-row moves without full rewrite; unnecessary for ≤20 items per section.

### 3. UI — `@dnd-kit/sortable` on view rows only

**Choice:** Add `SortableManagedArraySection` (or extend `ManagedArraySection`) wrapping `ResumeItemRow` list with:

- Drag handle icon (grip) visible in view mode when ≥2 items and not editing/creating.
- `@dnd-kit/core` + `@dnd-kit/sortable` with pointer + keyboard sensors.
- Move up / down icon buttons on each row for accessibility (WCAG 2.5.7 alternative).
- On drop or button click: compute new id order locally, call reorder API, refresh list + version on success.

Disable sortable while a row is in edit/create mode to avoid conflicting interactions.

**Rationale:** Industry-standard React DnD; keyboard sortable support built-in; matches resume-style view rows.

**Alternatives considered:**

- Up/down buttons only — accessible but tedious for long lists; keep as supplement.
- Native HTML drag — poor a11y and mobile UX.

### 4. Profiles path under `/profiles` not nested under basics in URL

**Choice:** Reorder endpoint is `PUT /cv/:cvId/profiles/reorder` (consistent with existing `POST /cv/:cvId/profiles` item routes).

**Rationale:** Matches current `cv-items.controller` grouping for profile CRUD.

### 5. Response includes row id for client mapping (additive)

**Choice:** Item list responses (GET section + reorder response) SHALL include internal `id` (uuid) per row in addition to index. Web stores id alongside item for reorder payloads.

**Rationale:** Reorder body requires uuids; today index-only responses insufficient after normalization.

**Note:** May require small additive change to existing item GET/create responses from normalization change; document as coordination point.

### 6. Concurrency

**Choice:** Reorder requires current `cv.meta_version`; 409 on mismatch; client reloads section on conflict (same as item save).

## Risks / Trade-offs

| Risk                             | Mitigation                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| Reorder during active edit       | Disable drag while editing/creating; show inline hint        |
| Missing row ids in legacy client | Block reorder until normalization + id in API responses ship |
| DnD on mobile                    | Touch sensor in dnd-kit; up/down buttons fallback            |
| Index drift after reorder        | Return full ordered list; client replaces local array        |
| Partial `order` array            | Reject 400 if not exact permutation of section rows          |

## Migration Plan

1. **Prerequisite:** Complete `normalize-cv-database`.
2. Ship Nest reorder routes + service method `reorderSection(cvId, section, order, version)`.
3. Extend web API client with `reorderCvSkills`, etc., or generic `reorderCvSection`.
4. Add `SortableManagedArraySection`; wire five sections in `cv-sections.tsx`.
5. Add `@dnd-kit` dependencies to `apps/web`.
6. E2e: create 3 skills, reorder, assert GET order and export assembly.
7. Rollback: hide drag handles via feature flag; endpoints unused.

## Open Questions

- Whether to expose row `id` in all item CRUD responses in normalization change vs. only in reorder — recommend all section GET/POST responses include `id`.
- Whether Social profiles tab label stays "Social profiles" in reorder aria labels — yes, use section display name.
