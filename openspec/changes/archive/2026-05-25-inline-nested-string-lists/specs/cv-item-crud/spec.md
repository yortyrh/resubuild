## ADDED Requirements

### Requirement: Highlights and courses SHALL persist on parent entity save

Work, Volunteer, and Project `highlights`, and Education `courses`, SHALL be edited as ordered string arrays on the parent entity form and SHALL persist when the user saves the parent Work, Volunteer, Project, or Education entry. The editor SHALL NOT call Work Highlight, Volunteer Highlight, Project Highlight, or Education Course nested create/update/delete APIs during normal authoring flows.

#### Scenario: Saving work entry persists highlights array

- **WHEN** a user adds or edits highlights in a work entry form and clicks Save
- **THEN** the client SHALL call the work-item create or update API with the full `highlights` string array on that payload
- **AND** SHALL NOT issue separate nested highlight API calls for each bullet

#### Scenario: Saving education entry persists courses array

- **WHEN** a user adds or edits courses in an education entry form and clicks Save
- **THEN** the client SHALL call the education-item create or update API with the full `courses` string array on that payload
- **AND** SHALL NOT issue separate nested course API calls for each course line

#### Scenario: Creating parent entry with highlights

- **WHEN** a user creates a new volunteer entry with two highlights and saves
- **THEN** both highlights SHALL be stored on `volunteer[].highlights` after the single create API call succeeds

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

Nested string items (`work[].highlights[]`, `volunteer[].highlights[]`, `education[].courses[]`, `projects[].highlights[]`) SHALL NOT be independently persistable from the editor UI; they SHALL be included in parent entity payloads per the highlights-and-courses parent-save requirement.

#### Scenario: Updating a work entry persists immediately

- **WHEN** a user edits a work entry and clicks Save in that entry's form
- **THEN** the client SHALL call the work-item update API for that CV
- **AND THEN** the server SHALL persist the change to `cv.data` and return updated data including a new `meta.version`

#### Scenario: Creating a skill entry persists immediately

- **WHEN** a user completes the create form at the bottom of the Skills section and clicks Save
- **THEN** the client SHALL call the skill create API
- **AND THEN** the new skill SHALL appear in the section list without a separate document save

#### Scenario: Deleting a reference entry persists immediately

- **WHEN** a user confirms deletion of a reference entry
- **THEN** the client SHALL call the reference delete API
- **AND THEN** the entry SHALL be removed from the section without a separate document save

### Requirement: String list fields SHALL use a unified TagsInput editor on parent entities

Keywords on Skills and Interests, and both keywords and roles on Projects, SHALL be edited with a single shared **TagsInput** string-list component. They SHALL NOT use separate nested CRUD endpoints per string; values SHALL persist when the parent Skill, Interest, or Project entity is saved. Work, Volunteer, and Project **highlights**, and Education **courses**, SHALL follow the same parent-save pattern using **StringListField** (markdown inline for highlights, plain text for courses) rather than nested CRUD endpoints.

#### Scenario: Editing project roles

- **WHEN** a user adds or removes role tags on a project and saves the project form
- **THEN** `projects[].roles` SHALL persist as an ordered string array on that project record

#### Scenario: Editing skill keywords

- **WHEN** a user modifies keyword tags on a skill and saves the skill form
- **THEN** `skills[].keywords` SHALL persist as an ordered string array on that skill record

#### Scenario: Editing project highlights on parent save

- **WHEN** a user modifies highlight rows on a project form and saves the project
- **THEN** `projects[].highlights` SHALL persist as an ordered string array on that project record without nested highlight API calls
