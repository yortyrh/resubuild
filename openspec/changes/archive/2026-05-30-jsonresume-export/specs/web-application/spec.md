## MODIFIED Requirements

### Requirement: The preview page SHALL support browser print and PDF download

The preview page SHALL provide:

- **Print** — invokes `window.print()` on the preview content so the user can save as PDF via the browser; print styles from the export HTML SHALL apply
- **Download PDF** — downloads bytes from `GET /cv/:id/export/pdf` with a sensible filename
- **Download JSON** — downloads a JSON Resume file from `GET /cv/:id/export/json` with a sensible filename

Print and PDF actions SHALL use the same server-generated HTML/PDF pipeline (not client-side re-layout). Download JSON SHALL use the server JSON export endpoint (not client-side section fetches).

#### Scenario: User prints from preview

- **WHEN** the user activates Print on the preview page
- **THEN** the browser print dialog SHALL target the resume content with print-specific CSS from the export template

#### Scenario: User downloads PDF

- **WHEN** the user activates Download PDF on the preview page
- **THEN** the client SHALL request the PDF export endpoint and save the response as a file download

#### Scenario: User downloads JSON

- **WHEN** the user activates Download JSON on the preview page
- **THEN** the client SHALL request `GET /cv/:id/export/json` and save the response as a `.json` file download

#### Scenario: PDF download unavailable

- **WHEN** the PDF endpoint returns 503
- **THEN** the UI SHALL show that PDF export is unavailable and SHALL still allow Print from HTML and Download JSON

### Requirement: The API client SHALL expose export helpers

`apps/web/src/lib/api.ts` SHALL provide typed helpers for fetching export HTML, downloading export PDF (blob or array buffer), and downloading export JSON (blob or parsed object + filename) using the authenticated `apiFetch` pattern.

#### Scenario: Helper uses bearer token

- **WHEN** `getCvExportHtml(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token

#### Scenario: JSON download helper uses bearer token

- **WHEN** `downloadCvJson(cvId)` is called with a valid session
- **THEN** the request SHALL include `Authorization: Bearer` with the access token
- **AND** SHALL target `GET /cv/:id/export/json`
