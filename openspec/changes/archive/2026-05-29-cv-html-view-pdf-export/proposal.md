## Why

Authors edit CVs section-by-section in the dashboard but cannot see how the finished document will look on paper. Sample PDFs already use a starter MIT CAPD HTML template and Puppeteer, yet that pipeline is dev-only (`pnpm samples:pdf`) and the layout does not yet match the **classic MIT academic CV** format (centered header, ruled section titles, institution/company + right-aligned dates, italic role lines). Users need a **print-faithful MIT-formatted preview** plus **PDF download** and **browser print** from the same HTML source.

## What Changes

- Add a **shared MIT-format HTML renderer** (evolve `scripts/lib/mit-template-renderer.mjs` into a typed package) matching classic MIT résumé conventions: serif typography, centered contact block, **SUMMARY** / **EXPERIENCE** / **EDUCATION** / **SKILLS** section headings with horizontal rules, and entry layouts aligned with MIT samples (company/institution bold on line one, dates right-aligned, job title italic on line two, skills as `**Category:**` comma lists).
- **Section order** prioritizes professional experience: Summary → **Experience (work)** → Volunteer → Education → Skills → remaining JSON Resume sections (projects, awards, certificates, publications, languages, interests, references)—not education-first as in many academic templates.
- Add **export assembly** on the API: load normalized sections, `assembleResume` (including profiles in `basics` for export), render HTML — isolated from slim `GET /cv` reads.
- Expose authenticated **`GET /cv/:id/export/html`** (full HTML document) and **`GET /cv/:id/export/pdf`** (PDF bytes via headless Chromium/Puppeteer from the same HTML).
- Add a **CV preview** route in the web app (`/dashboard/cv/[id]/preview`) that displays export HTML, with **Print** (`window.print()` + shared print CSS) and **Download PDF** (API export).
- Render **Markdown-authored fields** in export HTML (summaries, highlights, reference text) so preview matches editor formatting, not escaped raw Markdown.
- Wire **navigation** from the CV editor chrome (Preview / Export entry) without replacing section editing tabs.

## Capabilities

### New Capabilities

- `cv-resume-export`: MIT-format HTML template (layout + section order), full-document assembly for export, HTML and PDF API endpoints, headless PDF generation, and Markdown-to-HTML for export fields.

### Modified Capabilities

- `cv-rest-api`: Authenticated export routes under `/cv/:id/export/*` with ownership checks and structured errors (404, 503 when PDF engine unavailable).
- `web-application`: Preview route, export API client helpers, print and download actions.
- `cv-editor-ui`: Preview/export affordance in CV chrome; preview page layout optimized for print (minimal app chrome, print stylesheet).
- `monorepo-and-toolchain`: Shared package or workspace for template renderer; document Puppeteer dependency for API export and optional `CHROMIUM_PATH` for deployment.

## Impact

- **New package or module**: `packages/resume-template` — MIT layout renderer (refactor existing `.mjs` to match reference format) + Markdown HTML helper.
- **apps/api**: `CvExportModule` / service — `fetchSections` + `assembleResume`, HTML render, Puppeteer PDF; colocated Jest tests with mocked browser.
- **apps/web**: `/dashboard/cv/[id]/preview` page, `getCvExportHtml` / `downloadCvPdf` in `api.ts`, chrome link/button.
- **scripts**: `generate-sample-pdfs.mjs` imports shared renderer instead of local `.mjs` duplicate.
- **Dependencies**: `puppeteer` (or `puppeteer-core` + system Chrome) on `apps/api`; possible `marked`/`sanitize` or reuse markdown stack for server-side field rendering.
- **Deployment**: API container needs Chromium-compatible runtime for PDF; HTML-only preview works without it.
- **Out of scope for this change**: Public unauthenticated resume URLs, theme picker, multi-template catalog (see **`cv-resume-templates`**), client-side-only PDF generation.

## Dependencies

- None (foundation for export). **`cv-resume-templates`** and **`prepare-job-application`** (letter/CV PDF) build on this change.
