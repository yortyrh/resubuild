## ADDED Requirements

### Requirement: Application workspace header SHALL render company as the heading and position as a muted subtitle

The `ApplicationWorkspace` page header at `/dashboard/applications/[id]` SHALL render the company (`data.jobCompany`) as the primary heading (`<h1>`) and the position (`data.jobTitle`) as a muted subtitle `<p>` (`text-muted-foreground`) directly beneath the heading inside the same flex slot that hosts the Update button. The heading SHALL fall back to the literal text `Application` when `jobCompany` is missing or whitespace-only. The subtitle `<p>` SHALL be omitted entirely when `jobTitle` is missing or whitespace-only. The heading and subtitle SHALL both apply `truncate` so long values collapse to an ellipsis inside the heading row instead of pushing the Update button onto a second line.

#### Scenario: Heading shows the company and subtitle shows the position

- **WHEN** a signed-in user opens `/dashboard/applications/[id]` for a `ready` application with `jobCompany` "Acme" and `jobTitle` "Senior Engineer"
- **THEN** the workspace header SHALL render an `<h1>` containing "Acme"
- **AND** SHALL render a `<p class="text-muted-foreground">` containing "Senior Engineer" directly beneath the `<h1>`
- **AND** the `<h1>` and the `<p>` SHALL share the same parent row as the Update button

#### Scenario: Heading falls back to "Application" when the company is missing

- **WHEN** a signed-in user opens `/dashboard/applications/[id]` for a `ready` application with `jobCompany` missing or whitespace-only and `jobTitle` "Senior Engineer"
- **THEN** the workspace header `<h1>` SHALL contain the literal text "Application"
- **AND** the muted subtitle `<p>` SHALL contain "Senior Engineer"

#### Scenario: Subtitle is omitted when the position is missing

- **WHEN** a signed-in user opens `/dashboard/applications/[id]` for a `ready` application with `jobCompany` "Acme" and `jobTitle` missing or whitespace-only
- **THEN** the workspace header `<h1>` SHALL contain "Acme"
- **AND** the muted subtitle `<p>` SHALL NOT be rendered

#### Scenario: Long heading values truncate instead of pushing the Update button

- **WHEN** the company value is long enough to overflow the heading row at the current viewport width
- **THEN** the `<h1>` SHALL truncate with an ellipsis
- **AND** the Update button SHALL remain on the same row as the heading slot
