## MODIFIED Requirements

### Requirement: The CV editor SHALL preserve structured editing

The CV editor MUST keep the existing structured JSON Resume editing workflow and
persistence behavior. This phase MUST focus on visual polish, layout clarity, navigation
styling, spacing, cards, selected states, and existing action placement.

The redesign MUST NOT introduce a new `Improve with AI` mode, new AI action cards, new
generated recommendations, or new AI/data contracts.

#### Scenario: User edits CV with redesigned UI

- **WHEN** the user opens a CV editor
- **THEN** the editor SHALL expose the same structured CV sections and editing behavior as
  before
- **AND** the UI SHALL use the refreshed purple/teal visual system
- **AND** existing save/persistence behavior SHALL remain unchanged

### Requirement: CV list SHALL support thumbnail-oriented presentation

The My CVs view SHOULD present CVs as thumbnail cards or a card/list hybrid. Thumbnails
MAY be generated from existing preview rendering or represented by placeholders.

Thumbnail rendering MUST be non-blocking and MUST NOT prevent the CV list from loading.

#### Scenario: CV thumbnail is available

- **WHEN** a CV card renders and a thumbnail is available
- **THEN** the card SHALL show the thumbnail preview with the CV title and existing actions

#### Scenario: CV thumbnail is unavailable

- **WHEN** thumbnail rendering fails or is not yet generated
- **THEN** the card SHALL show a clean placeholder preview
- **AND** existing open/edit/preview actions SHALL remain available

### Requirement: CV preview layout controls SHALL be minimally intrusive

The preview/export experience MUST reduce visual clutter while preserving existing control
behavior. Layout controls SHOULD be styled as secondary controls and MAY be collapsed if
the existing implementation supports it safely.

Template selection SHOULD show visual thumbnails or preview cards for available templates
where practical. If template thumbnails are not practical in this phase, the existing
selector MUST remain available and be restyled consistently.

Default section visibility MUST NOT change globally unless the current product already
supports safe saved preferences for that behavior.

#### Scenario: Template selection is more visual when supported

- **WHEN** the user changes resume template
- **THEN** the UI SHOULD show template thumbnails or preview cards for supported templates
- **AND** the existing template selection behavior SHALL remain available

#### Scenario: Existing preview settings remain safe

- **WHEN** the preview/export layout initializes
- **THEN** it SHALL preserve existing user expectations and saved visibility preferences
- **AND** SHALL NOT hide existing resume content unexpectedly
