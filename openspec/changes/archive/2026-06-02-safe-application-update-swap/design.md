## Context

Application updates currently replace the existing row as soon as update processing starts. This creates a visibility and consistency risk: the list can show incomplete results, and failures can leave users without a stable application record. The API and web app already have update and regeneration workflows with CV snapshot fallback support, so this change focuses on lifecycle/state transitions and list visibility guarantees rather than new AI behaviors.

## Goals / Non-Goals

**Goals:**

- Keep the current application visible and intact while an update is being generated.
- Ensure update-in-progress replacements are hidden from normal listings until success.
- Perform a safe swap on success: activate new application, remove prior application.
- Limit dangling update drafts to one per original application and clean stale drafts before starting a new update.
- Make behavior deterministic and testable in API/service and repository layers.

**Non-Goals:**

- Redesigning Prepare Application intake UX.
- Changing cover letter or CV generation prompt logic.
- Introducing a general-purpose workflow engine for all async jobs.
- Supporting multiple concurrent drafts per original application.

## Decisions

### 1) Introduce explicit source linkage for staged updates

Use a nullable `source_application_id` (or equivalent naming) on `job_application` for staged update rows. Draft updates reference the current active/original row.

Alternatives considered:

- Track linkage only in memory/job payload: rejected because cleanup and recovery after restarts require persisted linkage.
- Overload existing status text without foreign key: rejected because it weakens integrity and queryability.

### 2) Split visibility from generation lifecycle

Represent update rows as not list-visible until completion (`is_active = false` or equivalent) while generation runs. Keep original row list-visible during this period.

Alternatives considered:

- Hard-delete original at update start: rejected due to data-loss risk on failure.
- Show both rows in listing with "processing" badges: rejected because it violates requirement to hide unfinished replacements.

### 3) Use two-phase swap at success boundary

When generation succeeds, run a transactional swap:

1. validate draft row still references original and belongs to same user,
2. mark draft as active/list-visible,
3. delete original row,
4. clear transitional metadata from draft (if needed).

Alternatives considered:

- Rename IDs or mutate original in-place: rejected because existing flow creates new tailored artifacts and benefits from immutable handoff.
- Keep both rows after success: rejected because it leaves duplicate historical records and confuses listing semantics.

### 4) Enforce one dangling draft per original

Before creating a new update draft, query for stale/incomplete rows referencing the same `source_application_id` and remove them. Then create a single new draft.

Alternatives considered:

- Reject update if stale draft exists: rejected because user intent is to continue with latest update request, not manual cleanup.
- Keep all stale drafts for audit: rejected for now to keep product behavior simple and database clean.

## Risks / Trade-offs

- [Race between concurrent update requests] -> Mitigation: lock/query by original application in transaction and enforce uniqueness at service/repository boundary.
- [Swap failure after generation success] -> Mitigation: execute activation + deletion in one database transaction with rollback.
- [Hidden drafts become orphaned after worker crash] -> Mitigation: stale-draft cleanup at next update start using source linkage and status checks.
- [Accidental listing of drafts by existing queries] -> Mitigation: centralize list query filters to include only active/list-visible applications.

## Migration Plan

1. Add migration for source linkage and visibility/state fields required by staged update semantics.
2. Backfill existing rows with defaults representing active/list-visible applications.
3. Update repository filters and update orchestration in API layer.
4. Add/adjust unit tests for start-update cleanup, hidden draft behavior, success swap, and failure retention of original.
5. Roll out with feature-compatible defaults; rollback by reverting service logic and migration if needed.

Rollback strategy:

- If issues are detected, disable staged swap flow in service logic and keep original update behavior while preserving added columns as harmless metadata until cleanup migration.

## Open Questions

- Should stale draft cleanup be limited by age/status thresholds or always delete any non-active draft linked to the same original?
- Do we need explicit user-visible status messaging for "update in progress" on the original row, or is current UX sufficient?
