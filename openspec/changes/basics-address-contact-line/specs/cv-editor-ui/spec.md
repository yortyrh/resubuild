## ADDED Requirements

### Requirement: Basics view mode SHALL group location with contact details under the name

In Basics **view** mode (non-editing), the editor SHALL render email, phone, website URL, formatted structured location (`city`, `region`, `postalCode`, `countryCode`), and optional `location.address` in a single bullet-separated contact line directly beneath the name/label block. Structured location and street address MUST NOT appear in the right-aligned `meta` column for Basics rows.

#### Scenario: Location appears with email and phone

- **WHEN** a user views Basics with name, email, phone, and structured location populated
- **THEN** email, phone, and formatted location SHALL appear on one contact line under the name separated by bullet characters
- **AND** the right-aligned meta column SHALL NOT display location for Basics

#### Scenario: Street address included in contact line

- **WHEN** a user views Basics with optional `location.address` populated
- **THEN** the street address SHALL appear in the same bullet-separated contact line as other contact fields
- **AND** SHALL NOT render in the Basics meta column

#### Scenario: Contact line with location only

- **WHEN** a user views Basics with structured location but no email, phone, or website
- **THEN** the contact line SHALL still render showing formatted location (and address if present) under the name

### Requirement: Basics view mode SHALL place Edit in the header top-right

In Basics **view** mode, the Edit action MUST render in the top-right of the Basics preview row, vertically aligned with the name/label header block. The Edit button MUST NOT render in the bottom action bar for Basics view rows.

#### Scenario: Edit visible beside name

- **WHEN** a user views the Basics tab in view mode
- **THEN** the Edit button SHALL appear top-right on the same header row as the name
- **AND** SHALL NOT appear below the summary or photo line

#### Scenario: Other sections unchanged

- **WHEN** a user views Work or another repeatable section in view mode
- **THEN** Edit actions SHALL remain in the bottom action bar per existing section row behavior

## MODIFIED Requirements

### Requirement: CV section tabs SHALL use resume-preview rows for listed entity types

For Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, dates and locations right, bullet lists for highlights and courses) instead of always-visible card forms. **Basics** view mode SHALL use the same row component for name/label and body content, but structured location and optional street address MUST render in the contact line under the name per the Basics contact grouping requirement—not in the right-aligned meta column.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position and company emphasis, date range and location on the right, and highlight bullets beneath the title block

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
