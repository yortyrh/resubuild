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
- **AND THEN** the server SHALL persist the change to the corresponding `cv_work` row (including `highlights` jsonb) and return the updated work item in the response

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

Each section listed in the product scope SHALL render entries in a resume-like layout: primary label or title emphasized on the left, dates and location aligned to the right where applicable, and bullet lists for highlights or courses. Edit SHALL replace the viewed row with an inline form until Save or Cancel. Create SHALL show a form at the bottom of the section. Delete SHALL require an explicit confirmation step before calling the delete API. Reorderable non-date sections (Social profiles, Skills, Languages, Interests, References) SHALL additionally show reorder affordances in view mode per `cv-section-reorder`.

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

- **WHEN** a user views the Skills section with two or more entries and none in edit mode
- **THEN** each skill row SHALL display a drag handle or equivalent reorder control

### Requirement: Item list state SHALL support reorder without separate document save

After a successful reorder API call, the client SHALL update the in-memory section array to match the server response order when it differs from the optimistic order. Reorder SHALL NOT require a document-level Save CV action.

#### Scenario: Local skills array updates after reorder

- **WHEN** a reorder API call for skills succeeds with a different order than shown optimistically
- **THEN** the editor's skills array state SHALL match the returned order
- **AND** subsequent edit actions SHALL use indices from the new order

### Requirement: Reorderable section items SHALL carry stable row ids in client state

For Social profiles, Skills, Languages, Interests, and References, the client SHALL retain each entry's server row uuid (returned from create, section GET, or reorder responses) to build reorder request payloads.

#### Scenario: Reorder payload uses row ids

- **WHEN** the client sends a skills reorder request after drag-and-drop
- **THEN** the `order` array SHALL contain uuid strings matching the skill rows, not display names or legacy indices alone

### Requirement: Failed item operations SHALL not silently discard user intent

When an item create, update, or delete API call fails, the UI SHALL surface an error and SHALL NOT pretend the change succeeded.

#### Scenario: Server error on save

- **WHEN** the API returns a non-success status during an item update
- **THEN** the client SHALL show an error message and SHALL NOT update local state as if the save succeeded

### Requirement: Nested string arrays SHALL NOT have dedicated API routes

The Nest API SHALL NOT expose separate create, update, or delete routes for individual strings within `work[].highlights`, `volunteer[].highlights`, `education[].courses`, or `projects[].highlights`. All mutations to those arrays SHALL occur only when the parent work, volunteer, education, or project entry is created or updated with the full string array in the request payload.

#### Scenario: Highlight change via parent update only

- **WHEN** a client needs to add, edit, or remove a work highlight
- **THEN** it SHALL call `PATCH /cv/:cvId/work/:itemId` with the complete updated `highlights` array
- **AND** SHALL NOT call a nested `/highlights/:index` route

#### Scenario: Course change via parent update only

- **WHEN** a client needs to add, edit, or remove an education course line
- **THEN** it SHALL call `PATCH /cv/:cvId/education/:itemId` with the complete updated `courses` array
- **AND** SHALL NOT call a nested `/courses/:index` route

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

When the API exposes section GET routes, each editor tab SHALL load only its section (e.g. work list via `GET /cv/:id/work`) instead of requiring the full assembled CV document for initial render. Full CV assembly is reserved for a future export or preview endpoint—not `GET /cv/:id`.

#### Scenario: Work tab uses section endpoint

- **WHEN** a user opens the Work tab in the CV editor and section GET is available
- **THEN** the client SHALL request work entries via the section-scoped endpoint rather than relying solely on a full CV payload loaded at editor mount

#### Scenario: Export uses dedicated assembly (future)

- **WHEN** a user exports or previews the complete JSON Resume document
- **THEN** the client SHALL use a future export endpoint or explicit assembly API—not slim `GET /cv/:id`

### Requirement: Basics read routes SHALL return header columns only

`GET /cv/:cvId/basics` SHALL return basics fields stored on the `cv` row (name, label, image, email, phone, url, summary, location). It SHALL NOT query `cv_profiles` or include a `profiles` array. Clients needing profiles SHALL call `GET /cv/:cvId/profiles`.

#### Scenario: Fetch basics without profiles query

- **WHEN** an authenticated client calls `GET /cv/:cvId/basics`
- **THEN** the response SHALL include basics scalar fields and location from the `cv` row
- **AND** the response SHALL NOT include a `profiles` property
- **AND** the service SHALL NOT list profile rows for that request

#### Scenario: Update basics response excludes profiles

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the mutation response `item` SHALL contain only updated basics fields from the header row
- **AND** SHALL NOT embed profiles loaded from `cv_profiles`

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
