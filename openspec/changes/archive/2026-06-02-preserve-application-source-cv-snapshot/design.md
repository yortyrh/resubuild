## Context

Prepare Application stores references to `source_cv_id` and `tailored_cv_id`, but regeneration paths (`retry`, `update`) previously depended on the live source CV still existing and being readable. In real usage, users delete or restructure CVs after preparing applications, which made later retries fail even though enough data had already been generated once.

This implementation adds durable base-CV state to the application row itself and introduces a resolver that can assemble regeneration inputs from either live CV rows or saved JSON snapshots.

## Goals / Non-Goals

**Goals:**

- Keep application regeneration functional after source CV deletion.
- Preserve existing behavior when live source CV rows are available.
- Make snapshot fallback explicit in API/web response fields.
- Keep clone integrity by validating snapshot-derived resumes before use.

**Non-Goals:**

- Rebuild historical applications that have neither live source CV nor snapshot data.
- Change the public prepare/update endpoint shapes beyond optional response metadata.
- Introduce a new background migration to backfill old rows.

## Decisions

1. **Persist source CV snapshot on `job_application`**
   - Added `source_cv_snapshot jsonb` in `public.job_application`.
   - Rationale: snapshot data is naturally scoped to the application lifecycle and avoids cross-row lookup dependency.
   - Alternative considered: separate snapshot table. Rejected as unnecessary join and migration complexity.

2. **Centralize source resolution in `application-source-resolver`**
   - New resolver prioritizes live ids (`source_cv_id`, `intake_source_cv_id`) and falls back to parsed snapshot JSON.
   - Rationale: keeps retry/update logic deterministic and testable in one place.
   - Alternative considered: inline fallback logic in `ApplicationService`. Rejected due to duplication across prepare/retry/update.

3. **Support snapshot-first clone creation**
   - Added `CvCloneService.cloneFromResume()` for validated clone creation from stored resume JSON.
   - Rationale: regeneration must not require a live source CV row to deep-clone.
   - Alternative considered: synthetic temporary source CV row. Rejected due to side effects and cleanup burden.

4. **Expose snapshot provenance in API response**
   - `jobApplicationRowToDetail` now emits `sourceCvFromSnapshot` and derives `sourceCvTitle` from snapshot basics.
   - Rationale: UI needs user-visible explanation when base CV was deleted.

## Risks / Trade-offs

- **Larger `job_application` row payload** -> Mitigation: snapshot stores only JSON resume once per application; expected row growth is acceptable for this feature boundary.
- **Snapshot drift from current CV state** -> Mitigation: drift is intentional for reproducible regeneration of the original application baseline.
- **Invalid snapshot structure** -> Mitigation: parser guards for resume shape and clone-time schema validation.

## Migration Plan

1. Apply migration adding `source_cv_snapshot` to `public.job_application`.
2. Deploy API changes that write snapshots on prepare/update and read fallback on regeneration.
3. Deploy web changes that show saved-copy messaging when `sourceCvFromSnapshot=true`.
4. Existing rows without snapshot continue to work only if live source CV exists; otherwise they fail with current missing-base behavior.

Rollback:

- API/web can be rolled back safely; the extra nullable column is additive and backward compatible.

## Open Questions

- None for this retroactive implementation; behavior is fully represented by merged tests and additive schema change.
