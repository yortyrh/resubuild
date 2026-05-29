## Why

`cv-html-view-pdf-export` introduces a single MIT classic HTML renderer and API export routes, but users need **visual choice** among the MIT CAPD sample layouts (14 pages in `sampe-resumes-capd.pdf`, spanning first-year through alum formats). A hard-coded template blocks future themes and duplicates layout logic. The product must expose **multiple server-rendered templates**, let authors pick one per preview/export, and stay **open for extension** without modifying core export code.

## What Changes

- Extend `packages/resume-template` from one renderer into a **template registry** (Open/Closed): each CAPD sample layout is a registered template module; new templates are added by registration, not by editing export services.
- Implement **all CAPD sample layouts** from `modern-jsonresume/examples/sampe-resumes-capd.pdf` as distinct templates (first-year ×2, undergraduate ×2, design, global, masters ×3, PhD ×3, alum — 14 visual variants aligned to PDF pages).
- Persist **selected template id** on the CV (or export query param with CV default) so preview, print, and PDF use the same template.
- Extend API export routes to accept `?template=<id>` on `GET /cv/:id/export/html` and `GET /cv/:id/export/pdf`; add `GET /cv/export/templates` listing id, label, description, and preview thumbnail metadata.
- Web app preview route: **template picker only** — fetch HTML from API (iframe/srcDoc or blob URL), Print and Download PDF call API; **no client-side resume HTML rendering**.
- Sample PDF script uses the same registry so dev samples can generate one PDF per template.

## Capabilities

### New Capabilities

- `cv-resume-templates`: Template registry, CAPD layout implementations, template metadata API, CV template selection persistence, and export route template parameter — all rendering server-side.

### Modified Capabilities

- `cv-resume-export`: Single hard-coded MIT renderer becomes pluggable template id; HTML/PDF paths resolve template from registry; requirements for template listing and parameter validation.
- `cv-rest-api`: New templates list route; export routes accept template query; optional PATCH on CV for default template; 400 for unknown template id.
- `web-application`: Preview page adds template selector wired to API query param; removes any assumption of one fixed layout.
- `cv-editor-ui`: Export/preview chrome exposes template selection (dropdown or gallery) without embedding layout markup.
- `monorepo-and-toolchain`: Package structure for one file (or folder) per template; document template authoring contract for contributors.

## Dependencies

- **`cv-html-view-pdf-export`** must be merged first (export routes, `packages/resume-template`, preview skeleton).

## Impact

- **packages/resume-template**: Registry (`registerTemplate`, `getTemplate`, `listTemplates`), shared section helpers, 14 CAPD template modules, shared Markdown + media URL utilities from export change.
- **apps/api**: `CvExportService` resolves template before render; templates catalog endpoint; migration adding `cv.template_id` (or equivalent) with default `mit-classic`.
- **apps/web**: Template picker on `/dashboard/cv/[id]/preview`; API client helpers `listCvTemplates`, export URLs with `template` param — **no** React HTML template components.
- **scripts/generate-sample-pdfs.mjs**: Iterate registered templates.
- **Dependency**: Builds on completed `cv-html-view-pdf-export` (HTML/PDF export pipeline, Puppeteer, assembly path).
- **Out of scope**: User-authored custom CSS, WYSIWYG template editor, client-side PDF generation, templates that change JSON Resume schema.
