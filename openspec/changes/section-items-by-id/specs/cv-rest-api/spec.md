## MODIFIED Requirements

### Requirement: The API SHALL expose item-scoped authenticated routes for CV resume content

Under `/cv/:cvId`, authenticated handlers SHALL provide create, update, and delete operations for each resume collection defined in `cv-item-crud`, plus `PATCH /cv/:cvId/basics` for the singleton basics object. Array-item update and delete routes SHALL use `:itemId` (row UUID) in the path instead of a numeric index. Handlers MUST read and write normalized section tables and basics columns on `cv` (not `cv.data`), validate entity DTOs, assemble for schema validation when required, and apply optimistic concurrency via `cv.meta_version`.

Nested string routes under work, volunteer, education, and projects SHALL use `:parentId` (parent row UUID) instead of `:parentIndex` for the parent segment; child highlight/course position MAY remain a numeric `:childIndex` within the parent jsonb array.

#### Scenario: Create work entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/work` with a valid work payload and current version
- **THEN** the service SHALL insert a row into `cv_work`, validate, persist, and return the created entry including its row `id` and updated version metadata

#### Scenario: Update work entry by id

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a valid work row uuid
- **THEN** the service SHALL update that row by primary key lookup and return the updated entry with the same `id`

#### Scenario: Delete education course (legacy nested route)

- **WHEN** an authenticated client calls `DELETE /cv/:cvId/education/:parentId/courses/:courseIndex` (legacy nested route, if retained)
- **THEN** the service SHALL resolve the education row by `parentId`, remove that course string from `cv_education.courses` jsonb, validate, persist, and return the updated education entry

#### Scenario: Update basics

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the service SHALL merge into the `cv` basics columns (including `location` jsonb) and related profile rows, validate, and persist without requiring a full resume body in the request

#### Scenario: Create reference entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/references` with a valid reference payload and current version
- **THEN** the service SHALL insert into `cv_reference` with auto-assigned `sort`, validate, persist, and return the created entry including its row `id` and updated version metadata

#### Scenario: Unauthorized item mutation

- **WHEN** a client calls an item route without a valid bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: Item mutation responses SHALL include enough data for the client to refresh UI state

Successful item create and update responses SHALL include the affected entity (with stable row `id` for array items) and the new `meta.version`. Delete responses SHALL confirm removal and return the new version. Responses SHALL NOT require a numeric array `index` for the client to apply update or delete locally; clients SHALL match rows by `id`.

#### Scenario: Work item update response

- **WHEN** a client successfully patches a work entry by item id
- **THEN** the response SHALL include the updated work object with `id` and updated `meta.version`

#### Scenario: Work highlight update response (legacy nested route)

- **WHEN** a client successfully patches a work highlight via nested route
- **THEN** the response SHALL include the highlight value, parent work `id`, highlight index, and updated `meta.version`
