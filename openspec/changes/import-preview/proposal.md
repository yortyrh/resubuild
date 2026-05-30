## Why

PDF and Markdown imports still auto-create a CV on the server and skip the preview-and-confirm step that JSON and URL imports already use. Users cannot review how their résumé will look before persistence, and import paths diverge in UX (some show raw JSON, some navigate away immediately). Unifying all imports around a prepared JSON Resume object plus a shared visual preview will reduce orphan CVs, match user expectations from the full preview page, and make Edit/Preview actions consistent across every import route.

## What Changes

- **BREAKING (API):** PDF and Markdown import jobs SHALL return `previewData` on success instead of auto-creating a CV (`cvId` absent until client confirms).
- Converge PDF, Markdown, URL, and JSON import flows on a single client-side `ImportSourcePreview` (prepared JSON Resume) before calling `createCv`.
- Add a shared **Import preview dialog** that renders the résumé with template selection only (no layout/section panel), reusing `@resumind/resume-template` client-side rendering.
- Rename **Edit JSON…** to **Edit** with a left-aligned edit icon; expose Edit + Preview actions on JSON, PDF, Markdown, and URL import forms once valid preview data exists.
- Replace inline raw JSON preview blocks (URL import) with the visual preview dialog.
- Include ASCII wireframes in the change design artifact documenting import form states and both dialogs.

## Capabilities

### New Capabilities

- `import-preview-ui`: Shared import preview dialog (template picker + iframe render), Edit dialog rename/icon, and consistent action bar across import forms.

### Modified Capabilities

- `cv-pdf-import`: PDF and Markdown jobs return `previewData`; web app polls for preview then confirms create (same as URL HTML import).
- `cv-rest-api`: Import job success semantics for PDF/Markdown align with website import (`previewData`, no automatic CV row).
- `cv-json-import`: Manual edit dialog title/label changes; preview dialog available when JSON is valid.
- `web-application`: All import routes expose Preview + Edit actions and follow preview-then-create UX.

## Impact

- **API** (`apps/api/src/import/`): Finalize step for PDF/Markdown jobs stops calling CV create; sets `previewData` on job store instead.
- **Web** (`apps/web/src/components/cv/`): New `import-preview-dialog.tsx`; updates to `import-pdf-cv-form`, `import-markdown-cv-form`, `import-url-form`, `import-cv-form`, `import-json-edit-dialog`; shared import action bar helper.
- **Packages**: Client-side `renderResumeHtml` + `listCvTemplates` (already used on preview page).
- **Tests**: Colocated Vitest for preview dialog and updated import form tests; E2E import job contract updates for PDF/Markdown.
- **No database or schema migrations.**
