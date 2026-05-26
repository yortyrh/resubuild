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
- **AND THEN** the server SHALL persist the change to the corresponding `cv_work` row (including `highlights` jsonb) and return updated data including a new `meta.version` from `cv.meta_version`

#### Scenario: Creating a skill entry persists immediately

- **WHEN** a user completes the create form at the bottom of the Skills section and clicks Save
- **THEN** the client SHALL call the skill create API
- **AND THEN** the new skill SHALL appear in the section list without a separate document save

#### Scenario: Deleting a reference entry persists immediately

- **WHEN** a user confirms deletion of a reference entry
- **THEN** the client SHALL call the reference delete API
- **AND THEN** the entry SHALL be removed from the section without a separate document save

### Requirement: String list fields SHALL use a unified TagsInput editor on parent entities

Keywords on Skills and Interests, and both keywords and roles on Projects, SHALL be edited with a single shared **TagsInput** string-list component. They SHALL NOT use separate nested CRUD endpoints per string; values SHALL persist as jsonb arrays on the parent normalized row when the parent Skill, Interest, or Project entity is saved. Work, Volunteer, and Project **highlights**, and Education **courses**, SHALL follow the same parent-save pattern using **StringListField** (markdown inline for highlights, plain text for courses) stored as jsonb on the parent row rather than nested CRUD endpoints.

#### Scenario: Editing project roles

- **WHEN** a user adds or removes role tags on a project and saves the project form
- **THEN** `cv_project.roles` SHALL persist as a jsonb string array on that project row

#### Scenario: Editing skill keywords

- **WHEN** a user modifies keyword tags on a skill and saves the skill form
- **THEN** `cv_skill.keywords` SHALL persist as a jsonb string array on that skill row

#### Scenario: Editing project highlights on parent save

- **WHEN** a user modifies highlight rows on a project form and saves the project
- **THEN** `cv_project.highlights` SHALL persist as a jsonb string array on that project row without nested highlight API calls

### Requirement: Highlights and courses SHALL persist on parent entity save

Work, Volunteer, and Project `highlights`, and Education `courses`, SHALL be edited as ordered string arrays on the parent entity form and SHALL persist as jsonb on the parent row when the user saves the parent Work, Volunteer, Project, or Education entry. The editor SHALL NOT call Work Highlight, Volunteer Highlight, Project Highlight, or Education Course nested create/update/delete APIs during normal authoring flows.

#### Scenario: Saving work entry persists highlights array

- **WHEN** a user adds or edits highlights in a work entry form and clicks Save
- **THEN** the client SHALL call the work-item create or update API with the full `highlights` string array on that payload
- **AND** the server SHALL store highlights in `cv_work.highlights` jsonb
- **AND** SHALL NOT issue separate nested highlight API calls for each bullet

#### Scenario: Saving education entry persists courses array

- **WHEN** a user adds or edits courses in an education entry form and clicks Save
- **THEN** the client SHALL call the education-item create or update API with the full `courses` string array on that payload
- **AND** the server SHALL store courses in `cv_education.courses` jsonb
- **AND** SHALL NOT issue separate nested course API calls for each course line

#### Scenario: Creating parent entry with highlights

- **WHEN** a user creates a new volunteer entry with two highlights and saves
- **THEN** both highlights SHALL be stored in `cv_volunteer.highlights` jsonb after the single create API call succeeds

## ADDED Requirements

### Requirement: Editor sections SHOULD fetch section-scoped data when available

When the API exposes section GET routes, each editor tab SHOULD load only its section (e.g. work list via `GET /cv/:id/work`) instead of requiring the full assembled CV document for initial render. Full CV assembly remains required for export and preview flows.

#### Scenario: Work tab uses section endpoint

- **WHEN** a user opens the Work tab in the CV editor and section GET is available
- **THEN** the client SHOULD request work entries via the section-scoped endpoint rather than relying solely on a full CV payload loaded at editor mount

#### Scenario: Export uses full CV

- **WHEN** a user exports or previews the complete CV
- **THEN** the client SHALL use the full assembled CV from `GET /cv/:id` or equivalent export endpoint

### Requirement: Array item identity in URLs SHALL map to sort order

Public item routes SHALL continue to use numeric indices in paths. The index SHALL equal the zero-based position after ordering section rows by `sort ASC`, then `id ASC`. Internal row primary keys (uuid) SHALL NOT be required in client URLs.

#### Scenario: Index stable after unrelated insert

- **WHEN** a work entry at index 0 exists and a new entry is appended
- **THEN** the existing entry SHALL remain at index 0 unless its `sort` value is explicitly changed
