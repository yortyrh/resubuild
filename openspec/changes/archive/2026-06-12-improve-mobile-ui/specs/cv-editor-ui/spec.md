# cv-editor-ui Specification (delta)

## MODIFIED Requirements

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL NOT render a persistent navigation rail. Section navigation SHALL be presented in an off-canvas left drawer (Sheet overlay) opened from the section-nav toggle button in the breadcrumb row. The drawer SHALL list all sections with icons and text labels, SHALL mark the active section, and SHALL close after a section is selected. While the drawer is closed, the section content pane SHALL occupy the full available content width.

#### Scenario: Mobile shows drawer on demand

- **WHEN** a user opens the CV editor on a viewport below `md` and activates the section-nav toggle in the breadcrumb row
- **THEN** a left drawer overlay SHALL open listing Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References with icons and labels

#### Scenario: Mobile section selection updates content and closes drawer

- **WHEN** a user selects a section from the mobile drawer
- **THEN** the main pane SHALL show the chosen section's content
- **AND** the URL SHALL reflect the selected section slug
- **AND** the drawer SHALL close

#### Scenario: Content uses full width when drawer closed

- **WHEN** a user views any CV editor section below `md` with the drawer closed
- **THEN** no navigation rail SHALL consume horizontal space beside the section content

### Requirement: Section navigation links SHALL indicate the active section

The navigation list (sidebar on `md+` viewports, drawer below `md`) SHALL visually distinguish the active section with icons and labels (or icon-only with accessible name) and SHALL expose `aria-current="page"` (or equivalent) on the active link for assistive technologies.

#### Scenario: Active item styling in sidebar

- **WHEN** a user views `/dashboard/cv/[id]/education`
- **THEN** the Education navigation link SHALL be styled as active and other section links SHALL appear inactive

#### Scenario: Active item styling in mobile drawer

- **WHEN** a user opens the section drawer below `md` while viewing `/dashboard/cv/[id]/education`
- **THEN** the Education link inside the drawer SHALL be styled as active and SHALL expose `aria-current="page"`

### Requirement: Basics view mode SHALL display profile photo beside identity block

When `basics.image` is set, Basics view mode SHALL render a profile photo thumbnail to the **left** of the name/label and contact line within the row title area on viewports at or above the `sm` breakpoint. Below the `sm` breakpoint, the photo SHALL stack above the identity block (photo first, then name/label and contact at full row width) so that contact details are not squeezed into a narrow column. The raw photo URL MUST NOT appear as body text below the summary. For owned API media URLs, the thumbnail `<img>` src SHALL be the public thumbnail URL (`/media/{id}/thumbnail`), not the full display URL. The crop dialog and persisted `basics.image` SHALL continue to use the full `/media/{id}` URL.

#### Scenario: Photo shown with name and contact

- **WHEN** a user views Basics at or above the `sm` breakpoint with `basics.image` pointing at owned media and the thumbnail loads successfully
- **THEN** a preview at most 150×150 CSS pixels (aspect ratio preserved) SHALL appear left of the name (`text-xl`) and contact paragraph
- **AND** the image request SHALL target the thumbnail endpoint, not the full media stream

#### Scenario: Photo stacks above identity on mobile

- **WHEN** a user views Basics below the `sm` breakpoint with `basics.image` set
- **THEN** the photo SHALL render above the name/label block
- **AND** the name, label, and contact line SHALL use the full row width below it
- **AND** the summary SHALL render at full row width

#### Scenario: No photo configured

- **WHEN** a user views Basics with no `basics.image`
- **THEN** no thumbnail SHALL render
- **AND** an upload affordance SHALL remain available in view mode

#### Scenario: External image URL

- **WHEN** `basics.image` is an external URL (not owned API media)
- **THEN** the thumbnail MAY use that URL directly with the same max 150×150 display constraint
- **AND** no thumbnail endpoint is required
