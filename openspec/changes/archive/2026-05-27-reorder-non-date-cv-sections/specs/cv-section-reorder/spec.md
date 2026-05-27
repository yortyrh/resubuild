## ADDED Requirements

### Requirement: Users SHALL reorder non-date CV section entries via the editor UI

The web editor MUST provide drag-and-drop and keyboard move-up / move-down controls for reordering entries in these sections only:

- Social profiles (`basics.profiles` / `cv_profile`)
- Skills (`skills` / `cv_skill`)
- Languages (`languages` / `cv_language`)
- Interests (`interests` / `cv_interest`)
- References (`references` / `cv_reference`)

Reorder controls SHALL NOT be shown for Work, Volunteer, Education, Projects, Awards, Certificates, or Publications.

#### Scenario: User reorders skills via drag-and-drop

- **WHEN** a user drags a skill row to a new position and releases
- **THEN** the client SHALL call the reorder API with the new id order
- **AND** the section list SHALL reflect the new order without full-page reload

#### Scenario: Date-primary sections excluded

- **WHEN** a user views the Work section
- **THEN** drag reorder controls SHALL NOT be shown for work entries

### Requirement: Reorder UI SHALL call the existing reorder API

On reorder (drop or keyboard move), the client SHALL send `PUT /cv/:cvId/{section}/reorder` with the current version and an ordered array of row uuids. On success, the client SHALL replace local section state with the response items and updated version.

#### Scenario: Successful reorder refreshes local state

- **WHEN** the reorder API returns success
- **THEN** the editor SHALL display items in the order returned by the server

#### Scenario: Stale version on reorder

- **WHEN** the reorder API returns 409
- **THEN** the client SHALL reload the section data before retrying

### Requirement: Reorder controls SHALL be disabled during edit/create

While a row is in edit or create mode, drag handles and move buttons SHALL be hidden or disabled to avoid conflicting interactions.

#### Scenario: No drag during edit

- **WHEN** a user is editing a skill row
- **THEN** drag reorder controls SHALL NOT be active for that section

### Requirement: Reorder UI SHALL provide keyboard-accessible alternatives

Each reorderable row SHALL expose move-up and move-down controls with accessible labels as an alternative to drag-and-drop.

#### Scenario: Keyboard move-up

- **WHEN** a user activates move-up on the second skill row
- **THEN** the client SHALL call the reorder API with that row moved to index 0
