## REMOVED Requirements

### Requirement: Updates SHALL detect concurrent edits using resume meta version metadata

**Reason**: Normalized per-section storage makes document-level optimistic locking unnecessary.

**Migration**: Stop sending `version` on mutations; API no longer returns 409 for version mismatch.

## MODIFIED Requirements

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a `cv` row with empty basics columns and empty normalized section rows, disassemble the request `data` object into the `cv` row and child tables via the shared assembler/disassembler, validate the assembled document, then persist in a transaction. The service SHALL ignore `data.meta` on input and SHALL NOT persist `meta_version`, `meta_canonical`, or `meta_last_modified`. The response SHALL include a computed `title` derived from `deriveCvTitleFromBasics` applied to the validated basics (ignoring any client-supplied `title`). The response `data` field SHALL contain basics only and SHALL NOT include a `meta` property.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics` (and optionally `meta` in the body)
- **THEN** normalized rows for supplied sections SHALL be persisted
- **AND** the response SHALL include the new CV id, computed `title`, timestamps, and slim `data` with `basics` only
- **AND** the response `data` SHALL NOT include `meta`

#### Scenario: Invalid DTO

- **WHEN** the body violates DTO constraints (e.g. missing `data` on create)
- **THEN** the framework SHALL return 400 without persisting

### Requirement: The API SHALL expose item-scoped authenticated routes for CV resume content

Under `/cv/:cvId`, authenticated handlers SHALL provide create, update, and delete operations for each resume collection defined in `cv-item-crud`, plus `PATCH /cv/:cvId/basics` for the singleton basics object. Array-item update and delete routes SHALL use `:itemId` (row UUID) in the path instead of a numeric index. Handlers MUST read and write normalized section tables and basics columns on `cv` (not `cv.data`), validate entity DTOs, and assemble for schema validation when required. Handlers SHALL NOT read, write, or bump `cv.meta_*` columns.

Nested string routes under work, volunteer, education, and projects SHALL use `:parentId` (parent row UUID) instead of `:parentIndex` for the parent segment; child highlight/course position MAY remain a numeric `:childIndex` within the parent jsonb array.

#### Scenario: Create work entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/work` with a valid work payload
- **THEN** the service SHALL insert a row into `cv_work`, validate, persist, and return the created entry including its row `id`

#### Scenario: Update work entry by id

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a valid work row uuid
- **THEN** the service SHALL update that row by primary key lookup and return the updated entry with the same `id`

#### Scenario: Delete education course (legacy nested route)

- **WHEN** an authenticated client calls `DELETE /cv/:cvId/education/:parentId/courses/:courseIndex` (legacy nested route, if retained)
- **THEN** the service SHALL resolve the education row by `parentId`, remove that course string from `cv_education.courses` jsonb, validate, persist, and return the updated education entry

#### Scenario: Update basics

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the service SHALL merge into the `cv` basics columns (including `location` jsonb) and persist without requiring `meta` or `version` in the request

#### Scenario: Create reference entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/references` with a valid reference payload
- **THEN** the service SHALL insert into `cv_reference` with auto-assigned `sort`, validate, persist, and return the created entry including its row `id`

#### Scenario: Unauthorized item mutation

- **WHEN** a client calls an item route without a valid bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: Item mutation responses SHALL include enough data for the client to refresh UI state

Successful item create and update responses SHALL include the affected entity (with stable row `id` for array items). Delete responses SHALL confirm removal. Reorder responses SHALL return the reordered section array. Responses SHALL NOT include `version` or `meta`. Clients SHALL match rows by `id`.

#### Scenario: Work item update response

- **WHEN** a client successfully patches a work entry by item id
- **THEN** the response SHALL include the updated work object with `id`

#### Scenario: Work highlight update response (legacy nested route)

- **WHEN** a client successfully patches a work highlight via nested route
- **THEN** the response SHALL include the highlight value, parent work `id`, and highlight index

### Requirement: Full CV reads SHALL assemble JSON Resume from normalized storage

`GET /cv` and `GET /cv/:id` SHALL build the response `data` field from the `cv` header row only: optional `basics` (name, label, image, email, phone, url, summary, location). The service SHALL NOT include `data.meta`. The service SHALL NOT call `fetchSections` or `assembleResume` for these routes unless a future export endpoint is defined separately.

#### Scenario: List returns slim data per CV

- **WHEN** an authenticated client calls `GET /cv` and multiple CVs exist
- **THEN** each item SHALL include id, user_id, computed `title`, timestamps, and slim `data` with basics only
- **AND** each item's `data` SHALL NOT include `meta`

#### Scenario: Detail response excludes meta and section arrays

- **WHEN** a client calls `GET /cv/:id`
- **THEN** the response `data` SHALL contain basics only
- **AND** SHALL NOT contain `meta`, `work`, `skills`, or other section arrays

### Requirement: The API SHALL expose reorder endpoints for sort-backed sections

Authenticated handlers under `/cv/:cvId` SHALL provide `PUT /cv/:cvId/profiles/reorder`, `PUT /cv/:cvId/skills/reorder`, `PUT /cv/:cvId/languages/reorder`, `PUT /cv/:cvId/interests/reorder`, and `PUT /cv/:cvId/references/reorder`. Each SHALL accept a body with `order` (array of row uuid strings). The service SHALL assign `sort = index` for each id and return the reordered section items. The body SHALL NOT require `version`.

#### Scenario: Reorder skills

- **WHEN** an authenticated client calls `PUT /cv/:cvId/skills/reorder` with a valid permutation of all skill row ids
- **THEN** each `cv_skill.sort` SHALL match the index in the request order
- **AND** the response SHALL include the skills array in the new order

#### Scenario: Invalid reorder permutation rejected

- **WHEN** the reorder request omits a row id or includes an id from another CV
- **THEN** the API SHALL respond with 400 and SHALL NOT modify any `sort` values

## ADDED Requirements

### Requirement: JSON Resume export SHALL own meta generation (future)

When a dedicated export or download endpoint is implemented, it MAY populate JSON Resume `meta` (`canonical`, `lastModified`, `version`) at export time. Management routes (`GET /cv`, `GET /cv/:id`, item CRUD, `POST /cv`) SHALL NOT populate or return `meta` until that endpoint exists.

#### Scenario: Management GET does not precompute export meta

- **WHEN** a client calls `GET /cv/:id` for dashboard or editor bootstrap
- **THEN** the response SHALL not include `data.meta`
- **AND** the client SHALL NOT require `meta` for editing or listing
