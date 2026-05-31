## ADDED Requirements

### Requirement: Cross-section Work ↔ Volunteer move SHALL persist via create-then-delete with safe failure

When the editor moves an entry between Work and Volunteer, the client SHALL map fields to the target section schema, SHALL create the entry via the target section `POST /cv/:cvId/{work|volunteer}` route with a sanitized payload, and SHALL delete the source entry via `DELETE /cv/:cvId/{work|volunteer}/:itemId` only after create succeeds. If create fails, the source entry SHALL remain unchanged. The server SHALL NOT require a new move-specific route for this behavior.

#### Scenario: Successful work to volunteer move

- **WHEN** a user confirms moving a work item with id `w1`
- **THEN** the client SHALL POST a volunteer payload mapped from the work item
- **AND THEN** upon successful create SHALL DELETE `w1` via the work delete route
- **AND** the volunteer list SHALL include the new item with a new server id

#### Scenario: Create failure leaves source intact

- **WHEN** the volunteer create API returns an error during a work-to-volunteer move
- **THEN** the client SHALL NOT call the work delete API
- **AND** work item `w1` SHALL still exist unchanged

#### Scenario: Mapped payload uses target entity key

- **WHEN** the client POSTs a volunteer item created from work data
- **THEN** the request body SHALL use the volunteer item DTO shape (`volunteer` property with `organization`, not `name`)
- **AND** omitted work-only fields SHALL NOT be sent as empty strings

#### Scenario: Highlights travel with parent on move

- **WHEN** a work entry includes a `highlights` string array and is moved to volunteer
- **THEN** the volunteer create payload SHALL include the same highlights array
- **AND** highlights SHALL be stored on the new `cv_volunteer` row in one create call
