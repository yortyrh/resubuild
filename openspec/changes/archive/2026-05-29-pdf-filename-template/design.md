## Context

`CvExportService.renderPdf` constructs the PDF filename using only the resume title via `slugifyExportFilename(deriveCvTitleFromBasics(resume.basics))`, producing e.g. `alex-mercer.pdf`. The template label is available in `loadExportContext` as `templateId` but not included in the filename. Additionally, the `Content-Disposition` header set by the controller was not readable by the web app's `fetch` due to missing CORS `exposedHeaders` configuration, causing the fallback to `resume.pdf`.

## Goals / Non-Goals

**Goals:**

- Filename format: `{name} - {label}.pdf` (e.g., `alex-mercer - classic.pdf`)
- Template label sourced from the template registry (`listTemplates()`)
- Expose `Content-Disposition` header via CORS so the web app can read it

**Non-Goals:**

- Changing HTML export filename (it remains title-only)
- Changing any PDF content or rendering logic
- Supporting user-supplied custom filenames

## Decisions

1. **Expose Content-Disposition via CORS**

   Add `exposedHeaders: ['Content-Disposition']` to the CORS configuration in `apps/api/src/main.ts`. Without this, the web app's `fetch` cannot read the header and falls back to `'resume.pdf'`.

2. **Include template label in filename**

   After slugifying the CV title, append ` - {label}` before `.pdf`. Template labels are controlled by the codebase (not user input), so no additional sanitization is needed beyond what the slugify function already handles.

3. **No new utility needed**

   The existing `slugifyExportFilename` normalizes the title. Template labels contain only letters, spaces, and punctuation — no filesystem-unsafe characters. No changes to `cv-export.util.ts` are required.

## Risks / Trade-offs

- [Risk] Template label contains characters that could be problematic on some filesystems (e.g., `/`, `\\`, `:`) → **Mitigation**: The registry labels are controlled by the codebase (not user input), so they are known-safe. If needed, the same `slugifyExportFilename` can be applied to the label.
- [Risk] Long filenames on some platforms (255 chars) → **Mitigation**: Filename will grow modestly (a few extra chars for ` - classic`). If the name is already very long, truncation is not introduced by this change.
