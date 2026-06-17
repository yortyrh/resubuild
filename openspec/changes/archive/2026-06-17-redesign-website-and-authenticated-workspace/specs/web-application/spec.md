## MODIFIED Requirements

### Requirement: The SPA SHALL preserve workflows while adding an optional dashboard

The authenticated web app MAY add a dashboard landing surface. The dashboard MUST be
additive and MUST NOT replace the `My CVs` destination behavior.

The authenticated shell MUST use the refreshed Resubuild logo system and the purple/teal
brand tokens. It SHOULD expose the existing primary areas clearly:

- `Dashboard`, if implemented;
- `My CVs`;
- `Applications`;
- other existing areas only when already supported.

If `/dashboard` currently opens the CV list, existing links whose intent is to open the CV
list MUST be moved to the repo’s CV-list route before `/dashboard` becomes the dashboard.
The `My CVs` navigation item MUST always land on the CV list.

The dashboard MAY show recent CVs, recent applications, simple counts, and existing CTAs
using existing data. It MUST NOT require average match score, AI recommendations,
missing-keyword analysis, or new metadata.

#### Scenario: Signed-in user opens dashboard

- **WHEN** a signed-in user navigates to the dashboard route
- **THEN** the app SHALL render a lightweight dashboard with recent CVs and recent
  applications when data is available
- **AND** SHALL link to existing CV and application workflows

#### Scenario: My CVs navigation opens CV list

- **WHEN** the authenticated shell renders
- **THEN** the `My CVs` navigation item SHALL navigate to the CV list
- **AND** SHALL NOT navigate to the dashboard landing surface

### Requirement: The app SHALL redesign management surfaces with existing data

The CV list, application list, application workspace, prepare application page, CV editor,
and preview/export screens MUST follow the refreshed card, badge, button, icon, and
empty-state system.

The CV list SHOULD present CVs as thumbnail cards or a card/list hybrid. Thumbnail
rendering MUST be non-blocking and MUST fall back to a placeholder when unavailable.

The Applications view SHOULD present applications as a table or card/table hybrid using
existing fields only.

Secondary and delete actions SHALL be visually quieter than the primary
open/edit/prepare actions.

#### Scenario: My CVs shows thumbnail cards

- **WHEN** the user opens My CVs
- **THEN** the page SHALL show CVs as polished cards or a grid/list with thumbnails or
  placeholders
- **AND** existing open/edit/preview/export actions SHALL remain available

#### Scenario: Applications show table-like scanability

- **WHEN** the user opens Applications
- **THEN** the page SHALL show existing applications in a table or card/table view
- **AND** role and company SHALL be easy to scan

#### Scenario: Empty states guide existing next actions

- **WHEN** the user has no CVs
- **THEN** the My CVs view SHALL show an empty state with existing Import/Create CV actions

- **WHEN** the user has no applications
- **THEN** the Applications view SHALL show an empty state with the existing Prepare
  application CTA
