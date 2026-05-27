## Context

CVs are stored in normalized Postgres tables (`cv` header + per-section tables). `CvService.toCvRecord` currently calls `fetchSections` (12+ parallel queries) and `assembleResume` for every `findAll`, `findOne`, and post-mutation response.

The web app already loads editor sections via item routes (`GET /cv/:cvId/work`, `getCvProfiles`, etc.). The dashboard list uses only `title` and `updated_at`. `CvEditorProvider` calls `GET /cv/:id` mainly for `meta.version` and initial empty resume shell (`stripResumeMetaFromEditor`).

`CvItemService.getBasics` and `updateBasics` additionally list `cv_profiles` to embed `profiles` inside the basics object—matching JSON Resume export shape but unused by the profiles section (which uses `GET /cv/:cvId/profiles`).

Full `assembleResume` remains required for future JSON export/download, not for current APIs.

## Goals / Non-Goals

**Goals:**

- Single-query (or header-only) reads for `GET /cv` and `GET /cv/:id`.
- Slim `CvRecord.data`: `{ meta?, basics? }` derived from `cv` row columns via existing `metaFromCvHeader` and header basics fields.
- Remove profile table access from basics GET/PATCH item paths.
- Align unit/e2e tests and web editor bootstrap with slim responses.

**Non-Goals:**

- Implementing JSON Resume export/download endpoint.
- Changing write paths (`disassembleResume`, item mutations, nested jsonb parent updates).
- Removing `assembleResume` / `fetchSections` from repository (still used by `replaceNormalizedCv` validation and future export).
- Changing section-scoped GET routes (they already read one table each).

## Decisions

### 1. Slim `data` shape for CV envelope responses

**Choice:** `data` contains optional `meta` (from `metaFromCvHeader`) and `basics` (name, label, image, email, phone, url, summary, location from `cv` columns). Omit empty section keys.

**Alternatives:** Return `data: {}` and add top-level `meta_version` — rejected to keep one `CvRecord` shape and minimal web churn.

**Rationale:** Editor needs meta version; basics in header match normalized storage without joins.

### 2. `toCvRecord` becomes synchronous header mapping

**Choice:** Replace async `fetchSections` + `assembleResume` with `headerToSlimCvData(header)` in `@resumind/types` (or inline in service). `findAll` maps rows without `Promise.all` per CV.

**Alternatives:** Keep assembly behind a query flag — rejected; YAGNI until export exists.

### 3. Basics routes do not embed profiles

**Choice:** `getBasics` / `updateBasics` return basics columns only. Profiles stay on `GET /cv/:cvId/profiles` and profile CRUD routes.

**Rationale:** Matches editor architecture; export will call `assembleResume` later.

### 4. Web editor bootstrap

**Choice:** `CvEditorProvider` sets version from `cv.data.meta?.version`; initializes resume with `createEmptyResume()` + `stripResumeMetaFromEditor` on slim payload (basics optional merge, sections loaded by mounted section components).

**Alternatives:** New `GET /cv/:id/meta` — rejected; meta in slim `data` is enough.

### 5. E2E and API tests

**Choice:** Update `GET /cv/:id` assertions to expect slim `data` (meta + basics), not full `work` arrays. Section e2e continues using section routes.

## Risks / Trade-offs

- **[Breaking]** Any external client expecting full resume on `GET /cv/:id` → Document in spec; only in-repo web client updated.
- **Editor flash** if provider assumed preloaded sections → Sections already refetch on mount; acceptable.
- **Create/PATCH full document** still validates via disassemble — unchanged.
- **Future export** must explicitly use `CvNormalizedRepository.assembleFullResume` (or equivalent) — add comment/TODO in repository.

## Migration Plan

1. Ship API + types helper + tests.
2. Ship web `CvEditorProvider` adjustment.
3. No database migration.

Rollback: revert service mapping; no data migration.

## Open Questions

- Should `POST /cv` response include empty `basics: {}` or omit `basics` until first basics patch? **Proposal:** include basics from header after insert (may be sparse).
