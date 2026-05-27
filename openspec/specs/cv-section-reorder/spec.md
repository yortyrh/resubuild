# cv-section-reorder Specification

## Purpose

Editor UX for manual ordering of non-date CV entities (profiles, skills, languages, interests, references) via drag-and-drop and keyboard controls, backed by sort-backed normalized tables and reorder API endpoints.

## Requirements

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

On reorder (drop or keyboard move), the client SHALL send `PUT /cv/:cvId/{section}/reorder` with an ordered array of row uuids. On success, the client SHALL align local section state with the server response only when the server order differs from the optimistic order. On failure, the client SHALL revert to the pre-reorder list.

#### Scenario: Successful reorder matches optimistic order

- **WHEN** the reorder API returns success with the same id order the client already displays
- **THEN** the editor SHALL NOT repaint the section list

#### Scenario: Successful reorder differs from optimistic order

- **WHEN** the reorder API returns success with a different id order than the client displayed optimistically
- **THEN** the editor SHALL replace local section state with the server response order

#### Scenario: Failed reorder reverts UI

- **WHEN** the reorder API returns a non-success status other than 409
- **THEN** the client SHALL restore the section list to the order before the reorder attempt
- **AND** SHALL surface an error message

#### Scenario: Stale version on reorder

- **WHEN** the reorder API returns 409
- **THEN** the client SHALL reload the section data from the server

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
