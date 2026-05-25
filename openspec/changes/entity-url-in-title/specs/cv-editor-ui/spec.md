## ADDED Requirements

### Requirement: ResumeItemRow SHALL support an optional subtitle beneath the title

The shared resume-preview row component SHALL accept an optional `subtitle` prop rendered directly below the primary title in muted, normal-weight small text. Sections that carry secondary entity context (education study type/area, awarder, language fluency) SHALL use this slot instead of the right-aligned meta column or redundant body lines.

#### Scenario: Education row shows study type and area as subtitle

- **WHEN** a user views a saved education entry with `studyType` "Bachelor" and `area` "Computer Science"
- **THEN** the institution name SHALL appear as the bold title (linked when `url` is set)
- **AND** "Bachelor — Computer Science" SHALL appear as subtitle beneath the title
- **AND** study type and area SHALL NOT appear in the right-aligned meta column

#### Scenario: Language row shows fluency as subtitle

- **WHEN** a user views a saved language entry with `language` "English" and `fluency` "Native"
- **THEN** "English" SHALL appear as the title
- **AND** "Native" SHALL appear as subtitle beneath the title
- **AND** fluency SHALL NOT appear in the meta column

#### Scenario: Award row shows awarder as subtitle

- **WHEN** a user views a saved award with `title` "Employee of the Year" and `awarder` "Acme Corp"
- **THEN** the award title SHALL remain the bold primary title
- **AND** "Acme Corp" SHALL appear as subtitle beneath the title
- **AND** awarder SHALL NOT appear in the meta column

## MODIFIED Requirements

### Requirement: CV section tabs SHALL use resume-preview rows for listed entity types

For Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, optional subtitle beneath title, dates and locations right, bullet lists for highlights and courses) instead of always-visible card forms. **Basics** view mode SHALL use the same row component but structured location and optional street address MUST render in the contact line under the name—not in the right-aligned meta column—and a profile photo thumbnail MUST appear left of the name/contact block when `basics.image` is set per the Basics profile photo requirements.

Entity `url` values on Work, Volunteer, Education, Projects, Certificates, and Publications entries SHALL attach to the primary entity label in the title (company, organization, institution, project name, certificate name, publication name) as clickable external links when present; raw URL strings MUST NOT appear in the meta column or as standalone body links for those sections.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position and company emphasis with the company linked when `url` is set, date range and location on the right, and highlight bullets beneath the title block
- **AND** the raw URL string SHALL NOT appear in meta or body

#### Scenario: Skills section preview layout

- **WHEN** a user views the Skills tab
- **THEN** each skill SHALL show name and level in a compact resume line with keywords rendered as inline comma-separated or tag-like text consistent with the sample CV

#### Scenario: References section preview layout

- **WHEN** a user views the References tab with saved entries
- **THEN** each reference SHALL show the contact name emphasized with the reference text displayed beneath in resume-appropriate prose layout

#### Scenario: Basics location not in meta column

- **WHEN** a user views the Basics tab in view mode with location data saved
- **THEN** location SHALL appear in the contact line under the name
- **AND** SHALL NOT appear in the right-aligned meta slot used by other sections for geography

#### Scenario: Basics profile photo beside name

- **WHEN** a user views the Basics tab in view mode with `basics.image` set
- **THEN** a profile thumbnail SHALL appear to the left of the name and contact line
- **AND** the photo URL SHALL NOT render as plain text in the row body

#### Scenario: Project entity and type in body before roles

- **WHEN** a user views a saved project with `entity`, `type`, and `roles` populated
- **THEN** entity and type SHALL render in the row body before the roles line
- **AND** entity and type SHALL NOT appear in the right-aligned meta column

### Requirement: View mode SHALL render persisted URL fields as clickable external links

Every JSON Resume `url` field shown in CV editor view mode (resume-preview rows) SHALL be rendered as a clickable hyperlink using the stored value as the destination. The link MUST open in a new browsing context (`target="_blank"`) with `rel="noopener noreferrer"`. Bare hostnames without a scheme (e.g. `linkedin.com/in/user`) SHALL be normalized to HTTPS for navigation.

