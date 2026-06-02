## 1. Database and domain model updates

- [x] 1.1 Add a Supabase migration under `supabase/migrations` to introduce staged update linkage/visibility fields for `job_application` (including safe defaults for existing rows).
- [x] 1.2 Update shared application types in `packages/types/src/job-application.ts` to represent source-application linkage and active/draft visibility state.

## 2. API update lifecycle orchestration

- [x] 2.1 Update application repository queries in `apps/api/src/application` so list/history endpoints return only active/list-visible applications.
- [x] 2.2 Refactor update flow in `apps/api/src/application/application.service.ts` to create hidden replacement drafts, preserve original active rows during processing, and clean pre-existing dangling drafts for the same original.
- [x] 2.3 Implement transactional success swap in API services: activate replacement draft and delete original application atomically.
- [x] 2.4 Ensure failure paths preserve original application and keep failed/incomplete replacements out of default listing responses.

## 3. Web app behavior alignment

- [x] 3.1 Update application API client usage in `apps/web/src/lib/api.ts` and related application views to align with hidden draft semantics.
- [x] 3.2 Adjust application list/detail UI in `apps/web/src/components/applications` so users continue seeing the original application while update processing runs.

## 4. Verification and automated tests

- [x] 4.1 Add/adjust API unit tests beside updated sources in `apps/api/src/application/*.spec.ts` for: draft creation, stale draft cleanup, hidden listing behavior, and atomic success swap.
- [x] 4.2 Add/adjust CV cloning and update tests in `apps/api/src/cv/*.spec.ts` for staged replacement generation and failure safety.
- [x] 4.3 Run impacted API unit tests with `-- --run` and confirm no regressions in affected modules.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — authentication flow and CV library baseline scenarios still must pass unchanged.
- `local-supabase.e2e-spec.ts` — existing application preparation and workspace navigation scenarios must remain stable for active/list-visible applications.

### Update required

- `local-supabase.e2e-spec.ts` — application update flow assertions must be updated to verify original row remains listed during processing and replacement draft stays hidden until success.

### Add

- `local-supabase.e2e-spec.ts` — add scenario for stale dangling replacement cleanup on a new update start for the same original application.
- `local-supabase.e2e-spec.ts` — add scenario asserting successful update performs atomic swap (new active appears, old active removed).
