## Why

This change retroactively documents work already implemented in the working tree.
Application regeneration could fail when the original base CV was deleted from the library, which blocked retry and update flows for otherwise valid job applications.

## What Changes

- Persist a JSON snapshot of the base CV on each `job_application` record so regeneration no longer depends on source CV row availability.
- Resolve application source data from live CV ids first, then fallback to the persisted snapshot when live rows are missing.
- Generate tailored clones from snapshot JSON when needed, and mark regenerated rationale text when saved-copy fallback is used.
- Expose snapshot-derived source metadata (`sourceCvFromSnapshot`, `sourceCvTitle`) to API/web clients so the UI can explain deleted-base-CV behavior.
- Add tests for snapshot parsing, resolver behavior, clone-from-resume, and retry/update workflows with missing source CV rows.

## Capabilities

### New Capabilities

- `application-source-cv-snapshot`: Persist and reuse base CV snapshots for application regeneration when library rows are removed.

### Modified Capabilities

- `job-application-preparation`: Retry/update and source resolution requirements now include snapshot fallback behavior.
- `cv-normalized-schema`: `job_application` schema now includes `source_cv_snapshot` JSON storage.
- `web-application`: Application update UI and API client contract now surface snapshot-source state to users.

## Impact

- API: `apps/api/src/application/*`, `apps/api/src/cv/cv-clone.service.ts`
- Web: `apps/web/src/components/applications/application-update-dialog.tsx`, `apps/web/src/lib/api.ts`
- Shared types: `packages/types/src/job-application.ts`
- Database: `supabase/migrations/20260601140000_job_application_source_cv_snapshot.sql`
