## ADDED Requirements

### Requirement: Date-primary sections SHALL display ongoing roles with a Current end label

In view mode, Work, Volunteer, Education, and Projects entries SHALL display the date range using a shared formatter. When `startDate` is set and `endDate` is absent, the meta column SHALL show `{startDate} – Current` (using an en dash). When both dates are set, the formatter SHALL show `{startDate} – {endDate}`. When neither is set, the meta date line SHALL be omitted.

#### Scenario: Ongoing work shows Current

- **WHEN** a work entry has `startDate` `2000-10-12` and no `endDate`
- **THEN** the view row meta SHALL display `2000-10-12 – Current`

#### Scenario: Completed role shows both dates

- **WHEN** a work entry has `startDate` `2018-01` and `endDate` `2022-06`
- **THEN** the view row meta SHALL display `2018-01 – 2022-06`

### Requirement: User-facing date fields SHALL be required per section rules

The editor SHALL enforce required dates on user create and edit flows only (not on import preview or agent-populated drafts before the user opens the section form).

- Work, Volunteer, Education, Projects: `startDate` SHALL be required before Save on create and edit. `endDate` SHALL remain optional.
- Awards, Certificates, Publications: the single date field (`date` or `releaseDate`) SHALL be required before Save on **create** only; edit MAY leave date unchanged but SHALL NOT clear it to empty on save.

When validation fails, the form SHALL show an inline error on the date field and SHALL NOT call the create or update API.

#### Scenario: Work save blocked without start date

- **WHEN** a user attempts to save a new work entry without entering a start date
- **THEN** the client SHALL show a validation error on the start date field
- **AND** SHALL NOT invoke the work create API

#### Scenario: Award create blocked without date

- **WHEN** a user attempts to save a new award without entering a date
- **THEN** the client SHALL show a validation error on the date field
- **AND** SHALL NOT invoke the award create API

#### Scenario: Import payload without start date not blocked at API

- **WHEN** an import or agent pipeline creates a work entry without `startDate` via the API
- **THEN** the API SHALL accept the payload per existing optional-field rules
- **AND** the editor SHALL require the user to supply `startDate` before a subsequent manual save from the section form

### Requirement: Date-primary section lists SHALL re-sort when dates change

For Work, Volunteer, Education, Projects, Awards, Certificates, and Publications, the client SHALL keep entries ordered according to `@resumind/types` sort helpers. The list order SHALL update when:

1. A user changes a sort-affecting date field in create or edit form state (optimistic re-sort of the section array).
2. A create, update, or delete mutation succeeds (merge or refetch, then apply sort helpers so local state matches server order).

Reorder drag handles SHALL NOT appear on these sections.

#### Scenario: Editing end date reorders list before save

- **WHEN** a user edits a work entry's `endDate` such that it would rank below another entry
- **THEN** the section list SHALL reorder immediately to reflect the new sort order while the form remains open

#### Scenario: Successful update re-sorts section

- **WHEN** a user saves an education entry with a changed `startDate`
- **THEN** the client SHALL update local education state sorted by the shared education sort helper

#### Scenario: Date-primary sections excluded from drag reorder

- **WHEN** a user views the Work section
- **THEN** drag reorder controls SHALL NOT be shown for work entries

## MODIFIED Requirements

### Requirement: Section UI SHALL default to resume-style view with explicit edit, create, and delete flows

Each section listed in the product scope SHALL render entries in a resume-like layout: primary label or title emphasized on the left, dates and location aligned to the right where applicable, and bullet lists for highlights or courses. Date-range sections (Work, Volunteer, Education, Projects) SHALL show ongoing roles with `{startDate} – Current` in the right-aligned meta column when `endDate` is unset. Edit SHALL replace the viewed row with an inline form until Save or Cancel. Create SHALL show a form at the bottom of the section. Delete SHALL require an explicit confirmation step before calling the delete API. Reorderable non-date sections (Social profiles, Skills, Languages, Interests, References) SHALL additionally show reorder affordances in view mode per `cv-section-reorder`.

#### Scenario: View mode for education entry

- **WHEN** a user opens the Education section with existing entries
- **THEN** each entry SHALL display institution, study details, and courses in a layout consistent with printed CV sections (bold primary line, right-aligned dates including `– Current` when applicable, bulleted courses)

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