For Work, Volunteer, Education, Projects, Certificates, and Publications, the hyperlink SHALL wrap the primary entity label in the row title and SHALL display the entity name (not the raw URL string) as link text. The URL MUST NOT additionally appear as plain text in the meta column or as a duplicate standalone link in the row body.

#### Scenario: Social profile URL in preview

- **WHEN** a user views a saved social profile entry with a non-empty URL on the Social profiles tab
- **THEN** the URL SHALL appear as a clickable link that opens the profile destination in a new tab

#### Scenario: Basics website in contact line

- **WHEN** a user views Basics with a non-empty `basics.url` alongside email or phone
- **THEN** the website segment in the contact line under the name SHALL be a clickable link opening in a new tab while other contact segments remain plain text

#### Scenario: Work entry URL in preview

- **WHEN** a user views a saved work entry with a non-empty `url` field and company name populated
- **THEN** the Work tab preview SHALL render the company name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column or entry body

#### Scenario: Volunteer entry URL in preview

- **WHEN** a user views a saved volunteer entry with a non-empty `url` field and organization populated
- **THEN** the Volunteer tab preview SHALL render the organization name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column or entry body

#### Scenario: Education institution URL in preview

- **WHEN** a user views a saved education entry with a non-empty `url` field and institution populated
- **THEN** the Education tab preview SHALL render the institution name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column

#### Scenario: Project URL in preview

- **WHEN** a user views a saved project with a non-empty `url` field and name populated
- **THEN** the Projects tab preview SHALL render the project name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the meta column or entry body

#### Scenario: Publication and certificate URLs in preview

- **WHEN** a user views a saved publication or certificate with a non-empty `url` field and name populated
- **THEN** the corresponding tab preview SHALL render the entry name in the title as a clickable external link
- **AND** the raw URL string SHALL NOT appear in the entry body

#### Scenario: Unsafe URL scheme

- **WHEN** a stored URL uses a disallowed scheme such as `javascript:`
- **THEN** the editor view SHALL NOT navigate via script execution and SHALL omit or neutralize the unsafe hyperlink while preserving safe display where possible

### Requirement: View mode SHALL expose every form-backed JSON Resume field per section

For each CV editor tab that uses resume-preview rows, the read-only view for a saved entry SHALL render every field that the corresponding edit form can persist, whenever that field holds a non-empty value. Fields MUST NOT be hidden in view mode solely because they were absent from sample resume data used during initial UI design.

URL fields remain visible in view mode via linked entity titles (or contact-line links for Basics) rather than raw URL text.

#### Scenario: Work entry shows URL and description

- **WHEN** a user saves a work entry with `url` and `description` populated
- **THEN** the Work tab view row SHALL display the company as a linked title segment and the description in the body without requiring Edit mode

#### Scenario: Volunteer entry shows organization URL

- **WHEN** a user saves a volunteer entry with `url` populated
- **THEN** the Volunteer tab view row SHALL expose the URL as a link on the organization name in the title

#### Scenario: Education entry shows institution URL and score

- **WHEN** a user saves an education entry with `url` and `score` populated
- **THEN** the Education tab view row SHALL display the institution as a linked title and the score in the meta column

#### Scenario: Project entry shows URL, entity, and type

- **WHEN** a user saves a project with `url`, `entity`, and `type` populated
- **THEN** the Projects tab view row SHALL display the project name as a linked title, entity and type in the body, and dates in meta

#### Scenario: Award entry shows awarder

- **WHEN** a user saves an award with `awarder` populated
- **THEN** the Awards tab view row SHALL display the awarder as subtitle beneath the title

#### Scenario: Certificate entry shows URL

- **WHEN** a user saves a certificate with `url` populated
- **THEN** the Certificates tab view row SHALL display the certificate name as a linked title

#### Scenario: Publication entry shows URL and summary

- **WHEN** a user saves a publication with `url` and `summary` populated
- **THEN** the Publications tab view row SHALL display the publication name as a linked title and the summary in the body
