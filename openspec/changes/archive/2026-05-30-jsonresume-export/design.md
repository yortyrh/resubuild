## Context

CV data lives in normalized Postgres tables. Dashboard reads return slim `basics` only; full assembly runs in `CvExportService` for HTML/PDF via `assembleResume`. Section items currently carry internal UUID `id` fields (used by the editor API) that are **not** part of the JSON Resume schema. Import already normalizes external files via `prepareImportedResume` (strips `$schema`/`meta`, ensures array sections).

The `cv-rest-api` spec deferred meta generation to a future JSON export endpoint — this change implements that endpoint.

## Goals / Non-Goals

**Goals:**

- One-click download of a schema-valid JSON Resume `.json` file for any owned CV.
- Symmetric import/export: exported files re-import cleanly through `prepareImportedResume` + create flow.
- Reuse existing export assembly; no new database tables or migrations.
- Consistent auth/RLS/404 behavior with HTML/PDF export.

**Non-Goals:**

- Public unauthenticated JSON URLs or registry publish integration.
- Exporting template presentation config, inactive highlights, or internal row metadata.
- Client-side-only export without the API (server is source of truth for assembly).
- Bulk export of all user CVs.

## Decisions

### 1. Dedicated `GET /cv/:id/export/json` endpoint

**Choice:** Add JSON alongside existing `/export/html` and `/export/pdf` under `CvExportController`.

**Rationale:** Same ownership checks, same assembly entry point, predictable content negotiation (`application/json; charset=utf-8` + `Content-Disposition: attachment`).

**Alternative:** Extend `GET /cv/:id` with `?format=json` — rejected; violates slim-read contract and would encourage clients to depend on heavy reads.

### 2. `prepareExportedResume` strips internal ids and shapes output

**Choice:** New helper in `@resumind/types` that:

- Accepts a `Resume` from `assembleResume`.
- Recursively removes `id` from section array items (and `basics.profiles` items).
- Omits empty/undefined top-level sections (sparse document, like sample files).
- Adds `$schema` pointing to the official JSON Resume schema URI.
- Adds `meta` with `lastModified` (ISO 8601 from `cv.updated_at`), `version` (`"v1"` or derived from export timestamp), and optional `canonical` when configured later.

**Rationale:** `assembleResume` intentionally keeps row ids for editor round-trips; export must not leak them. Meta belongs at export time per existing API spec.

**Alternative:** Mutate `assembleResume` with a flag — rejected; keeps read/export concerns separate.

### 3. JSON export keeps stored media URLs (not absolute)

**Choice:** Do **not** call `withAbsoluteImageUrls` for JSON export.

**Rationale:** Re-import into Resumind preserves `/media/{id}` references the API understands. HTML/PDF still need absolute URLs for headless rendering.

### 4. Validate before respond

**Choice:** Run `ResumeSchemaValidator` on the prepared export object; 500 only on internal inconsistency (should not happen); log and fail closed.

**Rationale:** Guarantees downloadable files match the same schema enforced on writes.

### 5. Preview page UI

**Choice:** Add **Download JSON** button next to Download PDF on `/dashboard/cv/[id]/preview`; uses `downloadCvJson(cvId)` helper.

**Rationale:** Preview is already the export hub; no new route required.

## Risks / Trade-offs

- **[Exported image URLs are API-relative]** → Document that external tools need publicly reachable media or users re-upload; acceptable for v1.
- **[Meta/version semantics]** → Start with simple `version: "v1"` and `lastModified` from DB; avoid coupling to removed optimistic versioning.
- **[Large CV payload]** → Single JSON response; acceptable for typical résumé size; no streaming needed.

## Migration Plan

Deploy API + web together. No database migration. Rollback: remove endpoint and UI button; HTML/PDF unaffected.

## Open Questions

- None for v1. Future: optional query flag to include absolute media URLs for external hosting.
