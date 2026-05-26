## Why

Clicking through CV section navigation reveals a horizontal layout shift (~7.5px) whenever page content becomes tall enough to show a vertical scrollbar. The sticky sidebar, nav links, breadcrumb, and content pane all jump left on sections like Work, Skills, Projects, and Certificates, then snap back on shorter sections (Basics, Awards, References). This jitter makes the editor feel unstable and undermines the polished sidebar UX from recent navigation work.

## What Changes

- **Stable scrollbar gutter**: Reserve vertical scrollbar space on the document root so layout width stays constant whether or not the page scrolls.
- **Verification**: Document expected nav/content bounding-box stability across all 13 CV sections after the fix.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: CV editor shell SHALL keep section sidebar and main content horizontally stable when switching between sections with different content heights.

## Impact

- **apps/web**: `globals.css` (or root layout) — add `scrollbar-gutter: stable` on `html`/`body`.
- **Tests**: Optional Playwright or manual QA checklist in tasks; no API or schema changes.
- **No database migrations or dependency updates**.
