## MODIFIED Requirements

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a `cv` header row with empty normalized section rows (including empty `cv_basics`), disassemble the request `data` object into normalized tables via the shared assembler/disassembler, validate the assembled document, then persist section rows in a transaction. The final write SHALL set `title` from `deriveCvTitleFromBasics` applied to the validated basics (ignoring client-supplied `title` when basics are present) and SHALL set `meta_version` / meta columns on the `cv` row.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics`
- **THEN** the response SHALL include the new CV with normalized rows persisted and an assembled `data` object in the response body including applied meta and schema-valid content
- **AND** `title` SHALL reflect the derived value from basics

### Requirement: Updates SHALL detect concurrent edits using resume meta version metadata

When any item-scoped route mutates resume content, the service SHALL compare the client-supplied version (header or body) with `cv.meta_version`; mismatch MUST yield 409 with a message instructing the client to reload before retrying. Document-level `PATCH /cv/:id` with assembled `data` (if supported) SHALL retain the same behavior. Successful mutations SHALL bump `cv.meta_version` and `cv.updated_at`.

#### Scenario: Conflicting version on item update

- **WHEN** the client sends a stale meta version while patching a volunteer entry
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the mutation

#### Scenario: Conflicting version on document PATCH

- **WHEN** the client sends an outdated meta version while PATCHing full assembled `data`
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the stale overwrite

### Requirement: The API SHALL expose item-scoped authenticated routes for CV resume content

Under `/cv/:cvId`, authenticated handlers SHALL provide create, update, and delete operations for each resume collection defined in `cv-item-crud`, plus `PATCH /cv/:cvId/basics` for the singleton basics object. Handlers MUST read and write normalized section tables (not `cv.data`), validate entity DTOs, assemble for schema validation when required, and apply optimistic concurrency via `cv.meta_version`.

#### Scenario: Create work entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/work` with a valid work payload and current version
- **THEN** the service SHALL insert a row into `cv_work` with the next `sort` value, validate, persist, and return the created entry with its array index (position by sort) and updated version metadata

#### Scenario: Delete education course

- **WHEN** an authenticated client calls `DELETE /cv/:cvId/education/:educationIndex/courses/:courseIndex` (legacy nested route, if retained)
- **THEN** the service SHALL remove that course string from the `cv_education.courses` jsonb array, validate, persist, and return the updated education entry or courses list

#### Scenario: Update basics

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the service SHALL merge into `cv_basics` / `cv_basics_location` / related rows, validate, and persist without requiring a full resume body in the request

#### Scenario: Create reference entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/references` with a valid reference payload and current version
- **THEN** the service SHALL insert into `cv_reference` with the next `sort`, validate, persist, and return the created entry with its array index and updated version metadata

#### Scenario: Unauthorized item mutation

- **WHEN** a client calls an item route without a valid bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: CV title SHALL derive from basics on create and basics patch

The API service SHALL compute `cv.title` from basics name and label using the shared derivation function whenever a CV is created with basics data or when `PATCH /cv/:cvId/basics` succeeds. The derived title SHALL be persisted in the `title` column in the same write as the updated basics rows.

#### Scenario: Create derives title from basics

- **WHEN** `POST /cv` includes basics with name `Alex` and label `Designer`
- **THEN** the created row SHALL have `title` equal to `Alex — Designer`
- **AND** the response SHALL include the derived title

#### Scenario: Basics patch updates title

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` changing `name` or `label`
- **THEN** the service SHALL merge basics, validate, persist normalized basics rows, and update `title` to the newly derived value in one operation

#### Scenario: Empty basics yields default title

- **WHEN** a create or basics patch results in empty name and label after trim
- **THEN** `title` SHALL be `Untitled CV`

#### Scenario: Name-only basics

- **WHEN** basics contain name `Alex` and no label
- **THEN** derived `title` SHALL be `Alex`

## ADDED Requirements

### Requirement: The API SHALL expose section-scoped GET routes for editor views

For each multi-valued resume section, the API SHALL provide `GET /cv/:cvId/{section}` (e.g. `work`, `skills`, `education`) returning an ordered JSON array of that section only, assembled from normalized tables. `GET /cv/:id` SHALL continue to return the full assembled JSON Resume document for export and preview use cases.

#### Scenario: Fetch work section only

- **WHEN** an authenticated client calls `GET /cv/:cvId/work`
- **THEN** the response SHALL contain only the `work` array ordered by `sort` without loading other sections from the client perspective

#### Scenario: Full CV assembly on detail GET

- **WHEN** an authenticated client calls `GET /cv/:id`
- **THEN** the service SHALL assemble all normalized sections into a single JSON Resume `data` object including meta

### Requirement: Full CV reads SHALL assemble JSON Resume from normalized storage

`GET /cv` and `GET /cv/:id` SHALL build the response `data` field by assembling normalized rows. List endpoints MAY omit full `data` in a future optimization; until then they SHALL assemble or return a documented slim shape.

#### Scenario: Detail response matches JSON Resume shape

- **WHEN** a CV with work and skills exists in normalized tables
- **THEN** `GET /cv/:id` SHALL return `data.work` and `data.skills` arrays matching JSON Resume field names and camelCase keys
