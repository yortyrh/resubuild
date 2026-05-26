## ADDED Requirements

### Requirement: CV editor shell SHALL remain horizontally stable when section content height varies

The CV editor layout (section sidebar, breadcrumb row, and main content pane) SHALL NOT shift horizontally when navigating between sections whose content does or does not require vertical page scrolling. Horizontal position of `#cv-section-nav` and adjacent content SHALL remain consistent across all CV section routes at a given viewport width.

#### Scenario: Navigating from short section to tall section

- **WHEN** a user on desktop (md+ viewport) navigates from Basics to Work (or any section with content taller than the viewport)
- **THEN** the left edge of the section sidebar and nav links SHALL NOT change horizontal position relative to the viewport

#### Scenario: Navigating from tall section to short section

- **WHEN** a user navigates from Work to Awards (or any section that fits within the viewport without scrolling)
- **THEN** the left edge of the section sidebar and nav links SHALL NOT change horizontal position relative to the viewport

#### Scenario: All sections maintain stable nav position

- **WHEN** a user sequentially visits Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, and References
- **THEN** `#cv-section-nav` bounding box `left` coordinate SHALL remain within 1px across all sections at the same viewport size
