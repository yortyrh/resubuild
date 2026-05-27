# CV REST API

## Purpose

Specify the NestJS HTTP surface for listing, reading, creating, updating, and deleting CVs, including request validation, optimistic concurrency hints, and integration with Supabase for persistence.

## Requirements

### Requirement: All `/cv` routes MUST require authentication

The `CvController` SHALL apply the Supabase auth guard to every handler so unauthenticated requests never reach service logic.

#### Scenario: No bearer token

- **WHEN** a client calls any `/cv` route without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: The API SHALL expose CRUD endpoints for CVs scoped to the authenticated user

Handlers MUST implement `GET /cv`, `GET /cv/:id`, `POST /cv`, `PATCH /cv/:id`, and `DELETE /cv/:id`, using a per-user Supabase client created with the caller's access token so RLS applies.

#### Scenario: List CVs

- **WHEN** an authenticated client calls `GET /cv`
- **THEN** the service SHALL return CV rows for that user ordered by `updated_at` descending

#### Scenario: Missing CV

- **WHEN** `GET /cv/:id` or a mutating operation targets an id that does not exist or is not owned (RLS empty result)
- **THEN** the API SHALL respond with 404 and a CV not found message where implemented

### Requirement: Create and update payloads MUST be validated with class-validator DTOs

`POST` bodies SHALL use `CreateCvDto` (optional `title`, required `data` object). `PATCH` bodies SHALL use `UpdateCvDto` (optional `title`, optional `data`). The global validation pipe SHALL strip unknown properties and reject invalid shapes. When `data.basics` is supplied on create or when basics are patched via item routes, the service SHALL overwrite any client-provided `title` with the value derived from basics.

#### Scenario: Invalid DTO

- **WHEN** the body violates DTO constraints (e.g. missing `data` on create)
- **THEN** the framework SHALL return 400 without persisting

### Requirement: Updates SHALL detect concurrent edits using resume meta version metadata

When any item-scoped route mutates resume content, the service SHALL compare the client-supplied version (header or body) with `cv.meta_version`; mismatch MUST yield 409 with a message instructing the client to reload before retrying. Document-level `PATCH /cv/:id` with assembled `data` (if supported) SHALL retain the same behavior. Successful mutations SHALL bump `cv.meta_version` and `cv.updated_at`.

#### Scenario: Conflicting version on item update

- **WHEN** the client sends a stale meta version while patching a volunteer entry
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the mutation

#### Scenario: Conflicting version on document PATCH

- **WHEN** the client sends an outdated meta version while PATCHing full assembled `data`
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the stale overwrite

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a `cv` row with empty basics columns and empty normalized section rows, disassemble the request `data` object into the `cv` row and child tables via the shared assembler/disassembler, validate the assembled document, then persist in a transaction. The final write SHALL set `meta_version` / meta columns on the `cv` row. The response SHALL include a computed `title` derived from `deriveCvTitleFromBasics` applied to the validated basics (ignoring any client-supplied `title`).

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics`
- **THEN** the response SHALL include the new CV with normalized rows persisted and an assembled `data` object in the response body including applied meta and schema-valid content
- **AND** `title` in the response SHALL reflect the derived value from basics

### Requirement: Media routes MUST inherit CV-grade authentication on upload and public read on stream

Nest SHALL classify **`POST /media/upload`** under `MediaController` guarded by the identical Supabase-derived authentication strategy used for `/cv`. **`GET /media/:id`** SHALL be public (no Bearer) and stream stored objects by registry id. Upload handlers MUST remain tenant-isolated via authenticated user id embedded in Storage paths and registry rows.

#### Scenario: Auth parity with CV fetch on upload

- **WHEN** a valid bearer used for `GET /cv/:id` is replayed onto `POST /media/upload`
- **THEN** Nest SHALL authorize identically modulo multipart validation errors

#### Scenario: Public media stream without token

- **WHEN** any client requests `GET /media/{valid_uuid}` without Authorization
- **THEN** Nest SHALL return the image stream when the registry row exists

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

### Requirement: CV title SHALL be computed from basics on read and after basics mutations

The API service SHALL compute `title` from `cv.name` and `cv.label` using the shared `deriveCvTitleFromBasics` function when assembling CV responses (`GET /cv`, `GET /cv/:id`, and mutation responses that return the CV header). The derived title SHALL NOT be persisted in the database. When `PATCH /cv/:cvId/basics` succeeds, the response SHALL include the newly derived `title` computed from the updated basics columns.

#### Scenario: Create response derives title from basics

- **WHEN** `POST /cv` includes basics with name `Alex` and label `Designer`
- **THEN** the response SHALL include `title` equal to `Alex — Designer`
- **AND** the `cv` row SHALL NOT contain a `title` column value

#### Scenario: Basics patch response includes derived title

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` changing `name` or `label`
- **THEN** the service SHALL merge basics into the `cv` row, validate, persist, and return the newly derived `title` in the response

