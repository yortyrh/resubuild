## ADDED Requirements

### Requirement: Keyword string arrays SHALL render as read-only tag pills in view mode

Skills, Interests, and Projects keyword arrays in resume-preview view rows SHALL render through a shared read-only tag list component that reuses the same pill styling as `TagsInput` (`bg-muted`, rounded corners, compact padding) without remove buttons or text inputs. Keywords MUST NOT be displayed as comma-separated plain text in view mode.

#### Scenario: Skills keywords as tag pills

- **WHEN** a user views the Skills tab with a saved skill whose `keywords` array contains `["React", "TypeScript"]`
- **THEN** each keyword SHALL appear as an individual muted pill beneath the skill name/level line
- **AND** SHALL NOT appear as the literal string `React, TypeScript`

#### Scenario: Interests keywords as tag pills

- **WHEN** a user views the Interests tab with saved keywords on an interest entry
- **THEN** keywords SHALL render as the same read-only tag pills used on Skills

#### Scenario: Projects keywords as tag pills

- **WHEN** a user views the Projects tab with saved keywords on a project entry
- **THEN** keywords SHALL render as read-only tag pills in the entry body
- **AND** SHALL NOT use a comma-separated `Keywords:` prose line

## MODIFIED Requirements

### Requirement: CV section tabs SHALL use resume-preview rows for listed entity types

For Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, dates and locations right, bullet lists for highlights and courses) instead of always-visible card forms. **Basics** view mode SHALL use the same row component but structured location and optional street address MUST render in the contact line under the name—not in the right-aligned meta column—and a profile photo thumbnail MUST appear left of the name/contact block when `basics.image` is set per the Basics profile photo requirements.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position and company emphasis, date range and location on the right, and highlight bullets beneath the title block

#### Scenario: Skills section preview layout

- **WHEN** a user views the Skills tab
- **THEN** each skill SHALL show name and level in a compact resume line with keywords rendered as read-only tag pills matching the edit-mode `TagsInput` appearance (without delete controls)

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
