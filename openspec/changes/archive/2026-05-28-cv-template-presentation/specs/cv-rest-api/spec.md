## ADDED Requirements

### Requirement: The API SHALL expose template presentation endpoints

Authenticated handlers on `/cv/:id/template-presentation` SHALL provide:

- `GET` — return merged or stored presentation config for optional query `template` (resolved like export: query → CV `template_id` → `classic`)
- `PATCH` — upsert presentation config for the resolved template id

Handlers SHALL return 404 when the CV is not found or not owned by the caller.

#### Scenario: Presentation GET requires auth

- **WHEN** `GET /cv/:id/template-presentation` is called without a bearer token
- **THEN** the response SHALL be 401

#### Scenario: Export uses stored presentation

- **WHEN** a CV has stored presentation config for `tabular` and export is requested with `?template=tabular`
- **THEN** `GET /cv/:id/export/html` HTML SHALL reflect that config

## MODIFIED Requirements

### Requirement: Export routes SHALL accept an optional template query parameter

`GET /cv/:id/export/html` and `GET /cv/:id/export/pdf` SHALL accept optional query parameter `template`. Resolution order SHALL be: explicit query param, then CV stored `template_id`, then `classic`. PDF generation SHALL use the same template resolution and presentation config as HTML. The templates catalog SHALL list the four canonical visual template ids (`classic`, `modern`, `tabular`, `left`).

#### Scenario: Export with query override

- **WHEN** a CV has stored template `classic` and the client requests `GET /cv/:id/export/html?template=modern`
- **THEN** the response HTML SHALL be rendered with the modern visual template

#### Scenario: Invalid template id on export

- **WHEN** export is requested with `?template=capd-alum` (legacy id)
- **THEN** the API SHALL respond with 400
