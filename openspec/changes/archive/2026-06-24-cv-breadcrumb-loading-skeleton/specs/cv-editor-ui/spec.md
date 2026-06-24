## MODIFIED Requirements

### Requirement: CV editor and dashboard SHALL show skeleton placeholders while loading

While authentication, CV list, CV editor data, or client-only markdown editors are loading, the UI SHALL render skeleton placeholders that approximate final layout (sidebar icons, breadcrumb bars, list cards, form fields, markdown chrome) instead of plain `"Loading…"` text alone. When the CV editor chrome is mounted and the resume JSON is still being fetched, the dashboard top-bar breadcrumb SHALL render a `Skeleton` placeholder for the CV title segment (matching the width and `aria-hidden` pattern of the existing breadcrumb skeleton used in the page-level loading state) instead of the muted `Untitled CV` text. Once the resume JSON resolves, a CV whose `basics.name` and `basics.label` are both empty SHALL still render the muted `Untitled CV` text so the loaded-but-empty placeholder remains visible.

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

- **WHEN** a markdown editor chunk is loading on the client
- **THEN** an inline or block skeleton matching the editor variant SHALL occupy the editor region until the editor mounts

#### Scenario: Breadcrumb title shows skeleton while CV is loading

- **WHEN** the CV editor chrome is mounted and the resume JSON fetch has not yet resolved (so the chrome passes `basics: null` to the breadcrumb context)
- **THEN** the dashboard top-bar breadcrumb SHALL render a `Skeleton` placeholder (`[data-slot="skeleton"]`, `aria-hidden="true"`, matching the breadcrumb title width) for the CV title segment
- **AND** SHALL NOT render the literal text `Untitled CV` in the breadcrumb

#### Scenario: Breadcrumb keeps muted Untitled CV when basics are loaded but empty

- **WHEN** the resume JSON has resolved and `basics.name` and `basics.label` are both empty
- **THEN** the dashboard top-bar breadcrumb SHALL render the muted `Untitled CV` text as the CV title segment
- **AND** SHALL NOT render a `Skeleton` placeholder for that segment
