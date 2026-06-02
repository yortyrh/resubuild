## ADDED Requirements

### Requirement: The API SHALL expose an MCP server over Streamable HTTP

`apps/api` SHALL register an MCP server using the official Model Context Protocol SDK with Streamable HTTP transport at **`/mcp` and `/mcp/`** (both paths SHALL behave identically). The endpoint SHALL require MCP API key authentication per `mcp-api-keys`. The server SHALL advertise a stable server name and version in MCP initialization.

#### Scenario: Initialize session

- **WHEN** an MCP client connects with a valid API key and sends an initialize request
- **THEN** the server SHALL return server capabilities including the tools list

#### Scenario: Unauthenticated initialize

- **WHEN** an MCP client connects without a valid API key
- **THEN** the server SHALL reject the request before executing tools

### Requirement: MCP SHALL NOT expose agent configuration, search, or import/prepare flows

The MCP tool catalog MUST NOT include tools for: AI agent account or LLM provider configuration, web-scrape provider configuration, generic web/job search, PDF or URL import, media multipart upload, or `prepare_application` / application intake with files. Those capabilities remain in the Resumind web UI and REST routes behind Supabase JWT, or in the user's external agent (own LLM keys, browser, search MCP servers).

#### Scenario: No agent settings tool

- **WHEN** an MCP client lists available tools
- **THEN** the catalog SHALL NOT include tools named or described as configuring `ai_agent_account`, import LLM, or web scrape keys

#### Scenario: No search tool

- **WHEN** an MCP client lists available tools
- **THEN** the catalog SHALL NOT include web search, scrape-url, or job-board discovery tools

### Requirement: Every MCP tool SHALL include agent-oriented documentation

Each registered tool SHALL provide a non-empty MCP `description` that explains: (1) what the tool does, (2) when an agent should prefer it over related tools, (3) important constraints (e.g. primary CV only, irreversible delete). Each property in `inputSchema` SHALL include a `description`. Tools that mutate data SHOULD set MCP annotations (`destructiveHint`, `readOnlyHint`, `idempotentHint`) where applicable.

Presentation and export tools SHALL document allowed template ids, `SectionKey` values for `sectionOrder` / `hiddenSections`, and—for `export_cv_jsonresume`—that output conforms to the JSON Resume schema with `$schema` and without Resumind-internal row ids. `export_cv_html`, `export_cv_screenshot`, and `export_cv_pdf` descriptions SHALL clarify they use the same rendered HTML path as the web preview and respect saved presentation config.

#### Scenario: Tool list includes descriptions

- **WHEN** an MCP client requests the tool catalog after initialize
- **THEN** every tool entry SHALL include a `description` of at least 80 characters for data/export tools

#### Scenario: JSON Resume export tool references schema

- **WHEN** an agent reads the `export_cv_jsonresume` tool description
- **THEN** it SHALL state that output is canonical JSON Resume suitable for LLMs and external tools
- **AND** SHALL mention that `prepareExportedResume` strips internal ids and adds `$schema` / `meta`

### Requirement: MCP tools SHALL expose CV list, read, delete, and JSON Resume create/replace

The MCP server SHALL register:

- `list_cvs` — primary CVs only, same ordering as `GET /cv` (excludes `import_staging` and `application_clone`)
- `get_cv` — by id, owned by caller (editor-oriented response shape)
- `delete_cv` — by id
- `create_cv_from_jsonresume` — full JSON Resume document; normalize via `prepareImportedResume`, validate schema, insert as new `kind = 'primary'` CV
- `replace_cv_from_jsonresume` — arguments: `cvId` (target primary) + JSON Resume document; SHALL NOT perform per-section merge

The catalog MUST NOT include `update_cv` or item-level section CRUD tools in v1.

Tool handlers MUST NOT return CVs owned by other users.

#### Scenario: List CVs via tool

- **WHEN** an MCP client invokes `list_cvs` with a valid key
- **THEN** the result SHALL match the JSON shape of `GET /cv` for that user

#### Scenario: Cross-user CV access denied

- **WHEN** an MCP client invokes `get_cv` with another user's CV id
- **THEN** the tool SHALL return an error equivalent to REST 404

#### Scenario: Create from JSON Resume

- **WHEN** an MCP client invokes `create_cv_from_jsonresume` with a schema-valid JSON Resume object
- **THEN** the API SHALL persist a new primary CV
- **AND** the result SHALL include the new `cvId`

#### Scenario: Replace via staging swap

