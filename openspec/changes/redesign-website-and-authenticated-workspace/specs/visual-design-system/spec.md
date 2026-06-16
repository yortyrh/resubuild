## MODIFIED Requirements

### Requirement: The web app SHALL expose consistent semantic design tokens

The web app MUST expose semantic tokens for the refreshed Resubuild brand palette:

- Primary purple: `#6d49f4`
- Secondary teal: `#00978a`

The primary purple MUST be used for primary CTAs, active navigation, selected tabs, primary focus rings, and high-priority highlights. The secondary teal MUST be used for progress, success/trust cues, secondary accents, and safe status affordances. The UI SHOULD avoid additional dominant accent colors except for semantic warning/error states.

The system MUST retain light, ATS-friendly surfaces:

- near-white app background;
- white cards;
- subtle borders;
- restrained shadows;
- rounded corners;
- near-black text and muted-gray secondary text.

The visual implementation MUST align with the requester-provided reference design image:

```text
583f8df5-e2f5-4076-ada1-b649c459d557.png
```

#### Scenario: Brand tokens are available to shared UI

- **WHEN** shared components render buttons, cards, badges, tabs, navigation items, or focus states
- **THEN** they SHALL use semantic tokens mapped to `#6d49f4` and `#00978a`
- **AND** they SHALL NOT hardcode legacy purple/indigo accents in newly redesigned surfaces

#### Scenario: Secondary actions remain visually quiet

- **WHEN** secondary or destructive actions are available from a list or workspace item
- **THEN** they SHALL be less visually dominant than the primary open/edit/prepare/export action
- **AND** destructive actions SHOULD appear inside a menu or confirmation flow where practical

## ADDED Requirements

### Requirement: The app SHALL provide a reusable Resubuild logo and icon system

The web app MUST provide reusable logo components for:

- full horizontal lockup: icon + `Resubuild` wordmark;
- compact mark for favicon, app icon, sidebar, and small UI contexts;
- accessible text alternative or semantic label.

The logo icon MUST combine a document/CV motif with a rebuild/progress/upward-motion motif and MAY include a subtle AI/spark accent. The logo MUST visually use the purple/teal brand palette.

The app SHOULD provide or standardize a coherent line-icon family for the redesigned surfaces, including import, edit, AI/sparkle, export, shield, lock, check, table/list, CV card, and application/workspace concepts.

#### Scenario: Header and authenticated shell use the same logo system

- **WHEN** the marketing header and authenticated shell render
- **THEN** both SHALL use the shared Resubuild logo component or shared logo asset source
- **AND** compact contexts SHALL use the compact mark rather than duplicating a separate unrelated icon

#### Scenario: Icons follow the reference style

- **WHEN** redesigned cards, buttons, and feature sections render
- **THEN** icons SHALL use the same purple/teal line-icon direction as the supplied reference design
- **AND** SHALL avoid mixing unrelated icon styles within the same surface