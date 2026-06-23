## MODIFIED Requirements

### Requirement: CV section navigation SHALL use a left sidebar on desktop and tablet

On viewports at or above the application `md` breakpoint, the CV editor SHALL render section navigation as a vertical list inside the global dashboard sidebar's contextual middle group, with text labels and section icons. The active section's content SHALL occupy the remaining horizontal space to the right. Authors SHALL NOT be able to collapse the section nav to icon-only mode because the global sidebar has a fixed width; there SHALL be no section-nav toggle in the breadcrumb chrome row.

#### Scenario: Desktop layout shows sidebar and content

- **WHEN** a user opens the CV editor on a viewport at or above the `md` breakpoint
- **THEN** section links SHALL appear inside the global dashboard sidebar with icons and labels
- **AND** the selected section's editor content SHALL render in the adjacent main pane

#### Scenario: All sections reachable from sidebar

- **WHEN** a user scans the global dashboard sidebar on desktop while editing a CV
- **THEN** links for Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References SHALL be visible without using horizontal tab scrolling

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL NOT render a persistent navigation rail or its own section drawer. Section navigation SHALL be presented inside the global dashboard sidebar Sheet opened from the top-bar hamburger menu. The Sheet SHALL list all sections with icons and text labels, SHALL mark the active section, and SHALL close after a section is selected. While the Sheet is closed, the section content pane SHALL occupy the full available content width.

#### Scenario: Mobile shows dashboard Sheet on demand

- **WHEN** a user opens the CV editor on a viewport below `md` and activates the top-bar menu button
- **THEN** the global dashboard sidebar Sheet SHALL open listing the primary nav, CV sections, and settings

#### Scenario: Mobile section selection updates content and closes Sheet

- **WHEN** a user selects a section from the dashboard sidebar Sheet
- **THEN** the main pane SHALL show the chosen section's content
- **AND** the URL SHALL reflect the selected section slug
- **AND** the Sheet SHALL close

#### Scenario: Content uses full width when Sheet closed

- **WHEN** a user views any CV editor section below `md` with the Sheet closed
- **THEN** no persistent navigation rail SHALL consume horizontal space beside the section content

### Requirement: Section navigation links SHALL indicate the active section

The navigation list in the global dashboard sidebar SHALL visually distinguish the active CV section with icons and labels and SHALL expose `aria-current="page"` on the active link for assistive technologies.

#### Scenario: Active item styling in sidebar

- **WHEN** a user views `/dashboard/cv/[id]/education`
- **THEN** the Education navigation link in the global dashboard sidebar SHALL be styled as active and other section links SHALL appear inactive

#### Scenario: Active item styling in mobile Sheet

- **WHEN** a user opens the dashboard sidebar Sheet below `md` while viewing `/dashboard/cv/[id]/education`
- **THEN** the Education link inside the Sheet SHALL be styled as active and SHALL expose `aria-current="page"`

## REMOVED Requirements

_None_
