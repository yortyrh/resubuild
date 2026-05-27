# cv-item-crud Specification

## Purpose

TBD - created by archiving change cv-granular-item-management. Update Purpose after archive.

## Requirements

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

### Requirement: Highlights and courses SHALL persist on parent entity save

Work, Volunteer, and Project `highlights`, and Education `courses`, SHALL be edited as ordered string arrays on the parent entity form and SHALL persist when the user saves the parent Work, Volunteer, Project, or Education entry. The editor SHALL NOT call Work Highlight, Volunteer Highlight, Project Highlight, or Education Course nested create/update/delete APIs during normal authoring flows.

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

### Requirement: Array item payloads SHALL omit empty string fields before persistence

When the Nest API or web client creates or updates a resume array item (work, volunteer, education, skills, projects, awards, certificates, publications, languages, interests, references, profiles), the payload SHALL be sanitized so that string fields containing only whitespace are omitted entirely. Non-string fields SHALL pass through unchanged except null/undefined values. This prevents optional URI and date fields from being persisted as empty strings that fail JSON Resume schema validation.

#### Scenario: Empty work URL omitted on create

- **WHEN** a client creates a work entry with `url: ""` or whitespace-only url alongside other populated fields
- **THEN** the persisted work object SHALL NOT include a `url` property
- **AND** the create operation SHALL succeed

#### Scenario: Empty optional field omitted on update

- **WHEN** a client updates an existing array item merging fields where a previously omitted optional string is sent as empty
- **THEN** the merged persisted object SHALL omit that key rather than store `""`

#### Scenario: Non-empty strings trimmed

- **WHEN** a client sends a string field with leading or trailing whitespace and non-empty content
- **THEN** the persisted value SHALL be trimmed

### Requirement: Editor sections SHOULD fetch section-scoped data when available

When the API exposes section GET routes, each editor tab SHOULD load only its section (e.g. work list via `GET /cv/:id/work`) instead of requiring the full assembled CV document for initial render. Full CV assembly remains required for export and preview flows.

#### Scenario: Work tab uses section endpoint

- **WHEN** a user opens the Work tab in the CV editor and section GET is available
- **THEN** the client SHOULD request work entries via the section-scoped endpoint rather than relying solely on a full CV payload loaded at editor mount

#### Scenario: Export uses full CV

- **WHEN** a user exports or previews the complete CV
- **THEN** the client SHALL use the full assembled CV from `GET /cv/:id` or equivalent export endpoint

### Requirement: Array item identity in URLs SHALL use stable row UUIDs

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
