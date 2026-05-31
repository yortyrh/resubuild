## Context

Work and Volunteer are separate normalized tables (`cv_work`, `cv_volunteer`) edited through `ManagedArraySection` with independent React Query section caches. Each row exposes Edit and Delete via `ResumeItemRow`. The schemas overlap on dates, role title, URL, summary, and highlights, but differ on entity naming (`name` vs `organization`) and Work-only fields (`location`, `description`).

There is no server-side “move” endpoint today; item CRUD already supports create and delete per section.

## Goals / Non-Goals

**Goals:**

- One-click recategorization between Work and Volunteer with field mapping and confirmation.
- Persist immediately using existing REST routes (`POST` target section, `DELETE` source item).
- Keep editor state and React Query caches for both sections consistent after a successful move.
- Fail safely: if target create fails, source entry remains untouched.

**Non-Goals:**

- Moving entries to or from Education, Projects, or other sections.
- Merging `description` into `summary` or preserving Work-only fields on volunteer rows.
- New Nest “move” endpoints or database transactions (unless rollback issues appear in practice).
- Auto-navigating the user to the destination tab after move.

## Decisions

### 1. Client-orchestrated create-then-delete (no new API)

**Choice:** Web client calls `POST /cv/:cvId/volunteer` (or work) with mapped payload, then `DELETE /cv/:cvId/work/:itemId` (or volunteer) only after create succeeds.

**Rationale:** Reuses validated DTOs and existing authorization; smallest backend diff. Duplicate-entry window is acceptable for a single-user editor action.

**Alternative considered:** Dedicated `POST .../move-to-volunteer` with a DB transaction — rejected for v1 because it adds API surface without proven need.

### 2. Pure field-mapping helpers in the web app

**Choice:** Add `mapWorkToVolunteer(work)` and `mapVolunteerToWork(volunteer)` in `apps/web/src/lib/` (colocated tests beside source).

**Mapping rules:**

| Source (Work)                                                      | Target (Volunteer) |
| ------------------------------------------------------------------ | ------------------ |
| `name`                                                             | `organization`     |
| `position`, `url`, `startDate`, `endDate`, `summary`, `highlights` | copied             |
| `location`, `description`                                          | omitted            |

| Source (Volunteer) | Target (Work)                   |
| ------------------ | ------------------------------- |
| `organization`     | `name`                          |
| shared fields      | copied                          |
| —                  | `location`, `description` unset |

Payloads pass through existing `sanitizeResumeItemPayload` before POST.

### 3. Extend `ResumeItemRow` with optional secondary action

**Choice:** Add optional `secondaryAction?: { label: string; onClick: () => void; disabled?: boolean }` rendered as an outline button between Edit and Delete (or before Edit when no delete).

**Rationale:** Keeps move UI consistent with row action bar; Work and Volunteer sections pass different labels (“Move to Volunteer” / “Move to Work”).

**Alternative considered:** Dropdown menu on Edit — rejected as less discoverable.

### 4. Confirmation dialog before move

**Choice:** Reuse the `<dialog>` pattern from `DeleteItemDialog` with neutral confirm styling. Copy explains target section and that the current entry will be removed.

### 5. Orchestration hook shared by both sections

**Choice:** Add `useMoveWorkVolunteer(cvId)` (or `moveWorkVolunteerItem` async helper + mutations) that:

1. Sets saving flag / disables row actions.
2. Creates mapped item on target API.
3. Deletes source item by id.
4. Refetches or patches both `work` and `volunteer` section query caches via `queryClient.invalidateQueries` + `onItemsChange` callbacks from each section.
5. Shows toast on success; surfaces API error without deleting source if step 2 fails.

If step 3 fails after successful create, show error toast instructing user that a duplicate may exist in the target section (rare); do not auto-delete the new item.

### 6. Wire through section components, not generic `ManagedArraySection`

**Choice:** Pass `secondaryAction` from `work-section.tsx` / `volunteer-section.tsx` via a thin wrapper or new optional prop on `ManagedArraySection` (`renderRowActions` or `crossSectionMove` config).

**Rationale:** Only these two sections participate; avoids polluting all array sections.

## Risks / Trade-offs

- **[Partial failure after create]** → User may see duplicate content if delete fails; mitigated by error message and manual cleanup; monitor before adding transactional API.
- **[Work-only data loss on move to volunteer]** → `location` and `description` are dropped by design; confirmation copy mentions non-transferable fields.
- **[Stale opposite-section cache]** → Must invalidate both section queries; Work tab may not remount Volunteer cache until visited — acceptable if preview/export reads server state.

## Migration Plan

No migration. Ship as a frontend-only feature behind existing auth. Rollback = remove UI actions; no data migration.

## Open Questions

- None for v1. Revisit server-side atomic move if duplicate-after-partial-failure reports appear.
