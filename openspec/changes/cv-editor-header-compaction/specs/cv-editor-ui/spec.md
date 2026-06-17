## MODIFIED Requirements

### Requirement: CV editor SHALL expose breadcrumb context above section content

The CV editor SHALL render a breadcrumb trail above the active section content showing, at minimum: a link to the dashboard CV list (`My CVs`), the derived CV title (linking to the Basics route when viewing another section), and the active section name when not on Basics. The section-nav collapse toggle SHALL appear at the start of this chrome row. Section body content below the breadcrumb row SHALL be wrapped in a consistent content container with left padding aligned to the breadcrumb text. The breadcrumb's terminal `BreadcrumbPage` segment is the single visual heading for the active section; duplicate standalone page headings (`Edit CV`, a separate large `<h1>` rendered below the breadcrumb trail) MUST NOT appear alongside the breadcrumb.

#### Scenario: Basics breadcrumb shows title only

- **WHEN** a user views `/dashboard/cv/[id]` on Basics
- **THEN** the breadcrumb SHALL show `My CVs` and the derived CV title as the current page
- **AND** SHALL NOT show a trailing section segment
- **AND** SHALL NOT render a separate `<h1>` heading beneath the breadcrumb row

#### Scenario: Work section breadcrumb shows section

- **WHEN** a user views `/dashboard/cv/[id]/work`
- **THEN** the breadcrumb SHALL show `My CVs`, a link with the CV title pointing to `/dashboard/cv/[id]`, and `Work` as the current page
- **AND** SHALL NOT render a separate `<h1 data-testid="cv-page-title">` heading beneath the breadcrumb row

#### Scenario: Short title on narrow viewports

- **WHEN** the CV has both name and label populated and the viewport is below the `md` breakpoint
- **THEN** the breadcrumb CV title segment SHALL show the name only while viewports at or above `md` SHALL show the full derived title

#### Scenario: Section content padding

- **WHEN** a user views any section's edit or preview content below the breadcrumb row
- **THEN** the content SHALL be inset with consistent left padding relative to the breadcrumb text baseline

#### Scenario: Preview breadcrumb in application workspace

- **WHEN** a user views the tailored CV preview route from the application workspace
- **THEN** the `CvApplicationEditorBreadcrumb` SHALL render the application label, an `Edit CV` link when navigating back, and the `Preview` current-page segment
- **AND** SHALL NOT render a separate `<h1>` heading beneath the breadcrumb row
