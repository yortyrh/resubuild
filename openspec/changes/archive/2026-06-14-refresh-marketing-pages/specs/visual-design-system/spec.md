## MODIFIED Requirements

### Requirement: The web app SHALL define marketing-only design tokens for the landing surface

The marketing route group (`apps/web/src/app/(marketing)/`) SHALL define a Finley-inspired token family in `globals.css`, namespaced under `--landing-*`, including:

- `--landing-primary-500`, `--landing-primary-600` — purple accent for buttons and highlights.
- `--landing-accent-500` — teal accent for gradients.
- `--landing-paper`, `--landing-ink`, `--landing-muted`, `--landing-border`, `--landing-surface` — neutrals for marketing chrome.
- `--landing-gradient-text`, `--landing-gradient-brand`, `--landing-gradient-step` — linear gradients for headlines, CTAs, and step circles.

Marketing utility classes (e.g. `landing-btn-primary`, `landing-feature-card`, `landing-section-title`, `landing-grid-bg`) MUST consume these tokens and MUST be scoped to marketing pages only.

#### Scenario: Marketing tokens apply on the landing page

- **WHEN** an anonymous visitor loads `/`
- **THEN** the page background SHALL use `--landing-paper` via `landing-page` / `landing-grid-bg` classes
- **AND** primary buttons SHALL use `--landing-gradient-brand` or equivalent Finley purple styling

#### Scenario: Marketing tokens do not bleed into the dashboard

- **WHEN** a signed-in user views `/dashboard`
- **THEN** the dashboard background SHALL remain `--background`
- **AND** `--landing-*` tokens MUST NOT appear in dashboard computed styles

### Requirement: The web app's `globals.css` SHALL define a marketing-only token family, namespaced under `--marketing-*`, that includes:

The existing `--marketing-*` requirement remains for backward compatibility in `openspec/specs/visual-design-system/spec.md`. The refreshed marketing implementation ALSO defines the parallel `--landing-*` Finley palette in `(marketing)/globals.css` as the active token set for `/` and `/features`. New marketing components MUST prefer `--landing-*` tokens.

#### Scenario: Landing tokens drive feature illustration cards

- **WHEN** the `/features` page renders a `FeatureCard`
- **THEN** the illustration frame SHALL use `--landing-border`, `--landing-paper`, and `--landing-surface`
- **AND** hover states SHALL use `--landing-primary-500` tints consistent with `landing-feature-card` on `/`
