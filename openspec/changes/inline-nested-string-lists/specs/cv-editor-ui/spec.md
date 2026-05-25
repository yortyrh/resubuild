## ADDED Requirements

### Requirement: Highlights and courses SHALL be edited inline in parent create/edit forms

For Work, Volunteer, and Projects, `highlights` SHALL be edited with the shared `StringListField` inside the parent entry create/edit form, using inline markdown rich text per row. For Education, `courses` SHALL be edited with `StringListField` inside the parent create/edit form using plain text inputs per row. The editor MUST NOT render separate nested item rows (`ManagedNestedStrings` or equivalent) beneath view-mode parent entries for these fields.

#### Scenario: Editing work highlights in parent form

- **WHEN** a user clicks Edit on a work entry or starts creating a new work entry
- **THEN** the form SHALL include a Highlights `StringListField` with inline markdown editors for each highlight
- **AND** the view row beneath the title block SHALL NOT show separate Edit/Delete controls per highlight

#### Scenario: Editing education courses in parent form

- **WHEN** a user clicks Edit on an education entry or starts creating a new education entry
- **THEN** the form SHALL include a Courses `StringListField` with plain text inputs for each course
- **AND** the view row SHALL NOT show separate Edit/Delete controls per course

#### Scenario: Volunteer and project highlights match work pattern

- **WHEN** a user edits a volunteer or project entry in form mode
- **THEN** highlights SHALL use the same inline `StringListField` markdown pattern as Work
- **AND** SHALL NOT use nested per-highlight CRUD UI below the view row

#### Scenario: View mode still shows bullet lists

- **WHEN** a user views a saved work, volunteer, project, or education entry without editing
- **THEN** highlights or courses SHALL render as bulleted lists in the resume-preview row body unchanged

## MODIFIED Requirements

### Requirement: Sparse categorical fields MUST receive contextual hints

The editor SHALL augment field bindings with succinct helper/description lines on **view and form** states where applicable. Hints remain required for Work (Summary, Description, Highlights), Education (Area, Study type, Courses), Skills (Name, Level), Projects (Entity, Type, Highlights), Awards, Certificates, Publications, Interests (Name), and References (Name, Reference text). TagsInput fields for keywords and roles SHOULD include brief guidance that values are comma-separated tags saved with the parent entry. Highlights `StringListField` on Work, Volunteer, and Projects SHALL include helper copy in form mode clarifying bullet achievements for that entry.

#### Scenario: Work summary clarity

- **WHEN** a user focuses Work summary in edit form
- **THEN** surfaced hint SHALL communicate it is a 2–3 sentence professional elevator pitch for that role

#### Scenario: Skills level clarity

- **WHEN** a user focuses Skill level in edit form
- **THEN** surfaced hint SHOULD communicate meaningful scale cues without implying enum lock-in contradictory to schema

#### Scenario: Work highlights hint in inline list

- **WHEN** a user focuses Highlights in a work entry edit form
- **THEN** helper copy SHALL clarify these are achievement bullets saved with the work entry on Save
