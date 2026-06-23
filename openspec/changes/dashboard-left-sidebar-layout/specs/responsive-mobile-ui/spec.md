## MODIFIED Requirements

### Requirement: Core pages SHALL render without horizontal overflow at 375px viewport width

The login, register, dashboard (My CVs), Applications, CV editor (every section), and CV preview pages SHALL render without horizontal scrolling or clipped interactive controls on viewports 375px wide and up. Flex/grid containers SHALL use wrapping, stacking, or `min-w-0` rules rather than relying on fixed widths that exceed the viewport.

#### Scenario: No horizontal scroll on dashboard

- **WHEN** a user opens `/dashboard` on a 375px-wide viewport
- **THEN** the document SHALL NOT overflow horizontally
- **AND** the mobile top-bar menu button and the primary page action (e.g. "New CV") SHALL be fully visible and tappable
- **AND** opening the mobile sidebar Sheet SHALL NOT cause horizontal overflow

### Requirement: Dashboard header SHALL fit a 375px viewport on a single row

The dashboard chrome SHALL present a slim top bar on mobile viewports (below `md`) containing the brand wordmark and a menu toggle. On desktop (at or above `md`) the brand and navigation SHALL live inside the persistent left sidebar, not in a horizontal header row.

#### Scenario: Header intact on small phone

- **WHEN** a user views any dashboard page at 375px width
- **THEN** a slim top bar SHALL show the brand and a tappable "Open menu" button
- **AND** the persistent sidebar SHALL be hidden
- **AND** activating the menu button SHALL open the sidebar Sheet

## REMOVED Requirements

_None_
