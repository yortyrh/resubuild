## MODIFIED Requirements

### Requirement: Array item identity in URLs SHALL map to section list order

Array item update and delete routes SHALL identify rows by their normalized table primary key (UUID). Path segments previously named `:index` SHALL be `:itemId` and MUST be a valid UUID belonging to the target CV and section. The service SHALL resolve the row with a direct lookup by `(cv_id, id)` and SHALL NOT require fetching the full ordered section list to perform update or delete.

Create routes (`POST /cv/:cvId/{section}`) SHALL remain collection-scoped without an item id in the path. List ordering rules (`sort ASC, id ASC` for sort-backed sections; date DESC for date-primary sections per `cv-normalized-schema`) SHALL continue to govern section GET and full CV assembly only.

#### Scenario: Update work entry by id

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a valid work row uuid and payload
- **THEN** the service SHALL update that `cv_work` row without listing all work entries to resolve an index
- **AND** the response SHALL include the updated work object with the same `id`

#### Scenario: Delete skill entry by id

- **WHEN** an authenticated client calls `DELETE /cv/:cvId/skills/:itemId` with a valid skill row uuid
- **THEN** the service SHALL delete that `cv_skill` row by primary key
- **AND** unrelated skill rows SHALL retain their ids and sort values

#### Scenario: Invalid item id rejected

- **WHEN** a client calls `PATCH /cv/:cvId/awards/not-a-uuid` or a uuid that does not exist on that CV
- **THEN** the API SHALL respond with 400 (malformed id) or 404 (unknown row) and SHALL NOT mutate data

#### Scenario: Work position unchanged when unrelated entry is created

- **WHEN** a work entry with id `w1` is displayed first by date order and a new entry with an earlier date is created via `POST`
- **THEN** subsequent `PATCH /cv/:cvId/work/w1` SHALL still target the same row regardless of its new list position