- **WHEN** an MCP client invokes `replace_cv_from_jsonresume` for an owned primary `cvId` with a schema-valid JSON Resume object
- **THEN** the service SHALL insert a staging CV with `kind = 'import_staging'` (not listed in `list_cvs`)
- **AND** in a single transaction SHALL delete the target primary CV and set the staging row to `kind = 'primary'`
- **AND** `list_cvs` SHALL show only the new CV at the new id (old id gone)

#### Scenario: Staging not visible during swap

- **WHEN** a replace is in progress before the transaction commits
- **THEN** `list_cvs` SHALL NOT include the `import_staging` row

#### Scenario: Replace target must be primary

- **WHEN** an MCP client invokes `replace_cv_from_jsonresume` with an `application_clone` id
- **THEN** the tool SHALL fail with an error equivalent to REST 400 or 404

### Requirement: MCP SHALL expose JSON Resume export for LLM and external tooling

The MCP server SHALL register `export_cv_jsonresume` delegating to `CvExportService.renderJson` (same as `GET /cv/:id/export/json`). The tool result SHALL be a JSON object parseable as JSON Resume (including `$schema` URI and `meta`), not the slim editor `data` shape returned by `get_cv`.

#### Scenario: Export JSON Resume

- **WHEN** an MCP client invokes `export_cv_jsonresume` with a valid owned `cvId`
- **THEN** the result SHALL include `$schema` and SHALL NOT include internal UUID `id` fields on section items

#### Scenario: Export differs from get_cv

- **WHEN** an MCP client invokes both `get_cv` and `export_cv_jsonresume` for the same CV
- **THEN** `export_cv_jsonresume` SHALL include full normalized sections appropriate for JSON Resume
- **AND** `get_cv` MAY return the editor bootstrap shape documented in the tool description

### Requirement: MCP SHALL expose template design and presentation tools matching the web preview

The MCP server SHALL register:

- `list_cv_designs` — same catalog as `GET /cv/export/templates` (template id, display metadata)
- `get_cv_template_presentation` — `template` query param required; same as `GET /cv/:id/template-presentation`
- `update_cv_template_presentation` — same as `PATCH /cv/:id/template-presentation`; config SHALL support at minimum `sectionOrder`, `hiddenSections`, `sectionLabels`, and per-section field visibility flags defined by `CvTemplatePresentationConfig`

These tools enable agents to show/hide sections, pick a design, and reorder sections for export—equivalent to the preview UI controls.

#### Scenario: List designs

- **WHEN** an MCP client invokes `list_cv_designs`
- **THEN** the result SHALL include at least the canonical template ids `classic`, `modern`, `tabular`, `left`

#### Scenario: Hide section for export

- **WHEN** an MCP client invokes `update_cv_template_presentation` with `hiddenSections` containing `projects` for template `classic`
- **THEN** a subsequent `export_cv_pdf` for that CV and template SHALL omit the Projects section from the PDF

#### Scenario: Reorder sections for a design

- **WHEN** an MCP client sets `sectionOrder` with `education` before `work` via `update_cv_template_presentation`
- **THEN** `export_cv_pdf` HTML/PDF output for that template SHALL reflect the new section sequence for visible sections

### Requirement: MCP SHALL expose HTML preview export matching the web preview

The MCP server SHALL register `export_cv_html` delegating to `CvExportService.renderHtml` (same as `GET /cv/:id/export/html`). Arguments SHALL include `cvId` and optional `template`. The tool result SHALL return `{ html, templateId }` where `html` is a complete HTML document suitable for display or vision-model input—the same output the web preview loads into `iframe[srcDoc]`.

#### Scenario: Export HTML

- **WHEN** an MCP client invokes `export_cv_html` with a valid owned `cvId` and `template: 'classic'`
- **THEN** the result `html` SHALL start with `<!DOCTYPE html>`
- **AND** SHALL reflect saved presentation config for that template

#### Scenario: HTML tool description guides agents

- **WHEN** an agent reads the `export_cv_html` tool description
- **THEN** it SHALL state that output matches the on-site preview and differs from `export_cv_jsonresume` (structured data vs rendered layout)

### Requirement: MCP SHALL expose PNG screenshots of the rendered CV

The MCP server SHALL register `export_cv_screenshot` delegating to a new `CvExportService.renderScreenshot` (or equivalent) that renders the same HTML as PDF/HTML export, then captures PNG via Puppeteer. Arguments SHALL include `cvId`, optional `template`, and optional `mode` (default **`first_page`**):

