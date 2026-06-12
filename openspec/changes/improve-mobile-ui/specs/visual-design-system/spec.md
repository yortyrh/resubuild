# visual-design-system Specification (delta)

## ADDED Requirements

### Requirement: The web app SHALL define an accent color palette through semantic CSS-variable tokens

The design tokens in `apps/web/src/app/globals.css` SHALL define a saturated accent (brand) hue for both light and dark color schemes, replacing the near-black/near-white values currently assigned to `--primary` and `--ring`. The accent SHALL be expressed only through the existing semantic token layer (e.g. `--primary`, `--primary-foreground`, `--ring`, active/selected state tokens) so that shadcn-style components inherit it without per-component color overrides. The destructive token family SHALL remain red and unchanged.

#### Scenario: Primary button shows accent color

- **WHEN** a user views any default-variant primary button (e.g. Sign in, New CV)
- **THEN** the button background SHALL use the accent hue, not a gray/black tone
- **AND** the same component SHALL show a scheme-appropriate accent in dark mode without additional component code

#### Scenario: Focus ring uses accent

- **WHEN** a user keyboard-focuses an input or button
- **THEN** the visible focus ring SHALL use the accent hue

### Requirement: Accent application SHALL cover interactive and state-bearing elements consistently

The accent palette SHALL be applied to: primary action buttons, active navigation states (dashboard header links, CV section nav active item), selected tabs/segments, links (including markdown-rendered links, which SHALL align to the accent hue family), and progress/loading indicators where colored. Plain content surfaces (cards, backgrounds, body text) SHALL remain neutral so the accent provides hierarchy rather than saturation everywhere.

#### Scenario: Active section nav item

- **WHEN** a user views the CV editor with a section selected
- **THEN** the active section link SHALL be visually distinguished using the accent palette (background tint and/or text color), not a flat gray

#### Scenario: Markdown links match accent family

- **WHEN** view mode renders a markdown link in a CV section
- **THEN** the link color SHALL come from the accent hue family in both light and dark schemes

### Requirement: All accent token pairs MUST meet WCAG AA contrast in both schemes

Every foreground/background pairing introduced or modified by the accent palette (e.g. `--primary-foreground` on `--primary`, accent text on neutral surfaces, focus ring against adjacent surfaces) MUST meet WCAG 2.1 AA contrast: at least 4.5:1 for normal text and 3:1 for large text and non-text UI indicators, verified in both light and dark schemes.

#### Scenario: Button text contrast

- **WHEN** the accent primary button renders its label in light or dark mode
- **THEN** the label-to-background contrast ratio SHALL be at least 4.5:1

#### Scenario: Accent link on neutral background

- **WHEN** an accent-colored link renders on the default page background in either scheme
- **THEN** the contrast ratio SHALL be at least 4.5:1
