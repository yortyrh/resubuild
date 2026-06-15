# visual-design-system Specification

## Purpose

Define the accent (brand) color system for the web app, expressed only through semantic CSS-variable tokens in `apps/web/src/app/globals.css`. The accent SHALL flow through shadcn-style components (buttons, focus rings, active navigation, links) without per-component color overrides, and SHALL meet WCAG AA contrast in both light and dark schemes.

## Requirements

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

### Requirement: Marketing-only tokens SHALL be defined as a separate token family

The web app's `globals.css` SHALL define a marketing-only token family, namespaced under `--marketing-*`, that includes:

- `--marketing-paper` — the page background for `/`. Light: pure white. Dark: near-black.
- `--marketing-ink` — body text color. Light: near-black. Dark: near-white.
- `--marketing-rule` — section divider color, a low-alpha tint of the existing accent hue.
- `--marketing-display-font` — the display typeface stack (e.g. `'Instrument Serif', Georgia, serif`).
- `--marketing-mono-font` — the utility typeface stack, reusing the existing `--font-geist-mono`.

These tokens MUST be defined for both light and dark color schemes and MUST meet the same WCAG 2.1 AA contrast guarantees as the existing accent token family (4.5:1 for normal text, 3:1 for non-text UI indicators).

#### Scenario: Marketing tokens resolve in light mode

- **WHEN** the user views the landing page with no dark-mode preference
- **THEN** `--marketing-paper` SHALL resolve to pure white
- **AND** `--marketing-ink` SHALL resolve to a near-black value
- **AND** `--marketing-rule` SHALL resolve to a low-alpha indigo

#### Scenario: Marketing tokens resolve in dark mode

- **WHEN** the user views the landing page with `prefers-color-scheme: dark`
- **THEN** `--marketing-paper` SHALL resolve to a near-black value
- **AND** `--marketing-ink` SHALL resolve to a near-white value
- **AND** `--marketing-rule` SHALL resolve to a low-alpha indigo appropriate for the dark surface

#### Scenario: Marketing ink-on-paper contrast meets WCAG AA

- **WHEN** the landing page renders body text using `--marketing-ink` on `--marketing-paper`
- **THEN** the contrast ratio SHALL be at least 4.5:1 in both light and dark schemes

### Requirement: Marketing tokens SHALL be opt-in and MUST NOT change dashboard or auth surface styling

The `--marketing-*` token family MUST be used only inside the marketing route group (`(marketing)/`) and MUST NOT bleed into the dashboard, editor, auth pages, or the root `body` styles. The root `body` background and foreground MUST continue to use `--background` and `--foreground`; the marketing tokens override them only within the marketing layout.

#### Scenario: Dashboard chrome is unchanged

- **WHEN** a signed-in user navigates to `/dashboard`
- **THEN** the dashboard background SHALL be `--background`, not `--marketing-paper`
- **AND** no `--marketing-*` token SHALL appear in the computed styles of the dashboard chrome

#### Scenario: Auth pages are unchanged

- **WHEN** a user navigates to `/login`, `/register`, or `/forgot-password`
- **THEN** those pages SHALL continue to render with the existing auth styling
- **AND** SHALL NOT consume the `--marketing-*` token family

### Requirement: The marketing route group SHALL define a Finley-inspired `--landing-*` token family

The marketing route group (`apps/web/src/app/(marketing)/`) SHALL define a Finley-inspired token family in `globals.css`, namespaced under `--landing-*`, including:

- `--landing-primary-500`, `--landing-primary-600` — purple accent for buttons and highlights.
- `--landing-accent-500` — teal accent for gradients.
- `--landing-paper`, `--landing-ink`, `--landing-muted`, `--landing-border`, `--landing-surface` — neutrals for marketing chrome.
- `--landing-gradient-text`, `--landing-gradient-brand`, `--landing-gradient-step` — linear gradients for headlines, CTAs, and step circles.

Marketing utility classes (e.g. `landing-btn-primary`, `landing-feature-card`, `landing-section-title`, `landing-grid-bg`) MUST consume these tokens and MUST be scoped to marketing pages only. New marketing components MUST prefer `--landing-*` over `--marketing-*` where both exist.

#### Scenario: Marketing tokens apply on the landing page

- **WHEN** an anonymous visitor loads `/`
- **THEN** the page background SHALL use `--landing-paper` via `landing-page` / `landing-grid-bg` classes
- **AND** primary buttons SHALL use `--landing-gradient-brand` or equivalent Finley purple styling

#### Scenario: Marketing tokens do not bleed into the dashboard

- **WHEN** a signed-in user views `/dashboard`
- **THEN** the dashboard background SHALL remain `--background`
- **AND** `--landing-*` tokens MUST NOT appear in dashboard computed styles

#### Scenario: Landing tokens drive feature illustration cards

- **WHEN** the `/features` page renders a `FeatureCard`
- **THEN** the illustration frame SHALL use `--landing-border`, `--landing-paper`, and `--landing-surface`
- **AND** hover states SHALL use `--landing-primary-500` tints consistent with `landing-feature-card` on `/`
