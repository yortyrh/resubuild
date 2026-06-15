# visual-design-system Specification (delta)

## Purpose

Extend the visual design system with a small, marketing-only set of semantic tokens that layer on top of the existing accent palette. The marketing tokens MUST NOT alter the existing shadcn-style component styling or the existing accent contrast guarantees; they exist solely to give the public landing page a paper-and-ink visual identity derived from the printed CV document.

## ADDED Requirements

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
