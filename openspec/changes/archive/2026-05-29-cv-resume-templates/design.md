## Context

`cv-html-view-pdf-export` (prerequisite) introduces `packages/resume-template` with a single **MIT classic** renderer, `CvExportService` assembly path, and authenticated `GET /cv/:id/export/html|pdf`. The web preview route fetches API HTML and supports print/download — it does **not** render resume layout in React.

MIT CAPD publishes 14 sample résumé pages in `modern-jsonresume/examples/sampe-resumes-capd.pdf`. Each page demonstrates a distinct layout convention (section order, typography, header shape, skills placement). Users need to pick among these when previewing or exporting.

Current gap: one hard-coded template; adding layouts would require editing export services (violates Open/Closed).

## Goals / Non-Goals

**Goals:**

- **Template registry** in `packages/resume-template`: stable `ResumeTemplate` interface, `registerTemplate`, `getTemplate`, `listTemplates`, `renderResumeHtml(resume, templateId, options)`.
- Implement **14 CAPD-aligned templates** (see catalog below) plus retain **`mit-classic`** from the export change as default.
- **Server-only HTML**: API resolves template, renders full document; PDF uses identical HTML path.
- **Template selection**: persisted on CV (`template_id` column); overridable via `?template=` on export routes for preview-before-save.
- **Catalog API**: `GET /cv/export/templates` for web picker (id, label, category, capdPage reference).
- **Web**: template picker on preview page only; refetch HTML on change; no React template components.

**Non-Goals:**

- Client-side HTML/CSS template rendering or `@react-pdf/renderer`.
- User-defined custom templates, template marketplace, or drag-and-drop layout editor.
- Different JSON Resume schemas per template (all templates consume the same assembled `Resume`).
- Thumbnail PNG generation in v1 (optional static assets later).

## Decisions

### 1. Open/Closed template registry (Strategy pattern)

**Choice:** Each template is a module exporting a `ResumeTemplate` object. A central `registry.ts` imports and registers all built-ins at package load. `CvExportService` depends only on `getTemplate(id)` and `renderResumeHtml` — never imports individual layout files.

**Adding a template:** create `packages/resume-template/src/templates/<id>.ts`, implement `render`, add one line to `registry.ts`. No changes to Nest controllers or export service logic.

**Alternatives:**

- **Switch/case in export service** — rejected; closed for extension.
- **Runtime plugin loading** — rejected; unnecessary complexity for v1.
- **Separate npm packages per template** — rejected; monorepo package with folders is sufficient.

### 2. Shared rendering primitives

**Choice:** Extract shared helpers into `packages/resume-template/src/primitives/`:

- `markdown.ts` — sanitized Markdown fields (from export change)
- `sections/` — optional composable section renderers (work, education, skills) with layout **variants** passed as options
- `document.ts` — HTML shell, `@page` print CSS, font stacks

Each CAPD template composes primitives with different section order, CSS classes, and header markup. Templates that differ only in section order reuse the same section functions with a `sectionOrder` array.

**Rationale:** Reduces duplication across 14 layouts while keeping each template file readable and independently testable.

### 3. CAPD template catalog (14 pages)

| `template_id`                 | CAPD label (PDF page)   | Distinguishing layout                                                    |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `mit-classic`                 | (export change default) | Centered header, ALL-CAPS ruled sections, experience before education    |
| `capd-first-year-tabular`     | First-Year (p.1)        | Tabular two-column header; mixed section labels                          |
| `capd-first-year-leadership`  | First-Year (p.2)        | LEADERSHIP EXPERIENCES / WORK EXPERIENCE blocks; MIT sidebar note        |
| `capd-undergraduate-mixed`    | Undergraduate (p.3)     | Sentence-case section titles; Experience before Education                |
| `capd-undergraduate-standard` | Undergraduate (p.4)     | ALL-CAPS sections; Education before Experience                           |
| `capd-design`                 | Design (p.5)            | Design-oriented typography/spacing (visual hierarchy for creative roles) |
| `capd-global`                 | Global (p.6)            | International education emphasis; study-abroad formatting                |
| `capd-masters-icons`          | Masters (p.7)           | Symbol separators (☞) in header/skills; compact entry blocks             |
| `capd-masters-skills-first`   | Masters (p.8)           | RELEVANT SKILLS before EXPERIENCE; honors block                          |
| `capd-phd-academic`           | PhD (p.9)               | Education-first; publications/fellowships dense layout                   |
| `capd-phd-summary`            | PhD (p.10–11)           | SUMMARY + SKILLS before EXPERIENCE; multi-page friendly                  |
| `capd-phd-consulting`         | PhD Consulting (p.12)   | Industry internships + leadership; awards inline                         |
| `capd-alum`                   | Alum (p.13–14)          | SUMMARY + EXPERIENCE first; EDUCATION last; additional info block        |

