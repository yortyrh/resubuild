## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The authenticated web app MUST add a dashboard landing surface for signed-in users and MUST organize the authenticated shell around these primary areas:

- `Dashboard`
- `My CVs`
- `Applications`
- `Templates`
- `Settings`

The authenticated shell MUST use the refreshed Resubuild logo system and the purple/teal brand tokens. It MUST expose exactly one dominant contextual primary action per route group:

- Dashboard: `Prepare application` as primary and `Import CV` as secondary.
- My CVs: `Import CV` as primary.
- Applications: `Prepare application` as primary.
- Application workspace: `Regenerate` and export actions, with only one visually dominant primary at a time.

The dashboard landing surface MUST show a welcome header, key stats, recent CVs, recent applications, and AI recommendations. It MUST render defensively when any data source is empty, loading, or unavailable.

#### Scenario: Signed-in user lands on authenticated dashboard

- **WHEN** a signed-in user navigates to `/dashboard`
- **THEN** the app SHALL render a dashboard landing surface rather than an empty redirect-only shell
- **AND** SHALL show cards for CV count, application count, last export, and average match score when data is available
- **AND** SHALL show recent CVs, recent applications, and AI recommendations or empty states

#### Scenario: Authenticated navigation exposes product areas

- **WHEN** the authenticated shell renders
- **THEN** the primary navigation SHALL include Dashboard, My CVs, Applications, Templates, and Settings
- **AND** the active route SHALL use a soft selected state from the purple/teal design tokens

#### Scenario: Authenticated shell keeps one primary action

- **WHEN** the user views Dashboard, My CVs, Applications, Application workspace, or CV preview/export
- **THEN** only one action SHALL be visually styled as the dominant primary CTA in the immediate page header
- **AND** secondary actions SHALL use secondary/ghost/menu treatments

### Requirement: The web app SHALL expose redesigned CV and application management surfaces

The CV list, application list, application workspace, prepare application flow, CV editor, and preview/export screens MUST follow the refreshed card, badge, button, and empty-state system. Destructive actions SHALL be secondary and hidden behind menus or confirmation flows unless the user is already in a delete confirmation context.

#### Scenario: Empty states guide the next action

- **WHEN** the user has no CVs
- **THEN** the My CVs view SHALL show an empty state with `Import CV` and `Create CV` actions

- **WHEN** the user has no applications
- **THEN** the Applications view SHALL show an empty state explaining that a job posting plus base CV produces a tailored CV and cover letter
- **AND** SHALL expose a `Prepare application` CTA
