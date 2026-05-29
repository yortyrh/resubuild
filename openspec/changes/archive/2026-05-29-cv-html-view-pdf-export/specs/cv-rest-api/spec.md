## ADDED Requirements

### Requirement: The API SHALL expose authenticated resume export endpoints

Under `/cv/:id/export`, authenticated handlers SHALL provide:

- `GET /cv/:id/export/html` — returns a full HTML document for the CV (`Content-Type: text/html; charset=utf-8`)
- `GET /cv/:id/export/pdf` — returns PDF bytes (`Content-Type: application/pdf`) generated from the same HTML as the html endpoint

Handlers MUST use the caller's Supabase user client so RLS applies. Missing or non-owned CV ids SHALL yield 404 consistent with other `/cv/:id` routes.

#### Scenario: HTML export without token

- **WHEN** a client calls `GET /cv/:id/export/html` without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

#### Scenario: HTML export for owned CV

- **WHEN** an authenticated user requests `GET /cv/:id/export/html` for a CV they own
- **THEN** the response status SHALL be 200
- **AND** the body SHALL be a complete HTML document including basics name

#### Scenario: PDF export for owned CV

- **WHEN** an authenticated user requests `GET /cv/:id/export/pdf` for a CV they own
- **THEN** the response status SHALL be 200
- **AND** the `Content-Type` SHALL be `application/pdf`
- **AND** the response SHALL include a `Content-Disposition` attachment filename derived from the CV title or basics name

#### Scenario: Export for non-owned CV

- **WHEN** an authenticated user requests export for a CV id that RLS excludes
- **THEN** the API SHALL respond with 404
