## MODIFIED Requirements

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