Default for new and existing CVs: `mit-classic`.

### 4. Persistence: `cv.template_id`

**Choice:** Migration adds `template_id text not null default 'mit-classic'` with check constraint or app-level validation against registry ids. `PATCH /cv/:id` accepts optional `templateId`. Export routes resolve: query param → CV stored value → `mit-classic`.

**Alternatives:**

- Query param only — rejected; user would re-select every session.
- JSON in `meta` — rejected; normalized column is queryable and simpler.

### 5. API surface

**Choice:**

- `GET /cv/export/templates` → `{ templates: [{ id, label, description, category, capdPage }] }`
- `GET /cv/:id/export/html?template=<id>` — optional; validates id
- `GET /cv/:id/export/pdf?template=<id>` — same resolution
- `PATCH /cv/:id` — optional `templateId` in DTO

Unknown template → **400** with allowed ids list. Missing CV → **404** (unchanged).

**Rationale:** HTML remains the single source for preview, print, and Puppeteer PDF.

### 6. Web preview: picker only, API HTML only

**Choice:** Preview page adds a `<Select>` or gallery bound to `listCvTemplates()`. On change:

1. Optionally `PATCH` CV `templateId` (debounced save) or pass query param only until explicit Save — **default: PATCH on select** so print/PDF match without extra clicks.
2. Refetch `getCvExportHtml(cvId, templateId)`.
3. Display via `srcDoc` iframe or sanitized innerHTML — **prefer iframe `srcDoc`** for print isolation.

React SHALL NOT import `renderResumeHtml` or template CSS modules for layout.

**Alternatives:**

- Embed API URL in iframe `src` — auth complexity; stick to fetch + srcDoc.
- Client-side template preview cards — rejected.

### 7. Testing strategy

**Choice:**

- Unit: each template renders sample JSON without throw; snapshot or DOM substring assertions for section order (e.g. Education index vs Experience index).
- API: export with valid/invalid template id; templates list returns ≥15 entries.
- E2E (optional): preview page changes template and HTML body class or data attribute differs.

## Risks / Trade-offs

| Risk                                    | Mitigation                                                               |
| --------------------------------------- | ------------------------------------------------------------------------ |
| 14 layouts drift from CAPD PDF          | Reference `capdPage` in metadata; visual QA checklist against PDF pages  |
| Large package size / maintenance        | Shared primitives; templates are thin composition layers                 |
| Template picker confuses users          | Group by category; default `mit-classic`; show CAPD label in description |
| Breaking export URLs                    | `template` query optional; default unchanged                             |
| Registry out of sync with DB constraint | Single source: export `TEMPLATE_IDS` from registry for validation        |

## Migration Plan

1. **Depends on** `cv-html-view-pdf-export` merged or applied first (`mit-classic`, export routes, preview route skeleton).
2. Refactor `renderResumeHtml` to registry; move current renderer to `templates/mit-classic.ts`.
3. Add migration `template_id` column; backfill `mit-classic`.
4. Implement CAPD templates incrementally (can ship in batches behind feature flag `CV_TEMPLATES_ENABLED` if needed).
5. Add catalog route + web picker.
6. Update sample PDF script to `--template` flag or generate all templates.

Rollback: revert migration (drop column); export falls back to `mit-classic` only.

## Open Questions

- **Design template (p.5):** PDF page title only in extract — confirm visual reference during implementation (may need designer review of PDF page 5).
- **Auto-save template on picker change vs explicit Save** — default auto-save on select; confirm with product.
- **Static preview thumbnails** for gallery UI — defer to v2 or use CAPD page numbers in labels only.
