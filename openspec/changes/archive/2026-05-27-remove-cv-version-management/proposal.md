## Why

CV storage is now normalized: each section row is updated atomically via item-scoped routes. The JSON Resume `meta` object (`version`, `canonical`, `lastModified`) and matching `cv.meta_*` columns were designed for monolithic document overwrites and export-oriented metadata. They add extra reads, bumps, 409 handling, client version state, and response shape noise—without benefit for current dashboard and editor APIs. Export can reintroduce `meta` when that feature is built.

## What Changes

- **Remove optimistic concurrency**: stop accepting `version` on mutations, stop comparing to `cv.meta_version`, stop 409 conflicts, stop `bumpVersion` / `bumpMetaVersion`.
- **Remove `meta` from API responses**: slim `data` on list/detail/create/mutation CV responses contains **basics only** (no `data.meta`). Item mutation responses have no `version` field.
- **Stop persisting meta on write**: `disassembleResume` and create/update paths SHALL ignore incoming `data.meta` and SHALL NOT write `meta_version`, `meta_canonical`, or `meta_last_modified`.
- **Stop reading meta on read**: `headerToSlimCvData` and `assembleResume` (where still used internally) SHALL NOT emit `meta`; repository insert/update payloads omit meta columns (or pass null).
- **Remove `packages/types/src/resume-meta.ts`**: delete meta helpers (`applyResumeMetaForCreate`, `metaFromCvHeader`, `bumpResumeMetaVersion`, etc.) and tests; simplify `cv-editor-provider` to bootstrap from basics only (drop `stripResumeMetaFromEditor` / version state).
- **Web client cleanup**: remove `version` / `onVersionChange` and any reliance on `data.meta` from `cv-editor-provider`, mutations, and section components.
- **BREAKING (API)**: responses no longer include `data.meta`; request bodies SHOULD NOT send `meta` (ignored if present on disassemble). Mutation bodies no longer accept `version`.
- **Database (non-goal for this change)**: `meta_version`, `meta_canonical`, `meta_last_modified` columns remain in Postgres unused until a future export change or migration drops them.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cv-rest-api`: Remove optimistic concurrency; slim `data` is basics-only (no `meta`); create/update/item routes do not persist or return meta.
- `cv-item-crud`: Item mutations do not return or require `meta.version`; remove 409 conflict scenarios.
- `cv-normalized-schema`: Header row meta columns are legacy/unused by application layer until export.
- `database-cv-rls`: Document that meta columns exist in schema but are not populated by current APIs.
- `web-application`: Remove version threading; editor bootstrap does not depend on `data.meta`.

## Impact

- `apps/api/src/cv/cv.service.ts`, `cv-item.service.ts`, `cv-normalized.repository.ts`, DTOs, controllers, specs
- `packages/types/src/resume-meta.ts` (remove), `resume-normalized.ts` (`disassembleResume`, `headerToSlimCvData`, `assembleResume`)
- `apps/web/src/lib/cv-item-api.ts`, `cv-editor-provider.tsx`, section components
- `apps/api/test/e2e/local-supabase.e2e-spec.ts`, unit tests across api/web/types
- Optional: `scripts/lib/seed-supabase.mjs` if it sets meta on samples
