## MODIFIED Requirements

### Requirement: CV section navigation SHALL use a left sidebar on desktop and tablet

On viewports at or above the application `md` breakpoint, the CV editor SHALL render section navigation as a vertical list in a fixed left panel with text labels and section icons. The active section's content SHALL occupy the remaining horizontal space to the right. The horizontal wrapping tab strip MUST NOT be the primary navigation pattern on md+ viewports. Authors SHALL be able to collapse the sidebar to icon-only mode and expand it again via an explicit toggle control. The collapse/expand toggle SHALL render in the breadcrumb chrome row (adjacent to the breadcrumb trail), NOT inside the sidebar sticky header.

#### Scenario: Desktop layout shows sidebar and content

- **WHEN** a user opens the CV editor on a viewport at or above the `md` breakpoint
- **THEN** section links SHALL appear in a left sidebar with icons and labels and the selected section's editor content SHALL render in the adjacent main pane

#### Scenario: All sections reachable from sidebar

- **WHEN** a user scans the left sidebar on desktop
- **THEN** links for Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References SHALL be visible without using horizontal tab scrolling

#### Scenario: Sidebar collapses to icons

- **WHEN** a user activates the collapse control in the breadcrumb row on desktop
- **THEN** the sidebar SHALL shrink to icon-only links with accessible labels
- **AND** selecting a section SHALL still update the URL and main content pane

#### Scenario: Toggle lives beside breadcrumb

- **WHEN** a user views any CV editor section
- **THEN** the section-nav toggle button SHALL appear in the same horizontal row as the breadcrumb trail
- **AND** SHALL NOT appear as the first item inside the sidebar sticky column

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL render the same left sidebar navigation rail in icon-only form (not a separate overlay drawer). Section links SHALL remain visible without opening a Sheet or menu overlay. The collapse/expand toggle SHALL remain available in the breadcrumb row and SHALL switch between icon-only and labeled sidebar modes appropriate to viewport width.

#### Scenario: Mobile shows icon sidebar without drawer

- **WHEN** a user opens the CV editor on a viewport below `md`
- **THEN** section navigation SHALL appear as a persistent icon-only left rail
- **AND** a separate Sections drawer overlay MUST NOT be required to reach any section

#### Scenario: Mobile section selection updates content

- **WHEN** a user selects a section from the mobile icon rail
- **THEN** the main pane SHALL show the chosen section's content
- **AND** the URL SHALL reflect the selected section slug

### Requirement: CV editor SHALL expose breadcrumb context above section content

The CV editor SHALL render a breadcrumb trail above the active section content showing, at minimum: a link to the dashboard CV list (`My CVs`), the derived CV title (linking to the Basics route when viewing another section), and the active section name when not on Basics. The section-nav collapse toggle SHALL appear at the start of this chrome row. Section body content below the breadcrumb row SHALL be wrapped in a consistent content container with left padding aligned to the breadcrumb text. Duplicate standalone page headings (`Edit CV`, large derived title above sections) MUST NOT appear alongside the breadcrumb.

#### Scenario: Basics breadcrumb shows title only

- **WHEN** a user views `/dashboard/cv/[id]` on Basics
- **THEN** the breadcrumb SHALL show `My CVs` and the derived CV title as the current page
- **AND** SHALL NOT show a trailing section segment

#### Scenario: Work section breadcrumb shows section

- **WHEN** a user views `/dashboard/cv/[id]/work`
- **THEN** the breadcrumb SHALL show `My CVs`, a link with the CV title pointing to `/dashboard/cv/[id]`, and `Work` as the current page

#### Scenario: Short title on narrow viewports

- **WHEN** the CV has both name and label populated and the viewport is below the `sm` breakpoint
- **THEN** the breadcrumb CV title segment MAY show the name only while wider viewports show the full derived title

#### Scenario: Section content padding

- **WHEN** a user views any section's edit or preview content below the breadcrumb row
- **THEN** the content SHALL be inset with consistent left padding relative to the breadcrumb text baseline

## ADDED Requirements

### Requirement: Wysimark editor shell SHALL use square corners and stable toolbar height

Global styles for `.rich-text-editor` SHALL target the Wysimark shell via direct-child selectors (`> .border`) rather than descendant `.rounded-md.border` chains. The inner editor shell SHALL use square corners (`border-radius: 0`). Block-variant toolbars SHALL use a fixed height of 30px; inline-variant toolbars SHALL use em-based height. Toolbar containers SHALL NOT add extra bottom margin that separates toolbar from content.

#### Scenario: Block editor toolbar height

- **WHEN** a user focuses a block Wysimark field (e.g. Work description)
- **THEN** the toolbar row SHALL render at 30px height without rounded inner corners

#### Scenario: Inline editor compact toolbar

- **WHEN** a user focuses an inline Wysimark field
- **THEN** the toolbar SHALL use em-scaled compact height consistent with inline variant styling
