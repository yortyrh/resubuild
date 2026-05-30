## Context

The CV editor shell already linked to preview (`cv-html-view-pdf-export`). After `jsonresume-export`, PDF and JSON download helpers exist in `apps/web/src/lib/api.ts`. Users should export without visiting the preview route first.

## Goals / Non-Goals

**Goals:**

- Export (PDF/JSON) and Preview accessible from every section tab header.
- Toolbar fits narrow viewports: icon-only buttons below `lg`, labels from `lg`.
- Export listed before Preview (primary action first).

**Non-Goals:**

- Replacing preview-page export controls.
- Client-side resume assembly for export (server endpoints remain source of truth).
- New export formats.

## Decisions

### 1. `CvEditorHeaderActions` component

**Choice:** Extract Preview + Export into `CvEditorHeaderActions`, mounted from `CvEditorChrome`.

**Rationale:** Keeps chrome layout separate from download logic; reusable tests.

### 2. Export as dropdown, not separate buttons

**Choice:** Single **Export** trigger with menu items for PDF and JSON.

**Rationale:** Saves horizontal space; matches preview page offering both formats without three header buttons.

### 3. Progressive label hiding at `lg`

**Choice:** Both Export and Preview use `hidden lg:inline` for text; icons always visible; `aria-label` when text hidden.

**Rationale:** Matches preview toolbar density; breadcrumb keeps room on tablets and phones.

### 4. Export before Preview in DOM/flex order

**Choice:** Render Export dropdown first, Preview link second (left-to-right in LTR).

**Rationale:** Export is the actionable download; Preview is navigation.

## Risks / Trade-offs

- **[Icon-only buttons on mobile]** → Mitigated with explicit `aria-label` on both controls.
- **[PDF uses stored template]** → `useCv` supplies `templateId` for PDF export, same as preview page.

## Migration Plan

Web-only deploy. No migration.
