## MODIFIED Requirements

### Requirement: Basics view mode SHALL group location with contact details under the name

In Basics **view** mode (non-editing), the editor SHALL render email, phone, website URL, formatted structured location (`city`, `region`, `postalCode`, `countryCode`), and optional `location.address` in a single contact line directly beneath the name/label block. Each populated contact segment SHALL be prefixed by an icon: map pin (location and street address), envelope (email), phone handset (phone), link (website). Segments SHALL be separated by bullet characters or equivalent inline spacing consistent with the existing contact line. Structured location and street address MUST NOT appear in the right-aligned `meta` column for Basics rows. Website segments SHALL use the shared `ExternalLink` styling (sky underline) with the link icon preceding link text.

#### Scenario: Location appears with email and phone

- **WHEN** a user views Basics with name, email, phone, and structured location populated
- **THEN** email, phone, and formatted location SHALL appear on one contact line under the name with icons before each segment
- **AND** segments SHALL remain visually grouped on one line separated by bullet characters
- **AND** the right-aligned meta column SHALL NOT display location for Basics

#### Scenario: Street address included in contact line

- **WHEN** a user views Basics with optional `location.address` populated
- **THEN** the street address SHALL appear in the same contact line as other contact fields with a map pin icon
- **AND** SHALL NOT render in the Basics meta column

#### Scenario: Contact line with location only

- **WHEN** a user views Basics with structured location but no email, phone, or website
- **THEN** the contact line SHALL still render showing formatted location (and address if present) under the name with a map pin icon

#### Scenario: Website icon and link styling

- **WHEN** a user views Basics with a non-empty `basics.url`
- **THEN** the website segment SHALL show a link icon before the link text
- **AND** the link SHALL use the shared external link underline styling and open in a new tab

## ADDED Requirements

### Requirement: Social profiles view rows SHALL display network brand icons

On the Social profiles tab in view mode, each saved profile row SHALL display a brand icon for the normalized network name before the title text when the network matches a supported platform (LinkedIn, Facebook, Instagram, GitHub, Reddit, Discord, X/Twitter, Dribbble, Behance). Unrecognized networks SHALL show a generic share icon. URL links in the row body SHALL remain clickable external links per existing URL requirements.

#### Scenario: GitHub profile row shows icon

- **WHEN** a user views a profile with network `GitHub` and username populated
- **THEN** the row title area SHALL include a GitHub brand icon before the network/username text

#### Scenario: Custom network shows fallback icon

- **WHEN** a user views a profile with network `My Blog` not in the suggestion list
- **THEN** the row SHALL display a generic fallback icon before the title text

### Requirement: Social profiles Network field SHALL use combobox with suggestions and free text

The Social profiles edit form Network control SHALL be a combobox offering prioritized suggestions (LinkedIn, Facebook, Instagram, GitHub, Reddit, Discord, X, Dribbble, Behance) with typeahead filtering. The control SHALL allow committing arbitrary free-text network names not present in the suggestion list (via keyboard commit or blur). Persisted values SHALL remain exactly as entered by the user.

#### Scenario: User selects LinkedIn from suggestions

- **WHEN** a user opens the Network combobox and selects LinkedIn
- **THEN** the profile draft `network` field SHALL be set to the selected label value
- **AND** the value SHALL persist on save

#### Scenario: User enters custom network name

- **WHEN** a user types a network name not in the suggestion list and commits the input
- **THEN** the draft SHALL retain the custom string as `network`
- **AND** save roundtrip SHALL preserve the custom value

#### Scenario: Combobox filters suggestions while typing

- **WHEN** a user types `git` in the Network combobox
- **THEN** the suggestion list SHALL filter to matching entries including GitHub
