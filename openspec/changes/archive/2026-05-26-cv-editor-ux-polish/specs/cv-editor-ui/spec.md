## MODIFIED Requirements

### Requirement: CV section navigation SHALL use a left sidebar on desktop and tablet

On viewports at or above the application `md` breakpoint, the CV editor SHALL render section navigation as a vertical list in a fixed left panel with text labels and section icons. The active section's content SHALL occupy the remaining horizontal space to the right. The horizontal wrapping tab strip MUST NOT be the primary navigation pattern on md+ viewports. Authors SHALL be able to collapse the sidebar to icon-only mode and expand it again via an explicit toggle control.

#### Scenario: Desktop layout shows sidebar and content

- **WHEN** a user opens the CV editor on a viewport at or above the `md` breakpoint
- **THEN** section links SHALL appear in a left sidebar with icons and labels and the selected section's editor content SHALL render in the adjacent main pane

#### Scenario: All sections reachable from sidebar

- **WHEN** a user scans the left sidebar on desktop
- **THEN** links for Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References SHALL be visible without using horizontal tab scrolling

#### Scenario: Sidebar collapses to icons

- **WHEN** a user activates the collapse control on desktop
- **THEN** the sidebar SHALL shrink to icon-only links with accessible labels
- **AND** selecting a section SHALL still update the URL and main content pane

### Requirement: CV section navigation SHALL use a left drawer on mobile

Below the `md` breakpoint, the CV editor SHALL render the same left sidebar navigation rail in icon-only form (not a separate overlay drawer). Section links SHALL remain visible without opening a Sheet or menu overlay. The collapse/expand toggle SHALL remain available and SHALL switch between icon-only and labeled modes appropriate to viewport width.

#### Scenario: Mobile shows icon sidebar without drawer

- **WHEN** a user opens the CV editor on a viewport below `md`
- **THEN** section navigation SHALL appear as a persistent icon-only left rail
- **AND** a separate Sections drawer overlay MUST NOT be required to reach any section

#### Scenario: Mobile section selection updates content

- **WHEN** a user selects a section from the mobile icon rail
- **THEN** the main pane SHALL show the chosen section's content
- **AND** the URL SHALL reflect the selected section slug

### Requirement: Section navigation links SHALL indicate the active section

The navigation list (sidebar at all breakpoints) SHALL visually distinguish the active section with icons and labels (or icon-only with accessible name) and SHALL expose `aria-current="page"` (or equivalent) on the active link for assistive technologies.

#### Scenario: Active item styling in sidebar

- **WHEN** a user views `/dashboard/cv/[id]/education`
- **THEN** the Education navigation link SHALL be styled as active and other section links SHALL appear inactive

### Requirement: View mode SHALL render persisted URL fields as clickable external links

Every JSON Resume `url` field shown in CV editor view mode (resume-preview rows) SHALL be rendered as a clickable hyperlink using the stored value as the destination. The link MUST open in a new browsing context (`target="_blank"`) with `rel="noopener noreferrer"`. Bare hostnames without a scheme (e.g. `linkedin.com/in/user`) SHALL be normalized to HTTPS for navigation. Entity URLs on Work and Volunteer entries SHALL appear in the row subtitle (linked entity name), not as a separate bare URL string in the row body. External links SHALL use a consistent visual affordance (distinct link color and optional external-link icon).

#### Scenario: Social profile URL in preview

- **WHEN** a user views a saved social profile entry with a non-empty URL on the Social profiles tab
- **THEN** the URL SHALL appear as a clickable link that opens the profile destination in a new tab

#### Scenario: Basics website in contact line

- **WHEN** a user views Basics with a non-empty `basics.url` alongside email or phone
- **THEN** the website segment in the contact line under the name SHALL be a clickable link opening in a new tab while other contact segments remain plain text

#### Scenario: Work entry URL in preview

- **WHEN** a user views a saved work entry with a non-empty `url` field and populated company name
- **THEN** the Work tab preview SHALL display the company as a linked subtitle (or title when position is absent)
- **AND** SHALL NOT show the raw URL string as plain text in the row body

#### Scenario: Project URL in preview

- **WHEN** a user views a saved project with a non-empty `url` field
- **THEN** the Projects tab preview SHALL display the URL as a clickable external link

#### Scenario: Publication and certificate URLs in preview

- **WHEN** a user views a saved publication or certificate with a non-empty `url` field
- **THEN** the corresponding tab preview SHALL display the URL as a clickable external link

#### Scenario: Unsafe URL scheme

- **WHEN** a stored URL uses a disallowed scheme such as `javascript:`
- **THEN** the editor view SHALL NOT navigate via script execution and SHALL omit or neutralize the unsafe hyperlink while preserving safe display where possible

### Requirement: CV section tabs SHALL use resume-preview rows for listed entity types

For Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References, the editor SHALL render saved entries using resume-preview row components (bold primary text left, optional subtitle beneath the title when applicable, dates and locations right, bullet lists for highlights and courses preceded by a visible section label such as **Highlights** or **Courses**) instead of always-visible card forms. Work and Volunteer rows SHALL show position in the title and linked company or organization in the subtitle—not concatenated in the title. Skills SHALL show level as subtitle rather than inline `"name: level"` prose. Publications SHALL show publisher as subtitle. Projects supplemental fields (entity, type, roles, keywords) and Interests keywords SHALL use labeled metadata rows rather than inline `"Label: value"` strings. **Basics** view mode SHALL use the same row component but structured location and optional street address MUST render in the contact line under the name—not in the right-aligned meta column—and a profile photo thumbnail MUST appear left of the name/contact block when `basics.image` is set per the Basics profile photo requirements.

#### Scenario: Work section preview layout

- **WHEN** a user views the Work tab with saved entries
- **THEN** each job SHALL show position in the title, linked company in the subtitle when present, date range and location on the right, and highlight bullets beneath the title block under a **Highlights** label

#### Scenario: Skills section preview layout

- **WHEN** a user views the Skills tab
- **THEN** each skill SHALL show name in the title and level as subtitle when present, with keywords rendered as tag pills

#### Scenario: References section preview layout

- **WHEN** a user views the References tab with saved entries
- **THEN** each reference SHALL show the contact name emphasized with the reference text displayed beneath in resume-appropriate prose layout

#### Scenario: Basics location not in meta column

- **WHEN** a user views the Basics tab in view mode with location data saved
- **THEN** location SHALL appear in the contact line under the name
- **AND** SHALL NOT appear in the right-aligned meta slot used by other sections for geography

#### Scenario: Basics profile photo beside name

- **WHEN** a user views the Basics tab in view mode with `basics.image` set
- **THEN** a profile thumbnail SHALL appear to the left of the name and contact line
- **AND** the photo URL SHALL NOT render as plain text in the row body

#### Scenario: Education courses labeled in preview

- **WHEN** a user views the Education tab with saved courses
- **THEN** course bullets SHALL appear under a **Courses** label

### Requirement: Section interactions SHALL follow view, inline edit, bottom create, and confirmed delete patterns

The editor SHALL provide Edit actions on view rows that swap to inline forms until Save or Cancel; Add actions that reveal create forms fixed at the section bottom; and Delete actions gated by a confirmation dialog. Save and Delete SHALL trigger immediate API calls per `cv-item-crud`. Item create and edit forms SHALL use native form submit so pressing Enter in a single-line text field activates Save (subject to in-flight guards).

#### Scenario: Cancel edit restores view

- **WHEN** a user clicks Cancel while editing an education entry
- **THEN** the form SHALL close without calling the update API and the prior view row SHALL reappear unchanged

#### Scenario: Enter submits item save form

- **WHEN** a user edits a work entry form and presses Enter in a single-line text field
- **THEN** the form SHALL submit the Save action (subject to validation and in-flight guard)

## ADDED Requirements

### Requirement: CV editor SHALL expose breadcrumb context above section content

The CV editor SHALL render a breadcrumb trail above the active section content showing, at minimum: a link to the dashboard CV list (`My CVs`), the derived CV title (linking to the Basics route when viewing another section), and the active section name when not on Basics. Duplicate standalone page headings (`Edit CV`, large derived title above sections) MUST NOT appear alongside the breadcrumb.

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

### Requirement: CV editor and dashboard SHALL show skeleton placeholders while loading

While authentication, CV list, CV editor data, or client-only markdown editors are loading, the UI SHALL render skeleton placeholders that approximate final layout (sidebar icons, breadcrumb bars, list cards, form fields, markdown chrome) instead of plain `"Loading…"` text alone.

#### Scenario: Session gate loading

- **WHEN** the dashboard shell is waiting for session validation
- **THEN** a dashboard-shaped skeleton (header + content placeholders) SHALL be shown

#### Scenario: CV list loading

- **WHEN** the dashboard CV list fetch is in progress
- **THEN** skeleton cards matching the CV list grid SHALL be shown

#### Scenario: CV editor loading

- **WHEN** a user navigates to a CV editor route before resume JSON is available
- **THEN** a skeleton matching breadcrumb, sidebar, and section content SHALL be shown

#### Scenario: Markdown editor hydration

- **WHEN** a Wysimark markdown editor chunk is loading on the client
- **THEN** an inline or block skeleton matching the editor variant SHALL occupy the editor region until the editor mounts

### Requirement: String list fields SHALL support keyboard row extension

Non-markdown `StringListField` instances SHALL move focus to a newly added row when the user presses Enter on the last row's input. Enter on non-terminal rows MUST NOT submit the parent form unless the row is the last item and the implementation explicitly adds a new row first.

#### Scenario: Enter adds highlight row

- **WHEN** a user presses Enter in the last plain-text row of a string list inside an item form
- **THEN** a new empty row SHALL be appended
- **AND** focus SHALL move to the new row's input

### Requirement: Project roles SHALL use distinct tag styling in view mode

When Projects view mode renders `roles`, each role tag SHALL use styling visually distinct from keyword tags (e.g. primary-tinted pills) and SHALL appear under a **Roles** metadata label.

#### Scenario: Roles vs keywords styling

- **WHEN** a saved project has both roles and keywords
- **THEN** the view row SHALL show labeled **Roles** and **Keywords** groups
- **AND** role pills SHALL NOT share identical styling with keyword pills
