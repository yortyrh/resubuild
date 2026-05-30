## MODIFIED Requirements

### Requirement: The CV editor chrome SHALL link to print preview

The CV editor shell (`CvEditorChrome` or equivalent shared header) SHALL expose a control (e.g. **Preview** or **View / Print**) that navigates to `/dashboard/cv/[id]/preview` without leaving the authenticated dashboard. The control SHALL be available while editing any section tab. The preview SHALL represent the MIT-formatted export (print/PDF layout), which is distinct from per-tab editor view rows.

The same header region SHALL expose an **Export** control that downloads PDF and JSON via the authenticated export API (`downloadCvPdf`, `downloadCvJson`) without navigating away from the editor. **Export** SHALL appear before **Preview** in reading order. On viewports below the `lg` breakpoint, both controls MAY show icon-only affordances with accessible names (`aria-label`); text labels SHALL appear from `lg` upward. The header row SHALL wrap on small screens so breadcrumb and actions remain usable.

#### Scenario: Navigate to preview from work tab

- **WHEN** a user is on `/dashboard/cv/[id]/work` and activates Preview
- **THEN** the app SHALL navigate to `/dashboard/cv/[id]/preview`

#### Scenario: Return to editor from preview

- **WHEN** a user is on the preview page and chooses Back to editor (or equivalent)
- **THEN** the app SHALL navigate to `/dashboard/cv/[id]` or the last section route

#### Scenario: Export PDF from editor header

- **WHEN** a signed-in user chooses Download PDF from the editor Export menu
- **THEN** the client SHALL call `downloadCvPdf` with the CV id and stored template id
- **AND** SHALL save the response as a file download

#### Scenario: Export JSON from editor header

- **WHEN** a signed-in user chooses Download JSON from the editor Export menu
- **THEN** the client SHALL call `downloadCvJson` with the CV id
- **AND** SHALL save the response as a file download

#### Scenario: Icon-only toolbar on narrow viewports

- **WHEN** the editor header is rendered below the `lg` breakpoint
- **THEN** Export and Preview SHALL remain operable with icon-only visible labels
- **AND** each control SHALL expose an accessible name for screen readers