- `full_document` — full-page screenshot spanning 100% of the document height (Puppeteer `fullPage: true`)
- `first_page` — screenshot of the first printed page only (Letter-sized viewport, `fullPage: false`)

The tool result SHALL return `{ filename, contentType: 'image/png', contentBase64, mode, templateId }`. When Chromium is unavailable, the tool SHALL fail with an error equivalent to PDF export unavailability.

#### Scenario: Full-document screenshot

- **WHEN** an MCP client invokes `export_cv_screenshot` with `mode: 'full_document'`
- **THEN** the decoded PNG SHALL include content below the first viewport page when the résumé is longer than one page

#### Scenario: First-page screenshot

- **WHEN** an MCP client invokes `export_cv_screenshot` with `mode: 'first_page'`
- **THEN** the decoded PNG SHALL match the first page of the print layout (Letter format with template margins)
- **AND** SHALL NOT include content that appears only on subsequent pages

#### Scenario: Screenshot tool description guides agents

- **WHEN** an agent reads the `export_cv_screenshot` tool description
- **THEN** it SHALL explain when to use `full_document` vs `first_page` vs `export_cv_pdf`

### Requirement: MCP SHALL expose PDF export for a chosen design

The MCP server SHALL register `export_cv_pdf` delegating to `CvExportService.renderPdf`. Arguments SHALL include `cvId` and optional `template` (defaulting to the CV's active template or `classic` per service rules). The tool result SHALL return `{ filename, contentType: 'application/pdf', contentBase64 }` so MCP clients can save or attach the file without binary HTTP download.

#### Scenario: Export PDF

- **WHEN** an MCP client invokes `export_cv_pdf` with valid `cvId` and `template: 'modern'`
- **THEN** the result SHALL include non-empty `contentBase64` decodable to a valid PDF
- **AND** `filename` SHALL end with `.pdf`

### Requirement: MCP tools SHALL expose job application read and update operations

The MCP server SHALL register tools:

- `list_applications` — active/list-visible applications only (same filter as `GET /applications`)
- `get_application` — by id
- `update_application` — fields allowed by REST `PATCH /applications/:id`
- `update_application_letter` — letter body updates where REST supports them

Prepare, cancel, promote-clone, and multipart intake SHALL NOT be exposed as MCP tools in v1.

#### Scenario: List applications excludes hidden update drafts

- **WHEN** a user has an active application and a hidden update draft per `job-application-update-lifecycle`
- **THEN** `list_applications` SHALL return only the active/list-visible application

#### Scenario: Update application via tool

- **WHEN** an MCP client invokes `update_application` with valid fields for an owned application
- **THEN** the persisted application SHALL match the outcome of the equivalent REST patch

### Requirement: MCP tool inputs and errors SHALL be structured and safe

Each tool SHALL define a JSON Schema (or Zod-derived schema) for arguments. Validation failures SHALL return MCP tool errors with human-readable messages. Successful results SHALL be JSON-serializable. Errors MUST NOT include stack traces or internal secrets in production.

#### Scenario: Invalid tool arguments

- **WHEN** an MCP client invokes `create_cv_from_jsonresume` without a JSON Resume `basics` object
- **THEN** the tool SHALL fail with a validation error and SHALL NOT persist partial data

#### Scenario: Screenshot default mode

- **WHEN** an MCP client invokes `export_cv_screenshot` without `mode`
- **THEN** the capture SHALL use `first_page` semantics

#### Scenario: Unknown template on presentation update

- **WHEN** an MCP client invokes `update_cv_template_presentation` with `template: 'unknown-id'`
- **THEN** the tool SHALL fail with an error equivalent to REST 400

### Requirement: MCP binary exports SHALL enforce a maximum decoded payload size

Tools returning `contentBase64` for PDF or PNG (`export_cv_pdf`, `export_cv_screenshot`) SHALL reject responses whose decoded binary exceeds **10 MiB** (configurable via env, default 10 MiB) with **413 Payload Too Large** and a message that does not include binary data.

#### Scenario: Oversize PDF export

- **WHEN** a rendered PDF exceeds the configured maximum size
- **THEN** the tool SHALL fail with 413 and guidance to reduce content or sections

### Requirement: MCP server MAY be disabled globally via configuration

When environment variable `MCP_SERVER_ENABLED` is `false`, the MCP endpoint SHALL respond with 503 and a clear message. JWT-protected key management endpoints MAY remain available so users can prepare keys before enablement.

#### Scenario: Global disable

- **WHEN** `MCP_SERVER_ENABLED` is `false`
- **THEN** MCP protocol requests to `/mcp` SHALL receive 503