#### Scenario: Empty basics yields default title

- **WHEN** a create or basics patch results in empty name and label after trim
- **THEN** the computed `title` in the response SHALL be `Untitled CV`

#### Scenario: Name-only basics

- **WHEN** basics contain name `Alex` and no label
- **THEN** the computed `title` SHALL be `Alex`

### Requirement: The API SHALL expose section-scoped GET routes for editor views

For each multi-valued resume section, the API SHALL provide `GET /cv/:cvId/{section}` (e.g. `work`, `skills`, `education`) returning an ordered JSON array of that section only, assembled from normalized tables. `GET /cv/:id` SHALL continue to return the full assembled JSON Resume document for export and preview use cases.

#### Scenario: Fetch work section only

- **WHEN** an authenticated client calls `GET /cv/:cvId/work`
- **THEN** the response SHALL contain only the `work` array ordered by `start_date` descending without loading other sections from the client perspective

#### Scenario: Full CV assembly on detail GET

- **WHEN** an authenticated client calls `GET /cv/:id`
- **THEN** the service SHALL assemble all normalized sections into a single JSON Resume `data` object including meta

### Requirement: Full CV reads SHALL assemble JSON Resume from normalized storage

`GET /cv` and `GET /cv/:id` SHALL build the response `data` field by assembling normalized rows. List endpoints MAY omit full `data` in a future optimization; until then they SHALL assemble or return a documented slim shape including computed `title`.

#### Scenario: Detail response matches JSON Resume shape

- **WHEN** a CV with work and skills exists in normalized tables
- **THEN** `GET /cv/:id` SHALL return `data.work` ordered by date and `data.skills` ordered by `sort`, matching JSON Resume field names and camelCase keys

### Requirement: The API SHALL expose reorder endpoints for sort-backed sections

Authenticated handlers under `/cv/:cvId` SHALL provide `PUT /cv/:cvId/profiles/reorder`, `PUT /cv/:cvId/skills/reorder`, `PUT /cv/:cvId/languages/reorder`, `PUT /cv/:cvId/interests/reorder`, and `PUT /cv/:cvId/references/reorder`. Each SHALL accept a body with `version` (optional but recommended) and `order` (array of row uuid strings representing the full desired order). The service SHALL assign `sort = index` for each id, bump `cv.meta_version`, and return the reordered section items with updated version.

#### Scenario: Reorder skills

- **WHEN** an authenticated client calls `PUT /cv/:cvId/skills/reorder` with a valid permutation of all skill row ids and current version
- **THEN** each `cv_skill.sort` SHALL match the index in the request order
- **AND** the response SHALL include the skills array in the new order and an updated version

#### Scenario: Invalid reorder permutation rejected

- **WHEN** the reorder request omits a row id or includes an id from another CV
- **THEN** the API SHALL respond with 400 and SHALL NOT modify any `sort` values
