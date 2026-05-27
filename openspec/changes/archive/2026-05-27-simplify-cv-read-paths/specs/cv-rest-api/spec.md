## MODIFIED Requirements

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a `cv` row with empty basics columns and empty normalized section rows, disassemble the request `data` object into the `cv` row and child tables via the shared assembler/disassembler, validate the assembled document, then persist in a transaction. The final write SHALL set `meta_version` / meta columns on the `cv` row. The response SHALL include a computed `title` derived from `deriveCvTitleFromBasics` applied to the validated basics (ignoring any client-supplied `title`). The response `data` field SHALL be a slim envelope (meta + basics from the `cv` header row only), not a fully assembled JSON Resume document with all sections.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics` and section arrays
- **THEN** normalized rows for all supplied sections SHALL be persisted
- **AND** the response SHALL include the new CV id, computed `title`, timestamps, and slim `data` with meta and basics from the header row
- **AND** the response `data` SHALL NOT include section arrays such as `work` or `skills`

#### Scenario: Invalid DTO

- **WHEN** the body violates DTO constraints (e.g. missing `data` on create)
- **THEN** the framework SHALL return 400 without persisting

### Requirement: The API SHALL expose section-scoped GET routes for editor views

For each multi-valued resume section, the API SHALL provide `GET /cv/:cvId/{section}` (e.g. `work`, `skills`, `education`, `profiles`) returning an ordered JSON array of that section only, assembled from the corresponding normalized table. `GET /cv/:id` SHALL NOT load or return those section arrays; clients SHALL use section routes or a future export endpoint for full JSON Resume documents.

#### Scenario: Fetch work section only

- **WHEN** an authenticated client calls `GET /cv/:cvId/work`
- **THEN** the response SHALL contain only the `work` array ordered by `start_date` descending without loading other sections from the client perspective

#### Scenario: Detail GET returns slim envelope

- **WHEN** an authenticated client calls `GET /cv/:id`
- **THEN** the service SHALL return CV metadata and slim `data` containing meta (from `cv` meta columns) and basics (from `cv` basics columns) only
- **AND** SHALL NOT query child section tables for that request

### Requirement: Full CV reads SHALL assemble JSON Resume from normalized storage

`GET /cv` and `GET /cv/:id` SHALL build the response `data` field from the `cv` header row only: optional `meta` (via `metaFromCvHeader`) and optional `basics` (name, label, image, email, phone, url, summary, location). The service SHALL NOT call `fetchSections` or `assembleResume` for these routes. Full JSON Resume assembly SHALL be reserved for a future dedicated export/download endpoint and for internal validation on write paths.

#### Scenario: List returns slim data per CV

- **WHEN** an authenticated client calls `GET /cv` and multiple CVs exist
- **THEN** each item in the response SHALL include id, user_id, computed `title`, timestamps, and slim `data` (meta + basics only)
- **AND** the service SHALL NOT perform per-CV section table queries

#### Scenario: Detail response excludes section arrays

- **WHEN** a CV has work and skills rows in normalized tables
- **THEN** `GET /cv/:id` SHALL NOT include `data.work` or `data.skills`
- **AND** `GET /cv/:cvId/work` SHALL return the work array when the client needs it

## ADDED Requirements

### Requirement: Future JSON Resume export SHALL use full assembly

When an export or download feature is implemented, it SHALL assemble a complete JSON Resume document via `assembleResume(header, sections)` (or equivalent) in a dedicated route, not by expanding `GET /cv/:id`.

#### Scenario: Export not implied by detail GET

- **WHEN** a client calls `GET /cv/:id` for dashboard or editor bootstrap
- **THEN** the response SHALL remain the slim envelope
- **AND** the client SHALL NOT assume `data` is schema-complete for offline export
