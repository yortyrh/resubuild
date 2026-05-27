## MODIFIED Requirements

### Requirement: Each listed resume entity type SHALL support immediate create, update, and delete persistence

The system SHALL treat the following as independently persistable items, each invoking the Nest API on successful user confirmation (save or delete), without requiring a document-level Save CV action for resume body content:

- Basics (singleton update)
- Profile (`basics.profiles[]`)
- Work (`work[]`)
- Volunteer (`volunteer[]`)
- Education (`education[]`)
- Skill (`skills[]`)
- Project (`projects[]`)
- Award (`awards[]`)
- Certificate (`certificates[]`)
- Publication (`publications[]`)
- Language (`languages[]`)
- Interest (`interests[]`)
- Reference (`references[]`)

Nested string items (`work[].highlights[]`, `volunteer[].highlights[]`, `education[].courses[]`, `projects[].highlights[]`) SHALL NOT be independently persistable from the editor UI; they SHALL be included in parent entity payloads as jsonb string arrays on the parent row per the highlights-and-courses parent-save requirement.

#### Scenario: Updating a work entry persists immediately

- **WHEN** a user edits a work entry and clicks Save in that entry's form
- **THEN** the client SHALL call the work-item update API for that CV
- **AND THEN** the server SHALL persist the change to the corresponding `cv_work` row (including `highlights` jsonb) and return the updated work item in the response

#### Scenario: Creating a skill entry persists immediately

- **WHEN** a user completes the create form at the bottom of the Skills section and clicks Save
- **THEN** the client SHALL call the skill create API
- **AND THEN** the new skill SHALL appear in the section list without a separate document save

#### Scenario: Deleting a reference entry persists immediately

- **WHEN** a user confirms deletion of a reference entry
- **THEN** the client SHALL call the reference delete API
- **AND THEN** the entry SHALL be removed from the section without a separate document save

### Requirement: Failed item operations SHALL not silently discard user intent

When an item create, update, or delete API call fails, the UI SHALL surface an error and SHALL NOT pretend the change succeeded.

#### Scenario: Server error on save

- **WHEN** the API returns a non-success status during an item update
- **THEN** the client SHALL show an error message and SHALL NOT update local state as if the save succeeded
