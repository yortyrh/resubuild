# cv-item-crud Specification

## Purpose

TBD - created by archiving change cv-granular-item-management. Update Purpose after archive.

## Requirements

### Requirement: Each listed resume entity type SHALL support immediate create, update, and delete persistence

The system SHALL treat the following as independently persistable items, each invoking the Nest API on successful user confirmation (save or delete), without requiring a document-level Save CV action for resume body content:

- Basics (singleton update)
- Profile (`basics.profiles[]`)
- Work (`work[]`)
- Work Highlight (`work[].highlights[]`)
- Volunteer (`volunteer[]`)
- Volunteer Highlight (`volunteer[].highlights[]`)
- Education (`education[]`)
- Education Course (`education[].courses[]`)
- Skill (`skills[]`)
- Project (`projects[]`)
- Project Highlight (`projects[].highlights[]`)
- Award (`awards[]`)
- Certificate (`certificates[]`)
- Publication (`publications[]`)
- Language (`languages[]`)
- Interest (`interests[]`)
- Reference (`references[]`)

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

Keywords on Skills and Interests, and both keywords and roles on Projects, SHALL be edited with a single shared **TagsInput** string-list component. They SHALL NOT use separate nested CRUD endpoints per string; values SHALL persist when the parent Skill, Interest, or Project entity is saved.

#### Scenario: Editing project roles

- **WHEN** a user adds or removes role tags on a project and saves the project form
- **THEN** `projects[].roles` SHALL persist as an ordered string array on that project record

#### Scenario: Editing skill keywords

- **WHEN** a user modifies keyword tags on a skill and saves the skill form
- **THEN** `skills[].keywords` SHALL persist as an ordered string array on that skill record

### Requirement: Section UI SHALL default to resume-style view with explicit edit, create, and delete flows

Each section listed in the product scope SHALL render entries in a resume-like layout: primary label or title emphasized on the left, dates and location aligned to the right where applicable, and bullet lists for highlights or courses. Edit SHALL replace the viewed row with an inline form until Save or Cancel. Create SHALL show a form at the bottom of the section. Delete SHALL require an explicit confirmation step before calling the delete API.

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

### Requirement: Failed item operations SHALL not silently discard user intent

When an item create, update, or delete API call fails (including HTTP 409 version conflict), the UI SHALL surface an error, SHALL NOT pretend the change succeeded, and SHOULD offer reload guidance on conflict.

#### Scenario: Version conflict on save

- **WHEN** the API returns 409 during an item update because `meta.version` is stale
- **THEN** the client SHALL show the concurrency message and SHALL NOT update local state as if the save succeeded
