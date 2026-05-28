## ADDED Requirements

### Requirement: Work, volunteer, and project editors SHALL support active and inactive highlight toggles

When editing a CV that supports application tailoring (including application clones), highlight bullets SHALL be editable with an explicit active/inactive state. Inactive bullets SHALL be stored in `inactiveHighlights` and SHALL NOT render in CV preview or export. Active bullets SHALL remain in `highlights`. Users SHALL reactivate inactive bullets without retyping text.

#### Scenario: Deactivate highlight in editor

- **WHEN** a user marks a work highlight as inactive in the editor
- **THEN** the client SHALL persist the string in `inactiveHighlights` and remove it from `highlights`

#### Scenario: Inactive highlights hidden in preview

- **WHEN** a user previews or exports a CV with inactive highlights
- **THEN** only active `highlights` SHALL appear in the rendered document

### Requirement: Application workspace SHALL embed standard CV editing for the tailored clone

The Prepare Application workspace SHALL link to or embed the existing section editor for `tailoredCvId`, reusing the same tabs and item CRUD as primary CVs. The shell SHALL indicate the CV is an application clone and show lineage to the source CV when `sourceCvId` is present.

#### Scenario: Edit tailored CV sections from workspace

- **WHEN** a user opens the tailored CV section from an application workspace
- **THEN** the UI SHALL use the same section editors and API helpers as `/dashboard/cv/[id]`

#### Scenario: Clone lineage visible

- **WHEN** a user views an application workspace with a tailored clone
- **THEN** the UI SHALL show that the CV was derived from a base CV and offer promote-to-library when appropriate

### Requirement: Application workspace SHALL include chat and letter panels

The workspace layout SHALL include: job summary, presentation letter preview with copy action, chat transcript with composer, and navigation to tailored CV editing and exports (CV PDF via existing preview/export routes, letter PDF via application export routes).

#### Scenario: Chat composer sends message

- **WHEN** a user submits a chat message in the workspace
- **THEN** the UI SHALL call the application chat API, show a loading state, and append the assistant reply to the transcript

#### Scenario: Realtime appends new messages

- **WHEN** Supabase Realtime is available and a new message row is inserted for the open application
- **THEN** the chat transcript SHALL update without requiring a full page reload
