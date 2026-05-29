## MODIFIED Requirements

### Requirement: The web app SHALL provide a print-faithful CV preview route

The App Router SHALL expose `/dashboard/cv/[id]/preview` for signed-in users. The page SHALL load export HTML from `GET /cv/:id/export/html` via the shared API client with Bearer authentication and display it in a layout optimized for reading and printing (minimal dashboard chrome, resume-centered content). The rendered document SHALL use the **API-selected export template** (stored CV template or user override from the template picker)—not the dashboard section-editor preview cards. The web app SHALL NOT render CAPD or MIT layout markup in React; it SHALL only display HTML returned by the API.

#### Scenario: User opens preview from editor

- **WHEN** a signed-in user navigates to `/dashboard/cv/[id]/preview`
- **THEN** the client SHALL fetch export HTML for that CV id using the CV's stored template id
- **AND** SHALL render the document content without section-editor controls

#### Scenario: User changes template on preview page

- **WHEN** the user selects a different template from the picker
- **THEN** the client SHALL refetch export HTML with the new `template` query parameter (and persist selection via `PATCH /cv/:id` per product default)
- **AND** the visible layout SHALL update without client-side template rendering

#### Scenario: Preview fetch failure

- **WHEN** export HTML returns 404 or 401
- **THEN** the UI SHALL show a clear error and a link back to the CV editor

### Requirement: The preview page SHALL support browser print and PDF download

The preview page SHALL provide:

- **Print** — invokes `window.print()` on the preview content so the user can save as PDF via the browser; print styles from the export HTML SHALL apply
- **Download PDF** — downloads bytes from `GET /cv/:id/export/pdf` with the **currently selected template id** and a sensible filename

Both actions SHALL use the same server-generated HTML/PDF pipeline (not client-side re-layout).

#### Scenario: User prints from preview

- **WHEN** the user activates Print on the preview page
- **THEN** the browser print dialog SHALL target the resume content with print-specific CSS from the export template

#### Scenario: User downloads PDF

- **WHEN** the user activates Download PDF on the preview page with template `capd-masters-icons` selected
- **THEN** the client SHALL request the PDF export endpoint with `template=capd-masters-icons` and save the response as a file download

#### Scenario: PDF download unavailable

- **WHEN** the PDF endpoint returns 503
- **THEN** the UI SHALL show that PDF export is unavailable and SHALL still allow Print from HTML

### Requirement: The API client SHALL expose export helpers

`apps/web/src/lib/api.ts` SHALL provide typed helpers for:

- `listCvTemplates()` — `GET /cv/export/templates`
- `getCvExportHtml(cvId, templateId?)` — optional template query
- `downloadCvPdf(cvId, templateId?)` — optional template query
- `updateCvTemplate(cvId, templateId)` — `PATCH /cv/:id`

Helpers SHALL use the authenticated `apiFetch` pattern.

#### Scenario: Helper uses bearer token

- **WHEN** `getCvExportHtml(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token

#### Scenario: Template query on export helper

- **WHEN** `getCvExportHtml(cvId, 'capd-alum')` is called
- **THEN** the request URL SHALL include `template=capd-alum`
