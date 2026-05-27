## MODIFIED Requirements

### Requirement: The API SHALL expose item-scoped authenticated routes for CV resume content

Under `/cv/:cvId`, authenticated handlers SHALL provide create, update, and delete operations for each resume collection defined in `cv-item-crud`, plus `PATCH /cv/:cvId/basics` for the singleton basics object. Array-item update and delete routes SHALL use `:itemId` (row UUID) in the path instead of a numeric index. Handlers MUST read and write normalized section tables and basics columns on `cv` (not `cv.data`), validate entity DTOs, assemble for schema validation when required, and apply optimistic concurrency via `cv.meta_version`.

Parent create and update payloads for work, volunteer, education, and projects SHALL accept full `highlights` and `courses` string arrays as jsonb fields on the parent row. The API SHALL NOT expose separate nested routes for individual highlight or course strings.

#### Scenario: Create work entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/work` with a valid work payload and current version
- **THEN** the service SHALL insert a row into `cv_work`, validate, persist, and return the created entry including its row `id` and updated version metadata

#### Scenario: Update work entry by id

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a valid work row uuid
- **THEN** the service SHALL update that row by primary key lookup and return the updated entry with the same `id`

#### Scenario: Update work entry with highlights array

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a payload containing a full `highlights` string array
- **THEN** the service SHALL replace `cv_work.highlights` jsonb with that array atomically
- **AND** SHALL NOT require nested highlight sub-routes

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

## REMOVED Requirements

### Requirement: Nested string route path convention

**Reason**: Highlights and courses persist atomically on parent create/update; per-string nested routes duplicated parent jsonb writes and were unused by the editor.

**Migration**: Send full `highlights` or `courses` arrays on `POST|PATCH /cv/:cvId/work|volunteer|education|projects` instead of `POST|PATCH|DELETE .../highlights/:index` or `.../courses/:index`.
