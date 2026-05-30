## ADDED Requirements

### Requirement: Centered and design headers SHALL center contact and profile rows

When `headerStyle` is `centered` or `design`, the contact row and social profile row (when present) SHALL use a horizontal flex layout with `justify-center` so icon-prefixed segments align with centered name and label text.

#### Scenario: Classic centered template centers contact row

- **WHEN** export HTML is generated with `headerStyle` `centered` and at least one visible contact field
- **THEN** the contact row element SHALL include `justify-center` in its class list
- **AND** a social profile row (when profiles are visible) SHALL also include `justify-center`

#### Scenario: Modern design template centers contact row

- **WHEN** export HTML is generated with `headerStyle` `design` and at least one visible contact field
- **THEN** the contact row element SHALL include `justify-center`
- **AND** the header SHALL retain `text-center` on the wrapping container

#### Scenario: Left header does not center contact row

- **WHEN** export HTML is generated with `headerStyle` `left` and visible contact fields
- **THEN** the contact row SHALL NOT include `justify-center`
- **AND** the header container SHALL use left-aligned text classes

## MODIFIED Requirements

### Requirement: Template headers SHALL prefix recognized social profiles with brand icons

When `basics.profiles` is visible, each profile with a resolvable URL SHALL render as a link prefixed by a brand icon when `network` normalizes to a supported platform. Supported platforms (case-insensitive aliases included) SHALL include at minimum: LinkedIn, Facebook, Instagram, GitHub, Reddit, Discord, X (Twitter), Dribbble, and Behance. Unrecognized networks SHALL use a generic share/globe icon.

#### Scenario: GitHub profile shows brand icon

- **WHEN** a profile has `network` `GitHub`, `username` `thomasdavis`, and a valid `url`
- **THEN** export HTML SHALL include a GitHub brand icon before the link text
- **AND** the link href SHALL point to the normalized profile URL

#### Scenario: Unknown network uses fallback icon

- **WHEN** a profile has `network` `My Portfolio` and a valid `url`
- **THEN** export HTML SHALL render a generic fallback icon before the link
- **AND** the visible link label SHALL reflect username or network name per existing template rules

#### Scenario: Tabular header stacks icon-prefixed contact lines

- **WHEN** export HTML uses the `tabular` header style
- **THEN** each contact field in the right column SHALL appear on its own line with its icon prefix

#### Scenario: Tabular header shows profiles inline on one row

- **WHEN** export HTML uses the `tabular` header style and multiple profiles are visible
- **THEN** social profile links in the right column SHALL render in a single flex row with `justify-end` and horizontal gap between segments
- **AND** profile segments SHALL NOT be separated by `<br />` line breaks
- **AND** the profile row SHALL NOT use a stacked `space-y-1` vertical layout
