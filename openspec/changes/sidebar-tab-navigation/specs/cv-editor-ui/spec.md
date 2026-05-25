## ADDED Requirements

### Requirement: CV section navigation SHALL use a left sidebar on desktop and tablet

On viewports at or above the application `md` breakpoint, the CV editor SHALL render section navigation as a vertical list in a fixed left panel. The active section's content SHALL occupy the remaining horizontal space to the right. The horizontal wrapping tab strip MUST NOT be the primary navigation pattern on md+ viewports.

#### Scenario: Desktop layout shows sidebar and content

- **WHEN** a user opens the CV editor on a viewport at or above the `md` breakpoint
- **THEN** section links SHALL appear in a left sidebar and the selected section's editor content SHALL render in the adjacent main pane

#### Scenario: All sections reachable from sidebar

- **WHEN** a user scans the left sidebar on desktop
- **THEN** links for Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References SHALL be visible without using horizontal tab scrolling

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL hide the fixed left sidebar and SHALL expose an affordance (e.g. menu or **Sections** control) that opens a left-side drawer containing the same section list. Selecting a section SHALL close the drawer and display that section's content in the main pane.

#### Scenario: Mobile drawer opens section list

- **WHEN** a user on a viewport below `md` activates the sections menu control
- **THEN** a left-side drawer SHALL open listing all CV sections

#### Scenario: Mobile section selection closes drawer

- **WHEN** a user selects a section from the mobile drawer
- **THEN** the drawer SHALL close and the main pane SHALL show the chosen section's content

### Requirement: Active CV section SHALL be reflected in the URL path

Section selection SHALL update the browser URL using path segments under `/dashboard/cv/[id]`. The Basics section SHALL be the active section when the URL contains no section segment after the CV id (e.g. `/dashboard/cv/abc`). Each other section SHALL map to a single lowercase slug segment (e.g. `/dashboard/cv/abc/work`, `/dashboard/cv/abc/profiles` for Social profiles).

#### Scenario: Default URL opens Basics

- **WHEN** a user navigates to `/dashboard/cv/[id]` with no trailing section segment
- **THEN** the Basics section SHALL be active and its content SHALL be shown

#### Scenario: Section slug in URL opens matching section

- **WHEN** a user navigates to `/dashboard/cv/[id]/work`
- **THEN** the Work section SHALL be active and its editor content SHALL be shown

#### Scenario: Invalid section slug falls back safely

- **WHEN** a user navigates to `/dashboard/cv/[id]/not-a-real-section`
- **THEN** the application SHALL NOT render a broken editor state and SHALL redirect or otherwise resolve to a safe default (Basics index or not-found) consistent with App Router conventions

### Requirement: Browser reload SHALL restore the selected section from the URL

The CV editor SHALL derive the active section from the current URL on initial load and after a full page reload. Client-only tab state MUST NOT be required to preserve section selection across reloads.

#### Scenario: Reload preserves Work section

- **WHEN** a user is viewing `/dashboard/cv/[id]/work` and reloads the browser
- **THEN** the Work section SHALL remain active without resetting to Basics

#### Scenario: Shared link opens correct section

- **WHEN** a user opens a bookmarked or shared URL `/dashboard/cv/[id]/languages` in a new session
- **THEN** the Languages section SHALL be active after authentication and CV data load complete

### Requirement: Section navigation links SHALL indicate the active section

The navigation list (sidebar and drawer) SHALL visually distinguish the active section and SHALL expose `aria-current="page"` (or equivalent) on the active link for assistive technologies.

#### Scenario: Active item styling in sidebar

- **WHEN** a user views `/dashboard/cv/[id]/education`
- **THEN** the Education navigation link SHALL be styled as active and other section links SHALL appear inactive
