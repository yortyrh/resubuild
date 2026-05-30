## Why

Resumind already imports JSON Resume files and exports HTML/PDF, but users cannot download their CV as a portable `.json` document. That breaks symmetry with import, blocks backup and migration to other JSON Resume tools (CLI, registry, third-party themes), and leaves the long-planned “full document assembly for export” path incomplete for the native format.

## What Changes

- Add **`GET /cv/:id/export/json`** — authenticated endpoint that assembles a full JSON Resume from normalized storage and returns schema-valid JSON with a download filename.
- Add **`prepareExportedResume`** in `@resumind/types` — strips Resumind-internal fields (row `id` on section items), omits empty sections, and optionally adds `$schema` and export-time `meta` (`lastModified`, `version`, optional `canonical`).
- Reuse the existing **`CvExportService` assembly path** (`fetchSections` + `assembleResume` + profiles in `basics`) shared with HTML/PDF; JSON export does **not** rewrite media URLs to absolute (round-trip re-import friendly).
- Add **Download JSON** on the CV preview page toolbar alongside Print and Download PDF.
- Add web API client helper **`downloadCvJson`** in `apps/web/src/lib/api.ts` with colocated tests.
- Extend E2E coverage for the new export route.

## Capabilities

### New Capabilities

- `cv-json-export`: Export normalization (`prepareExportedResume`), JSON document shape, and round-trip expectations with import.

### Modified Capabilities

- `cv-rest-api`: Extend authenticated export routes with `GET /cv/:id/export/json`; fulfill the deferred “JSON Resume export owns meta generation” requirement.
- `cv-resume-export`: Document that assembly serves JSON export as well as HTML/PDF; JSON output uses stored (non-absolute) media references.
- `web-application`: Preview page gains Download JSON action and API client support.
- `e2e-testing`: Catalog and scenario for JSON export endpoint.

## Impact

- **API**: `apps/api/src/cv-export/` (controller + service), possible unit tests beside service.
- **Types**: `packages/types/src/prepare-exported-resume.ts` (+ tests).
- **Web**: `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx`, `apps/web/src/lib/api.ts`.
- **Docs**: `README.md` route table (optional, during implementation).
- **No breaking changes** to existing HTML/PDF export or slim CV read routes.
