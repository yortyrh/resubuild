## ADDED Requirements

### Requirement: The CV editor chrome SHALL link to print preview

The CV editor shell (`CvEditorChrome` or equivalent shared header) SHALL expose a control (e.g. **Preview** or **View / Print**) that navigates to `/dashboard/cv/[id]/preview` without leaving the authenticated dashboard. The control SHALL be available while editing any section tab. The preview SHALL represent the MIT-formatted export (print/PDF layout), which is distinct from per-tab editor view rows.

#### Scenario: Navigate to preview from work tab

- **WHEN** a user is on `/dashboard/cv/[id]/work` and activates Preview
- **THEN** the app SHALL navigate to `/dashboard/cv/[id]/preview`

#### Scenario: Return to editor from preview

- **WHEN** a user is on the preview page and chooses Back to editor (or equivalent)
- **THEN** the app SHALL navigate to `/dashboard/cv/[id]` or the last section route

### Requirement: Preview navigation SHALL NOT replace section editing as the default CV experience

Opening a CV from the dashboard list SHALL continue to land on the section editor (e.g. basics or default section), not the preview route, unless the user explicitly chooses preview.

#### Scenario: Dashboard open CV

- **WHEN** a user opens a CV from the dashboard list
- **THEN** the default route SHALL remain the editor, not `/preview`
