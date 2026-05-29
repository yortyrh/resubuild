## Why

Authors can pick among resume visual templates, but every export still uses fixed section order and field visibility baked into each layout. They need per-CV control over which sections appear, how they are ordered, and which optional fields render—without forking HTML templates. Import settings also relied on a static model catalog; the allowlist should refresh from models.dev with a safe fallback.

## What Changes

- Add **per-CV, per-template presentation config** (`cv_template_presentation` table, `GET`/`PATCH /cv/:id/template-presentation`) storing section order, hidden sections, custom labels, and per-section field toggles.
- Extend `packages/resume-template` with `CvTemplatePresentationConfig`, merge helpers, and wire config into `renderResumeHtml` / visual templates.
- Replace fourteen CAPD-specific template ids with **four canonical visual templates** (`classic`, `modern`, `tabular`, `left`) generated from a shared factory; **BREAKING** for clients still using `capd-*` or `mit-classic` ids (migration maps `template_id` default to `classic`).
- Add **TemplateConfigPanel** on the CV preview route (drag-and-drop section order, visibility toggles, field switches) with debounced save to the API.
- Improve preview UX: **iframe `srcDoc`**, loading skeleton, `surface-soft` chrome per `apps/web/DESIGN.md`.
- Add **ImportModelsCatalogService** (startup + daily cron) to refresh `@resumind/import-models` from models.dev with fallback catalog; import LLM routes use live catalog.
- Document shared preview/design tokens in `apps/web/DESIGN.md`.

## Capabilities

### New Capabilities

- `cv-template-presentation`: Persistence, API, and renderer integration for per-CV template layout configuration.

### Modified Capabilities

- `cv-rest-api`: Template presentation endpoints; export assembly passes merged presentation config.
- `cv-editor-ui`: Preview page layout panel and template-aware export chrome.
- `web-application`: Preview iframe display, design tokens, API client helpers for presentation config.
- `import-llm-config`: Catalog sourced from refreshable models.dev registry with fallback and status metadata.

## Impact

- **supabase**: `cv_template_presentation` migration; `cv.template_id` default `classic`.
- **packages/resume-template**: `template-config.ts`, `visual-templates.ts`, refactored `capd-factory`, removed `capd-templates.ts`.
- **packages/import-models**: `build-catalog`, `fetch-models-dev`, fallback catalog, expanded `catalog.json`.
- **apps/api**: `CvTemplatePresentationService`, export/import integration, `ImportModelsCatalogModule`.
- **apps/web**: `template-config-panel`, preview client/frame/skeleton, `cv-preview-resume` helper.
- **Dependencies**: `@dnd-kit/*` on web for section reorder UI.
