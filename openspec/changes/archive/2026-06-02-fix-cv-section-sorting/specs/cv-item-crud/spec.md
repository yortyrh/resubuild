## ADDED Requirements

### Requirement: Date-primary sections SHALL enforce editor required-date rules on user save

When a user saves a Work, Volunteer, Education, or Project entry from the CV editor (create or update), the client SHALL reject the save if `startDate` is missing or whitespace-only after trim. When a user creates an Award, Certificate, or Publication entry, the client SHALL reject the save if `date` or `releaseDate` respectively is missing or whitespace-only. These checks SHALL apply only to interactive editor saves, not to import confirmation or agent pipelines that call the API directly.

#### Scenario: Work update requires start date in editor

- **WHEN** a user clears the start date on an existing work entry and clicks Save in the editor
- **THEN** the client SHALL show a validation error
- **AND** SHALL NOT call `PATCH /cv/:cvId/work/:itemId`

#### Scenario: Certificate create requires date in editor

- **WHEN** a user creates a certificate without a date and clicks Save in the editor
- **THEN** the client SHALL show a validation error
- **AND** SHALL NOT call `POST /cv/:cvId/certificates`

## MODIFIED Requirements

### Requirement: Array item identity in URLs SHALL use stable row UUIDs

Array item update and delete routes SHALL identify rows by their normalized table primary key (UUID). Path segments previously named `:index` SHALL be `:itemId` and MUST be a valid UUID belonging to the target CV and section. The service SHALL resolve the row with a direct lookup by `(cv_id, id)` and SHALL NOT require fetching the full ordered section list to perform update or delete.

Create routes (`POST /cv/:cvId/{section}`) SHALL remain collection-scoped without an item id in the path. List ordering rules (`sort ASC, id ASC` for sort-backed sections; `end_date DESC NULLS FIRST` then `start_date DESC` for date-range sections; single-date DESC for awards, certificates, publications per `cv-normalized-schema`) SHALL continue to govern section GET and full CV assembly only.

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

#### Scenario: Ongoing work stays addressable after newer dated entry is created

- **WHEN** a work entry with id `w1` has no `end_date` and is listed first, and a new entry with a later `end_date` is created via `POST`
- **THEN** subsequent `PATCH /cv/:cvId/work/w1` SHALL still target the same row regardless of its list position

## MODIFIED Requirements

### Requirement: Item list state SHALL support reorder without separate document save

After a successful reorder API call, the client SHALL update the in-memory section array to match the server response order when it differs from the optimistic order. Reorder SHALL NOT require a document-level Save CV action.

For date-primary sections (Work, Volunteer, Education, Projects, Awards, Certificates, Publications), the client SHALL NOT expose manual reorder APIs. Instead, after any successful create, update, or delete on those sections, the client SHALL apply the shared date sort helpers so in-memory order matches the server list order.

#### Scenario: Local skills array updates after reorder

- **WHEN** a reorder API call for skills succeeds with a different order than shown optimistically
- **THEN** the editor's skills array state SHALL match the returned order
- **AND** subsequent edit actions SHALL use indices from the new order

#### Scenario: Work array re-sorted after date update

- **WHEN** a work item update succeeds and the changed dates alter sort rank
- **THEN** the editor's work array state SHALL be re-sorted using the shared work sort helper
- **AND** row identity SHALL remain keyed by `id`
