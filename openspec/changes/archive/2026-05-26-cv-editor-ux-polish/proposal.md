## Why

The CV editor and dashboard have accumulated UX gaps after recent navigation and field-coverage work: loading states are plain text, section navigation still used a mobile drawer while desktop gained a sidebar, resume-preview rows mixed entity URLs into titles instead of subtitles, optional empty URL fields could fail schema validation on save, and form keyboard flows (Enter to save or add list rows) were inconsistent. This change bundles a cohesive polish pass so authors get clearer hierarchy, faster perceived performance, safer persistence, and keyboard-friendly editing without another round of fragmented fixes.

## What Changes

- **Navigation & chrome**: Replace the mobile Sheet drawer with a collapsible icon sidebar at all breakpoints; add Lucide section icons; add breadcrumb trail (`My CVs → CV title → section`); remove duplicate page/editor headings; soften dashboard and editor surfaces (`surface-soft`, divider utilities).
- **Loading skeletons**: Add shadcn `Skeleton` and purpose-built placeholders for session gate, CV list, CV editor (section-aware), and Wysimark markdown editors during dynamic import/hydration.
- **Resume-preview layout**: Split Work/Volunteer position vs linked entity into title/subtitle; move Skills level and Publications publisher to subtitle; introduce labeled metadata rows (`Entity`, `Type`, `Roles`, `Keywords`, `Highlights`, `Courses`); distinct role pill styling on Projects.
- **External links**: Shared sky-tone link styling with optional external-link icon; entity URLs in subtitles use the same affordance via `linkedEntitySubtitle`.
- **Form keyboard UX**: Wrap create/edit item forms in `<form>` with submit-on-Enter; `StringListField` Enter adds/focuses next row; empty TagsInput Enter submits parent form; Create CV form submits on Enter.
- **Payload sanitization**: New `sanitizeResumeItemPayload` in `@resumind/types` strips empty strings before array-item create/update on API and web client.
- **Markdown editor**: Slate peer deps for focus helpers; smaller inline/block heights; skeleton loaders per variant; optional `autoFocus` with retry until Slate mounts.
- **Dashboard CV list**: Replace `window.confirm` delete with shared `DeleteItemDialog`; match resume-item card styling.
- **API client**: Treat HTTP 205 and empty JSON bodies as successful empty responses.
- **CV title helpers**: `deriveCvShortTitleFromBasics` for compact breadcrumb on small screens.

## Capabilities

### New Capabilities

<!-- None — all behavior extends existing product surfaces -->

### Modified Capabilities

- `cv-editor-ui`: Collapsible icon sidebar (replacing mobile drawer), breadcrumbs, skeleton loading, metadata-labeled preview rows, title/subtitle entity layout, external link styling, highlight/course section titles, form Enter behavior, Wysimark loading/focus polish.
- `cv-item-crud`: Server and client SHALL sanitize array-item payloads by omitting empty string fields before persistence.
- `web-application`: Dashboard and editor loading states SHALL use skeleton placeholders; CV delete SHALL use a confirmation dialog instead of `window.confirm`.

## Impact

- **packages/types**: `resume-item-payload.ts`, `deriveCvShortTitleFromBasics`, exports and tests.
- **apps/api**: `cv-item.service.ts` applies sanitization on create/update array items; new unit test.
- **apps/web**: CV editor components (`cv-sections`, `cv-section-layout`, `cv-section-nav-links`, `cv-item-ui`, `form-fields`, `tags-*`, `external-link`, `markdown-editor*`, `metadata-field`, new skeleton/breadcrumb/icon components); dashboard (`cv-list`, `session-gate`, layout, `globals.css`); `create-cv-form`; `api.ts`.
- **Dependencies**: `slate@0.85.0`, `slate-react@0.83.2` (Wysimark focus integration); shadcn `breadcrumb`, `skeleton`.
- **Tests**: Colocated Vitest/Jest updates across web, types, and api packages.
- **No database or schema migrations**.
