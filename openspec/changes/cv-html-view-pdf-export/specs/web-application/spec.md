## ADDED Requirements

### Requirement: The web app SHALL provide a print-faithful CV preview route

The App Router SHALL expose `/dashboard/cv/[id]/preview` for signed-in users. The page SHALL load export HTML from `GET /cv/:id/export/html` via the shared API client with Bearer authentication and display it in a layout optimized for reading and printing (minimal dashboard chrome, resume-centered content). The rendered document SHALL use the MIT-format export template (experience before education, MIT section headings and entry typography)—not the dashboard section-editor preview cards.

#### Scenario: User opens preview from editor

- **WHEN** a signed-in user navigates to `/dashboard/cv/[id]/preview`
- **THEN** the client SHALL fetch export HTML for that CV id
- **AND** SHALL render the document content without section-editor controls

#### Scenario: Preview fetch failure

- **WHEN** export HTML returns 404 or 401
- **THEN** the UI SHALL show a clear error and a link back to the CV editor

### Requirement: The preview page SHALL support browser print and PDF download

The preview page SHALL provide:

- **Print** — invokes `window.print()` on the preview content so the user can save as PDF via the browser; print styles from the export HTML SHALL apply
- **Download PDF** — downloads bytes from `GET /cv/:id/export/pdf` with a sensible filename

Both actions SHALL use the same server-generated HTML/PDF pipeline (not client-side re-layout).

#### Scenario: User prints from preview

- **WHEN** the user activates Print on the preview page
- **THEN** the browser print dialog SHALL target the resume content with print-specific CSS from the export template

#### Scenario: User downloads PDF

- **WHEN** the user activates Download PDF on the preview page
- **THEN** the client SHALL request the PDF export endpoint and save the response as a file download

#### Scenario: PDF download unavailable

- **WHEN** the PDF endpoint returns 503
- **THEN** the UI SHALL show that PDF export is unavailable and SHALL still allow Print from HTML

### Requirement: The API client SHALL expose export helpers

`apps/web/src/lib/api.ts` SHALL provide typed helpers for fetching export HTML and downloading export PDF (blob or array buffer) using the authenticated `apiFetch` pattern.

#### Scenario: Helper uses bearer token

- **WHEN** `getCvExportHtml(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token
