## MODIFIED Requirements

### Requirement: The web app SHALL expose consistent semantic design tokens

The web app MUST expose semantic tokens for the refreshed Resubuild brand palette:

- Primary purple: `#6d49f4`
- Secondary teal: `#00978a`

The primary purple MUST be used for primary CTAs, active navigation, selected tabs, primary focus rings, and high-priority highlights. The secondary teal MUST be used for progress, success/trust cues, secondary accents, and evidence/status affordances. The UI SHOULD avoid additional dominant accent colors except for semantic warning/error states.

The system MUST retain light, ATS-friendly surfaces:

- near-white app background;
- white cards;
- subtle borders;
- restrained shadows;
- rounded corners;
- near-black text and muted-gray secondary text.

#### Scenario: Brand tokens are available to shared UI

- **WHEN** shared components render buttons, cards, badges, tabs, navigation items, or focus states
- **THEN** they SHALL use semantic tokens mapped to `#6d49f4` and `#00978a`
- **AND** they SHALL NOT hardcode legacy purple/indigo accents in newly redesigned surfaces

#### Scenario: Destructive actions remain visually secondary until invoked

- **WHEN** a destructive action such as Delete is available from a list or workspace item
- **THEN** it SHALL be hidden behind a secondary menu or confirmation flow
- **AND** SHALL NOT appear as the dominant visible button on the card or row

## ADDED Requirements

### Requirement: The app SHALL provide a reusable Resubuild logo system

The web app MUST provide reusable logo components for:

- full horizontal lockup: icon + `Resubuild` wordmark;
- compact mark for favicon, app icon, sidebar, and small UI contexts;
- accessible text alternative or semantic label.

The logo icon MUST combine a document/CV motif with a rebuild/progress/upward-motion motif and MAY include a subtle AI/spark accent. The logo MUST visually use the purple/teal brand palette.

#### Scenario: Header and authenticated shell use the same logo system

- **WHEN** the marketing header and authenticated shell render
- **THEN** both SHALL use the shared Resubuild logo component or shared logo asset source
- **AND** compact contexts SHALL use the compact mark rather than duplicating a separate unrelated icon
