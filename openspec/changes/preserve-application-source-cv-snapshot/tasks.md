## 1. Database and shared contract

- [x] 1.1 Add `source_cv_snapshot jsonb` to `public.job_application` via `supabase/migrations/20260601140000_job_application_source_cv_snapshot.sql`.
- [x] 1.2 Extend shared job application types in `packages/types/src/job-application.ts` with snapshot-aware detail fields.

## 2. API source-resolution and regeneration fallback

- [x] 2.1 Add `apps/api/src/application/application-source-resolver.ts` with live-source-first and snapshot-fallback resolution helpers.
- [x] 2.2 Update `apps/api/src/application/application.service.ts` to persist snapshots, regenerate from snapshots, and annotate fallback rationale.
- [x] 2.3 Extend `apps/api/src/cv/cv-clone.service.ts` with clone-from-resume behavior for snapshot-only regeneration.
- [x] 2.4 Update `apps/api/src/application/application.repository.ts` patch typing for `source_cv_snapshot` persistence.

## 3. Web client and UI behavior

- [x] 3.1 Update application API contract in `apps/web/src/lib/api.ts` with snapshot metadata fields.
- [x] 3.2 Update `apps/web/src/components/applications/application-update-dialog.tsx` to explain saved-copy fallback to users.

## 4. Tests and verification

- [x] 4.1 Add resolver unit tests in `apps/api/src/application/application-source-resolver.test.ts`.
- [x] 4.2 Extend application service tests in `apps/api/src/application/application.service.spec.ts` for retry/update fallback paths.
- [x] 4.3 Extend clone service tests in `apps/api/src/cv/cv-clone.service.spec.ts` for clone-from-resume flows.

## E2E test impact

- [x] Must pass unchanged: No new e2e specs added; existing e2e coverage remains valid for this backend/web behavior extension.
