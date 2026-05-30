## Why

PDF and Markdown imports still auto-created a CV on the server and skipped the preview-and-confirm step that JSON and URL imports already used. Users could not review how their résumé would look before persistence, and import paths diverged in UX. Unifying all imports around a prepared JSON Resume object plus a shared visual preview reduces orphan CVs and makes Edit/Preview actions consistent.

A follow-up simplification converges the web UX to **two import entry points** (file and URL) with automatic format detection, a clear **Import → Save** two-step confirm flow, and stable layout (skeleton, fixed-height dropzone, progress bar under actions, toasts for success hints).

## What Changes

- **BREAKING (API):** PDF and Markdown import jobs return `previewData` on success instead of auto-creating a CV (`cvId` absent until client confirms).
- Converge PDF, Markdown, URL, and JSON import flows on a single client-side `ImportSourcePreview` before calling `createCv`.
- Add shared **Import preview dialog** (template picker + iframe render via `@resumind/resume-template`).
- **Web simplification:** Replace separate JSON/PDF/Markdown import routes with **Import from file** (`/dashboard/cv/new/import/file`) that auto-detects `.json`, `.pdf`, or `.md`; keep **Import from URL** (`/dashboard/cv/new/import/url`). Legacy `/import/json`, `/import/pdf`, `/import/markdown` redirect to file import.
- Primary action row uses **Import** (fetch/convert) then **Save** (create CV) with matching labels on file and URL forms.
- JSON validation messages shown inline only for direct JSON or after Edit; agent-processed paths use toasts for readiness and photo hints.
- Stable import UI: loading skeleton, fixed-height file dropzone, type badge + clear control top-right, progress bar below action buttons (shown only while active).

## Capabilities

### New Capabilities

- `import-preview-ui`: Shared import preview dialog, unified file/URL forms, Edit dialog rename/icon, Import/Save action row, progress bar, validation toasts, and loading skeleton.

### Modified Capabilities

- `cv-pdf-import`: PDF and Markdown jobs return `previewData`; web polls then confirms create.
- `cv-rest-api`: Import job success semantics for PDF/Markdown align with website import.
- `cv-json-import`: Unified file import with auto-detect; preview-then-create unchanged.
- `web-application`: New CV menu exposes file import, URL import, and manual create only.

## Impact

- **API** (`apps/api/src/import/`): PDF/Markdown finalize returns `previewData` instead of creating CV rows.
- **Web** (`apps/web/src/components/cv/`): `import-file-form`, `import-url-form`, `import-preview-dialog`, `import-form-actions`, `import-progress-bar`, `import-validation-feedback`, `import-file-form-skeleton`; removed legacy per-format forms.
- **Packages**: Client-side `renderResumeHtml` + `listCvTemplates`.
- **Tests**: Colocated Vitest for unified import forms, preview dialog, API import specs.
- **No database or schema migrations.**
