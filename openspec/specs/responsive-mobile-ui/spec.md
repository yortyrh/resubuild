# responsive-mobile-ui Specification

## Purpose

Define the responsive behavior of core web-app pages and chrome on small viewports. The web app SHALL remain usable at 375px width (no horizontal overflow, no clipped controls) and SHALL use shared responsive patterns for header actions, auth shell centering, and dashboard chrome.

## Requirements

### Requirement: Core pages SHALL render without horizontal overflow at 375px viewport width

The login, register, dashboard (My CVs), Applications, CV editor (every section), and CV preview pages SHALL render without horizontal scrolling or clipped interactive controls on viewports 375px wide and up. Flex/grid containers SHALL use wrapping, stacking, or `min-w-0` rules rather than relying on fixed widths that exceed the viewport.

#### Scenario: No horizontal scroll on dashboard

- **WHEN** a user opens `/dashboard` on a 375px-wide viewport
- **THEN** the document SHALL NOT overflow horizontally
- **AND** all header navigation items and the primary action button SHALL be fully visible and tappable

#### Scenario: CV editor section content uses full width on mobile

- **WHEN** a user opens any CV editor section on a viewport below the `md` breakpoint
- **THEN** the section content pane SHALL span the full available content width with no persistent navigation rail consuming horizontal space

### Requirement: Auth pages SHALL center their card on mobile without a top dead band

The auth page shell (login, register, forgot/reset password) SHALL vertically center the auth card within the dynamic viewport height (`dvh`-based, with a static fallback) using balanced top/bottom padding. On viewports below the `sm` breakpoint the card SHALL use reduced padding, and the page title/subtitle SHALL use concise copy that fits two lines or fewer at 375px width.

#### Scenario: Login card centered on a phone

- **WHEN** a user opens `/login` on a 375×667 viewport
- **THEN** the auth card SHALL appear vertically centered with no large empty band above it
- **AND** the title and subtitle SHALL each fit without awkward wrapping

#### Scenario: Short viewport remains scrollable

- **WHEN** the viewport is shorter than the auth card (e.g. landscape phone)
- **THEN** the page SHALL scroll naturally and no card content SHALL be clipped

### Requirement: Primary header actions SHALL collapse to icon-only buttons below the sm breakpoint

The "New CV" action on the My CVs page, the "Prepare application" action on the Applications page, the CV preview toolbar actions (Back, Layout, Print, JSON, PDF), and the CV editor header actions (Export, Preview) SHALL follow a shared two-threshold pattern: the actions SHALL render icon-only buttons below the `lg` breakpoint and icon-plus-label buttons at `lg` and above. Each icon-only button SHALL expose its full label to assistive technologies via `aria-label` or visually hidden text. The CV editor's Export and Preview actions SHALL keep their visible labels hidden until the `lg` threshold so the editor header row stays intact on common laptop widths.

#### Scenario: New CV button on mobile

- **WHEN** a user views `/dashboard` below the `sm` breakpoint
- **THEN** the New CV trigger SHALL show an icon without visible text
- **AND** its accessible name SHALL still be "New CV" (or equivalent)

#### Scenario: Labels return on larger screens

- **WHEN** a user views the same page at or above the `lg` breakpoint
- **THEN** the action buttons SHALL display their text labels alongside icons
- **AND** viewports between `sm` and `lg` (inclusive) SHALL render the actions icon-only

#### Scenario: CV editor header stays intact at md

- **WHEN** a user views the CV editor on a viewport between `sm` and `lg`
- **THEN** Export and Preview SHALL render as icon-only buttons with their accessible names preserved
- **AND** the breadcrumb row SHALL remain on a single line without wrapping

#### Scenario: Preview toolbar threshold aligned

- **WHEN** a user views the CV preview toolbar between the `sm` and `lg` breakpoints
- **THEN** toolbar buttons SHALL display text labels (no longer hidden until `lg`)

### Requirement: Dashboard header SHALL fit a 375px viewport on a single row

The dashboard header (brand wordmark, My CVs link, Applications link, user menu) SHALL fit on one row at 375px width without wrapping, truncation of link labels, or overlapping the user menu. Spacing and font sizes MAY compress below the `sm` breakpoint to achieve this.

#### Scenario: Header intact on small phone

- **WHEN** a user views any dashboard page at 375px width
- **THEN** the brand, both navigation links, and the user menu SHALL be visible on one row and individually tappable
