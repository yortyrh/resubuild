## ADDED Requirements

### Requirement: Reorderable sections SHALL expose drag-and-drop reorder in view mode

The editor SHALL allow users to reorder entries via drag-and-drop in view mode for Social profiles, Skills, Languages, Interests, and References when at least two entries exist. Drag handles SHALL be visible and SHALL NOT appear while a row is in edit or create mode. Reorder SHALL call the section reorder API and refresh local state on success.

#### Scenario: Drag skill row

- **WHEN** a user drags a skill entry to a new position in view mode
- **THEN** the client SHALL call the skills reorder API with the new id order
- **AND** the list SHALL update to match the server response without a full page reload

#### Scenario: Reorder disabled during edit

- **WHEN** a user is editing a language entry inline
- **THEN** drag reorder controls SHALL be disabled for that section until save or cancel

### Requirement: Reorder SHALL provide keyboard-accessible move controls

Each reorderable row SHALL expose move-up and move-down actions (buttons or menu items) that reorder by one position and invoke the same reorder API as drag-and-drop. Controls SHALL be disabled at list boundaries and SHALL include accessible names (e.g. "Move skill up").

#### Scenario: Move reference up via keyboard

- **WHEN** a user activates move-up on the second reference entry
- **THEN** that entry SHALL move to first position after the API succeeds

### Requirement: Failed reorder SHALL preserve prior order in the UI

When a reorder API call fails (including 409), the UI SHALL NOT display the new order as persisted and SHALL surface an error with reload guidance on conflict.

#### Scenario: Conflict during reorder

- **WHEN** the reorder API returns 409
- **THEN** the client SHALL show the concurrency message and SHALL revert or reload the section list to the last known server order

## MODIFIED Requirements

### Requirement: Section UI SHALL default to resume-style view with explicit edit, create, and delete flows

Each section listed in the product scope SHALL render entries in a resume-like layout: primary label or title emphasized on the left, dates and location aligned to the right where applicable, and bullet lists for highlights or courses. Edit SHALL replace the viewed row with an inline form until Save or Cancel. Create SHALL show a form at the bottom of the section. Delete SHALL require an explicit confirmation step before calling the delete API. Reorderable non-date sections (Social profiles, Skills, Languages, Interests, References) SHALL additionally show reorder affordances in view mode per the reorder requirements above.

#### Scenario: View mode for education entry

- **WHEN** a user opens the Education section with existing entries
- **THEN** each entry SHALL display institution, study details, and courses in a layout consistent with printed CV sections (bold primary line, right-aligned dates, bulleted courses)

#### Scenario: Edit mode replaces view

- **WHEN** a user clicks Edit on a volunteer entry
- **THEN** the resume-style row SHALL be replaced by the edit form for that entry until the user saves or cancels

#### Scenario: Delete requires confirmation

- **WHEN** a user clicks Delete on a publication entry
- **THEN** the UI SHALL ask for confirmation before issuing the delete API call

#### Scenario: Create form placement

- **WHEN** a user starts adding a new award
- **THEN** the create form SHALL appear at the bottom of the Awards section below existing view rows

#### Scenario: Skills view shows reorder handle

- **WHEN** a user views the Skills section with three or more entries and none in edit mode
- **THEN** each skill row SHALL display a drag handle or equivalent reorder control
