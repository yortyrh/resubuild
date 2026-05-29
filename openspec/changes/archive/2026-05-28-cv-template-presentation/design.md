## Context

`cv-resume-templates` shipped a registry with many CAPD-specific ids and server-side HTML export. Authors still could not tune section order or field visibility per CV without code changes. The preview page used inline HTML injection; export CSS leaked into app chrome.

Separately, the import LLM allowlist was a static JSON file. Mastra/models.dev publishes provider models that should refresh on a schedule while keeping a pinned fallback for offline startup.

## Goals / Non-Goals

**Goals:**

- Persist presentation config keyed by `(cv_id, template_id)` as JSONB validated against `CvTemplatePresentationConfig`.
- Merge stored config with template defaults in `renderResumeHtml` before section rendering.
- Expose authenticated CRUD-style read/update via Nest (`GET`/`PATCH` template-presentation).
- Collapse visual variants to **four** canonical templates sharing one factory (`classic`, `modern`, `tabular`, `left`).
- Preview page: iframe `srcDoc`, layout panel, debounced PATCH, skeleton while HTML loads.
- Refresh import model catalog from models.dev daily; use fallback on failure.

**Non-Goals:**

- User-authored CSS or WYSIWYG template editor.
- Client-side resume HTML rendering.
- Thumbnail PNG generation for templates.
- Changing JSON Resume schema per template.

## Decisions

### 1. Presentation config as JSONB per (cv, template)

**Choice:** Table `cv_template_presentation(cv_id, template_id, config, updated_at)` with RLS via `cv.user_id`. Defaults computed in `getDefaultPresentationConfig(templateId)` when no row exists.

**Rationale:** Authors may want different section orders for `modern` vs `classic` on the same CV; composite key avoids overwrite when switching templates.

### 2. Four visual templates (factory pattern)

**Choice:** `visual-templates.ts` registers `classic`, `modern`, `tabular`, `left` with shared `renderWithDefinition`. Remove individual `capd-*` modules.

**Rationale:** CAPD samples differ mainly in header/heading styles and spacing—one factory covers them with presentation config handling section order. Reduces maintenance vs 14 near-duplicate files.

**Migration:** DB default `template_id` → `classic`; API maps unknown legacy ids to `classic` where needed.

### 3. Preview iframe + design tokens

**Choice:** Fetch export HTML from API; set `iframe[srcDoc]`. Wrap iframe in `surface-soft` per `DESIGN.md`. Toolbar stays outside iframe for print/download.

**Rationale:** Isolates export CSS; matches print target; avoids `dangerouslySetInnerHTML` on app DOM.

### 4. Import catalog refresh service

**Choice:** `ImportModelsCatalogService` loads fallback on boot, attempts models.dev fetch, cron at midnight, exposes status for ops. `IMPORT_MODELS_STATIC_ONLY=true` skips network.

**Rationale:** Keeps allowlist current without manual `catalog.json` edits; fallback guarantees API startup.

## Risks / Trade-offs

- **Breaking template ids** — Clients using `capd-*` must migrate to canonical ids; mitigated by default `classic` and validation on PATCH.
- **Large catalog.json** — Repo size grows; mitigated by build script and optional static-only mode.
- **Presentation config complexity** — Many toggles; mitigated by defaults per template and colocated tests.

## Migration Plan

1. Apply `20260528150000_cv_template_presentation.sql`.
2. Apply updated `20260528140000_cv_template_id.sql` default `classic`.
3. Deploy API (catalog service + presentation endpoints) then web.

## Open Questions

- None for v1; thumbnail gallery for templates remains future work.
