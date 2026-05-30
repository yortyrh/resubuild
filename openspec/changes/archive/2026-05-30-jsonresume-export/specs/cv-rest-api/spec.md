## MODIFIED Requirements

### Requirement: JSON Resume export SHALL own meta generation (future)

When the JSON export endpoint is called, the API SHALL populate JSON Resume `meta` (`lastModified`, `version`, and optional `canonical`) at export time via `prepareExportedResume`. Management routes (`GET /cv`, `GET /cv/:id`, item CRUD, `POST /cv`) SHALL NOT populate or return `meta`.

#### Scenario: Management GET does not precompute export meta

- **WHEN** a client calls `GET /cv/:id` for dashboard or editor bootstrap
- **THEN** the response SHALL not include `data.meta`
- **AND** the client SHALL NOT require `meta` for editing or listing

#### Scenario: JSON export includes meta

- **WHEN** an authenticated user requests `GET /cv/:id/export/json` for a CV they own
- **THEN** the response body SHALL include a `meta` object with `lastModified` and `version`

### Requirement: The API SHALL expose authenticated resume export endpoints

Under `/cv/:id/export`, authenticated handlers SHALL provide:

- `GET /cv/:id/export/html` — returns a full HTML document for the CV (`Content-Type: text/html; charset=utf-8`)
- `GET /cv/:id/export/pdf` — returns PDF bytes (`Content-Type: application/pdf`) generated from the same HTML as the html endpoint
- `GET /cv/:id/export/json` — returns a schema-valid JSON Resume document (`Content-Type: application/json; charset=utf-8`) with `Content-Disposition: attachment` and a filename derived from the CV title or basics name

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

#### Scenario: JSON export for owned CV

- **WHEN** an authenticated user requests `GET /cv/:id/export/json` for a CV they own
- **THEN** the response status SHALL be 200
- **AND** the `Content-Type` SHALL be `application/json; charset=utf-8`
- **AND** the response SHALL include a `Content-Disposition` attachment filename ending in `.json`
- **AND** the body SHALL parse as a JSON object with `basics` when the CV has basics data
- **AND** section items SHALL NOT include Resumind-internal row `id` fields

#### Scenario: JSON export without token

- **WHEN** a client calls `GET /cv/:id/export/json` without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

#### Scenario: Export for non-owned CV

- **WHEN** an authenticated user requests export for a CV id that RLS excludes
- **THEN** the API SHALL respond with 404
