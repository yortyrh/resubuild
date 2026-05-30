# resume-template-header-icons Specification

## Purpose

TBD - created by archiving change cv-header-contact-icons. Update Purpose after archive.

## Requirements

### Requirement: Template headers SHALL prefix contact fields with inline icons

For every registered visual template (`classic`, `modern`, `tabular`, `left`), `renderBasicsHeader` SHALL render location, phone, email, and website (when visible per presentation `basicsFields`) each prefixed by a small inline SVG icon: map pin (location), phone handset (phone), envelope (email), link/chain (website). Icons SHALL use `currentColor`, SHALL be marked `aria-hidden="true"`, and SHALL appear immediately before the field text within an inline-flex row.

#### Scenario: Classic template shows contact icons

- **WHEN** export HTML is generated for `classic` with location, phone, email, and url populated
- **THEN** the header contact area SHALL include inline SVG icons before each visible field
- **AND** each icon SHALL precede its corresponding text or link

#### Scenario: Hidden basics field omits icon segment

- **WHEN** presentation config sets `basicsFields.phone` to false
- **THEN** export HTML SHALL NOT render a phone icon or phone text

### Requirement: Template website links SHALL use distinct link styling

Website URLs in template headers SHALL render as anchor elements with underline and offset decoration visible on screen. Screen styling MAY use neutral or sky-toned link colors; print styles SHALL preserve legibility (underline and inherited text color acceptable for print).

#### Scenario: Website link is styled

- **WHEN** basics include `url` and url field is visible
- **THEN** the website anchor SHALL include underline decoration classes
- **AND** the displayed label MAY omit the `https://` scheme prefix

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
