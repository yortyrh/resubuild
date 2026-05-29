## Why

The PDF downloaded from the preview page always gets named `{name}.pdf` (e.g., `alex-mercer.pdf`), derived from the resume title. Additionally, the `Content-Disposition` header carrying the correct filename was not exposed to the browser due to missing CORS configuration, causing the web app to fall back to `resume.pdf`. Users with multiple templates want the filename to also reflect which template was used, so they can distinguish files on disk.

## What Changes

- Expose `Content-Disposition` header via CORS `exposedHeaders` so the web app can read the filename the API sets
- Change `renderPdf` filename generation to include the template label: `{name} - {label}.pdf` (e.g., `alex-mercer - classic.pdf`)
- No changes to the PDF content or rendering logic
- No changes to the HTML export filename

## Capabilities

### New Capabilities

- (no new capabilities — this is a small filename-format change)

### Modified Capabilities

- `cv-resume-templates`: the `renderPdf` output filename now includes the template label, requiring access to template metadata at PDF generation time

## Impact

- **apps/api**: `main.ts` — add `exposedHeaders: ['Content-Disposition']` to CORS config so the header is readable by the web app fetch
- **apps/api**: `cv-export.service.ts` — modify filename construction in `renderPdf` to include template label
- No API contract changes (Content-Disposition header already carries the filename)
- No web app changes required
