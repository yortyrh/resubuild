## MODIFIED Requirements

### Requirement: MCP SHALL expose HTML preview export matching the web preview

The MCP server SHALL register `export_cv_html` delegating to `CvExportService.renderHtml` (same as `GET /cv/:id/export/html`). Arguments SHALL include `cvId` and optional `template`. The tool result SHALL return the signed-URL envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind: 'html', templateId }` where `url` is a Supabase Storage signed URL for the rendered HTML document. The envelope MUST NOT include the full HTML string inline. The signed URL is the canonical handoff — the same output the web preview loads into `iframe[srcDoc]` is reachable by fetching the URL.

#### Scenario: Export HTML returns a signed URL envelope

- **WHEN** an MCP client invokes `export_cv_html` with a valid owned `cvId` and `template: 'classic'`
- **THEN** the result includes `url` and the matching `exportId`, `expiresAt`, `filename`, `contentType = 'text/html; charset=utf-8'`, `sizeBytes`, `kind = 'html'`, and `templateId = 'classic'`
- **AND** the URL is fetchable and returns HTML starting with `<!DOCTYPE html>` reflecting the saved template presentation

#### Scenario: HTML tool description guides agents

- **WHEN** an agent reads the `export_cv_html` tool description
- **THEN** it SHALL state that the result is a signed-URL envelope (not inline HTML), explain that the URL can be opened in a browser tab, and reference `fetch_export_url` to refresh the URL before it expires

### Requirement: MCP SHALL expose PNG screenshots of the rendered CV

The MCP server SHALL register `export_cv_screenshot` delegating to `CvExportService.renderScreenshot` (which renders the same HTML as PDF/HTML export, then captures PNG via Puppeteer). Arguments SHALL include `cvId`, optional `template`, and optional `mode` (default **`first_page`**):

- `full_document` — full-page screenshot spanning 100% of the document height (Puppeteer `fullPage: true`)
- `first_page` — screenshot of the first printed page only (Letter-sized viewport, `fullPage: false`)

The tool result SHALL return the signed-URL envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind: 'screenshot', templateId, mode }` where `url` is a Supabase Storage signed URL for the rendered PNG. The envelope MUST NOT include base64-encoded PNG bytes inline. When Chromium is unavailable, the tool SHALL fail with 503.

#### Scenario: Full-document screenshot

- **WHEN** an MCP client invokes `export_cv_screenshot` with `mode: 'full_document'`
- **THEN** the result envelope's `mode = 'full_document'`
- **AND** fetching the returned `url` returns a PNG whose height spans the entire résumé when the document is longer than one page

#### Scenario: First-page screenshot

- **WHEN** an MCP client invokes `export_cv_screenshot` with `mode: 'first_page'`
- **THEN** the result envelope's `mode = 'first_page'`
- **AND** fetching the returned `url` returns a PNG matching the first page of the print layout (Letter format with template margins)

#### Scenario: Screenshot tool description guides agents

- **WHEN** an agent reads the `export_cv_screenshot` tool description
- **THEN** it SHALL state the result is a signed-URL envelope and explain when to use `full_document` vs `first_page` vs `export_cv_pdf`

### Requirement: MCP SHALL expose PDF export for a chosen design

The MCP server SHALL register `export_cv_pdf` delegating to `CvExportService.renderPdf`. Arguments SHALL include `cvId` and optional `template` (defaulting to the CV's active template or `classic` per service rules). The tool result SHALL return the signed-URL envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType: 'application/pdf', sizeBytes, kind: 'pdf', templateId }` where `url` is a Supabase Storage signed URL for the rendered PDF. The envelope MUST NOT include base64-encoded PDF bytes inline.

#### Scenario: Export PDF returns a signed URL envelope

- **WHEN** an MCP client invokes `export_cv_pdf` with valid `cvId` and `template: 'modern'`
- **THEN** the result includes `url` whose fetched body is a valid PDF
- **AND** `filename` ends with `.pdf`, `contentType = 'application/pdf'`, and `kind = 'pdf'`

### Requirement: MCP SHALL expose JSON Resume export for LLM and external tooling

The MCP server SHALL register `export_cv_jsonresume` delegating to `CvExportService.renderJson` (same as `GET /cv/:id/export/json`). The tool result SHALL return the signed-URL envelope `{ exportId, url, expiresAt, expiresInSeconds, filename, contentType, sizeBytes, kind: 'jsonresume' }` where `url` is a Supabase Storage signed URL for the canonical JSON Resume document. The envelope MAY additionally include a `document` field with the parsed JSON Resume object (for inline LLM reasoning without a follow-up `fetch`) — this convenience field does not replace the URL. The result SHALL include `$schema` in `document` and SHALL NOT include internal UUID `id` fields on section items.

#### Scenario: Export JSON Resume returns an envelope plus parsed document

- **WHEN** an MCP client invokes `export_cv_jsonresume` with a valid owned `cvId`
- **THEN** the result includes a `url` whose fetched body is a valid JSON Resume document (contains `$schema` and `meta`)
- **AND** if `document` is included, it is a JSON object with `$schema` and without internal UUID `id` fields on section items

#### Scenario: Export differs from get_cv

- **WHEN** an MCP client invokes both `get_cv` and `export_cv_jsonresume` for the same CV
- **THEN** `export_cv_jsonresume` SHALL include the canonical normalized sections appropriate for JSON Resume in `document`
- **AND** `get_cv` MAY return the editor bootstrap shape documented in the tool description

### Requirement: MCP binary exports SHALL enforce a maximum decoded payload size

Tools returning rendered artifacts to object storage (`export_cv_pdf`, `export_cv_screenshot`, `export_cv_html`, `export_cv_jsonresume`) SHALL reject uploads whose decoded binary exceeds **10 MiB** (configurable via `MCP_EXPORT_MAX_BYTES`, default 10 MiB) with **413 Payload Too Large** and a message that does not include binary data. The cap is checked at upload time inside `ExportStorageService` and surfaces to the tool caller as 413.

#### Scenario: Oversize PDF export

- **WHEN** a rendered PDF exceeds the configured maximum size
- **THEN** the `export_cv_pdf` tool SHALL fail with 413 and guidance to reduce content or sections
- **AND** no row SHALL be inserted in `public.mcp_export` and no object SHALL be left in the bucket
