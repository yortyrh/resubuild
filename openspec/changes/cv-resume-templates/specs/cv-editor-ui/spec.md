## ADDED Requirements

### Requirement: The CV preview page SHALL include a template selector

The preview route SHALL expose a template picker (dropdown or grouped list) populated from `GET /cv/export/templates`. Labels SHALL reflect CAPD sample names where applicable. Changing selection SHALL update the preview by refetching API HTML, not by switching client-side layout components.

#### Scenario: Template list loads on preview mount

- **WHEN** the preview page loads
- **THEN** the client SHALL fetch the template catalog
- **AND** SHALL show the CV's current template as selected

#### Scenario: Template change updates preview

- **WHEN** the user selects `capd-global` from the picker
- **THEN** the preview SHALL refetch HTML with that template id
- **AND** SHALL NOT mount a React component that renders resume sections for export layout

### Requirement: The CV editor chrome SHALL link to print preview

The CV editor shell (`CvEditorChrome` or equivalent shared header) SHALL expose a control (e.g. **Preview** or **View / Print**) that navigates to `/dashboard/cv/[id]/preview` without leaving the authenticated dashboard. The control SHALL be available while editing any section tab. The preview SHALL represent the **API export template** (print/PDF layout), which is distinct from per-tab editor view rows. Template selection happens on the preview page, not in section tabs.

#### Scenario: Navigate to preview from work tab

- **WHEN** a user is on `/dashboard/cv/[id]/work` and activates Preview
- **THEN** the app SHALL navigate to `/dashboard/cv/[id]/preview`

#### Scenario: Return to editor from preview

- **WHEN** a user is on the preview page and chooses Back to editor (or equivalent)
- **THEN** the app SHALL navigate to `/dashboard/cv/[id]` or the last section route
