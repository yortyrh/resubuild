## ADDED Requirements

### Requirement: View mode SHALL expose every form-backed JSON Resume field per section

For each CV editor tab that uses resume-preview rows, the read-only view for a saved entry SHALL render every field that the corresponding edit form can persist, whenever that field holds a non-empty value. Fields MUST NOT be hidden in view mode solely because they were absent from sample resume data used during initial UI design.

#### Scenario: Work entry shows URL and description

- **WHEN** a user saves a work entry with `url` and `description` populated
- **THEN** the Work tab view row SHALL display both values without requiring Edit mode

#### Scenario: Volunteer entry shows organization URL

- **WHEN** a user saves a volunteer entry with `url` populated
- **THEN** the Volunteer tab view row SHALL display the URL

#### Scenario: Education entry shows institution URL and score

- **WHEN** a user saves an education entry with `url` and `score` populated
- **THEN** the Education tab view row SHALL display both values

#### Scenario: Project entry shows URL, entity, and type

- **WHEN** a user saves a project with `url`, `entity`, and `type` populated
- **THEN** the Projects tab view row SHALL display all three values

#### Scenario: Award entry shows awarder

- **WHEN** a user saves an award with `awarder` populated
- **THEN** the Awards tab view row SHALL display the awarder

#### Scenario: Certificate entry shows URL

- **WHEN** a user saves a certificate with `url` populated
- **THEN** the Certificates tab view row SHALL display the URL

#### Scenario: Publication entry shows URL and summary

- **WHEN** a user saves a publication with `url` and `summary` populated
- **THEN** the Publications tab view row SHALL display both values

### Requirement: Field coverage audit SHALL be documented and verified

Before marking the change complete, the implementation SHALL include a documented mapping of each section's form fields to view-mode placement, and automated tests SHALL assert that representative fully populated entries render all expected field values in view mode.

#### Scenario: Regression test for Work completeness

- **WHEN** a unit test renders a Work section view row with every Work field set
- **THEN** the rendered output SHALL include text (or link) for `name`, `position`, `location`, `url`, `startDate`, `endDate`, `summary`, `description`, and each highlight

#### Scenario: Empty fields remain omitted

- **WHEN** a saved entry has a form-backed field that is empty or undefined
- **THEN** the view row SHALL NOT render a placeholder for that field
