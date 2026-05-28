# Resume template package

Server-side JSON Resume → HTML templates for preview, print, and PDF export.

## Extension contract (Open/Closed)

1. Create `src/templates/<template-id>.ts` exporting a `ResumeTemplate` (or use `createCapdTemplate` from `capd-factory.ts`).
2. Register it in `src/registry.ts` via `registerTemplate()` or add to the built-in list.
3. No changes required in `apps/api` export services — they resolve templates through `getTemplate()` / `renderResumeHtml()`.

Each template implements:

- `id` — stable slug used in API query params and `cv.template_id`
- `label`, `description`, `category`, optional `capdPage`
- `render(resume, options?)` — returns a complete HTML document

Shared building blocks live under `src/primitives/` (document shell, markdown, section renderers).

## Visual QA checklist

Compare each template against the corresponding page in `modern-jsonresume/examples/sampe-resumes-capd.pdf` using a seeded sample CV:

- [ ] `mit-classic` — centered header, ALL-CAPS sections, experience before education
- [ ] `capd-first-year-tabular` — p.1 tabular header
- [ ] `capd-first-year-leadership` — p.2 leadership/work blocks
- [ ] `capd-undergraduate-mixed` — p.3 sentence-case, experience first
- [ ] `capd-undergraduate-standard` — p.4 ALL-CAPS, education first
- [ ] `capd-design` — p.5 design typography
- [ ] `capd-global` — p.6 international education
- [ ] `capd-masters-icons` — p.7 icon separators
- [ ] `capd-masters-skills-first` — p.8 skills before experience
- [ ] `capd-phd-academic` — p.9 education-first
- [ ] `capd-phd-summary` — p.10–11 summary + skills first
- [ ] `capd-phd-consulting` — p.12 consulting layout
- [ ] `capd-alum` — p.13–14 experience before education

Generate samples: `pnpm samples:pdf -- --all-templates` or `pnpm samples:pdf -- --template capd-alum`.
