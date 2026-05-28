## ADDED Requirements

### Requirement: The API SHALL expose resume template catalog and template-aware export

Authenticated handlers SHALL extend the export routes introduced by **`cv-html-view-pdf-export`** with:

- `GET /cv/export/templates` — list registered template metadata for the template picker
- `GET /cv/:id/export/html?template=<id>` — optional template query (see `cv-resume-templates`)
- `GET /cv/:id/export/pdf?template=<id>` — optional template query with same resolution

Export handlers SHALL validate `template` against the registry. `PATCH /cv/:id` SHALL accept optional `templateId` validated the same way.

#### Scenario: Templates catalog requires auth

- **WHEN** `GET /cv/export/templates` is called without bearer token
- **THEN** the response SHALL be 401

#### Scenario: Export with valid template

- **WHEN** `GET /cv/:id/export/html?template=capd-design` is called for an owned CV
- **THEN** the response SHALL be 200 with `Content-Type: text/html; charset=utf-8`

#### Scenario: Export with invalid template

- **WHEN** export is called with unknown `template` query value
- **THEN** the response SHALL be 400 with a message listing valid template ids

#### Scenario: Patch CV template

- **WHEN** `PATCH /cv/:id` includes valid `templateId`
- **THEN** the CV row SHALL persist the new template id
- **AND** the response SHALL reflect the updated field
