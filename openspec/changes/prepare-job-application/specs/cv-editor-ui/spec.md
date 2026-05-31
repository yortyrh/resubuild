## ADDED Requirements

### Requirement: Application clone editor SHALL preview source Work, Volunteer, and Project entries

When editing an application clone in the workspace, the UI SHALL offer a read-only preview of the corresponding entry from the **source CV** (`sourceCvId`) for Work, Volunteer, and Project sections. Matching SHALL use section type and row order (same index as at clone time). The user SHALL be able to copy summary text or individual highlight strings from the preview into the clone entry using normal editor actions (paste or append to `highlights` via existing PATCH). The source CV SHALL NOT be editable from this view.

#### Scenario: Preview source work entry while editing clone

- **WHEN** a user edits a work item on an application clone
- **THEN** the UI SHALL show the read-only source work entry at the same index from `sourceCvId`

#### Scenario: Copy highlight from source into clone

- **WHEN** a user copies a highlight from the source preview
- **THEN** they SHALL be able to add it to the clone entry's `highlights` array through the standard work editor

#### Scenario: Source preview read-only

- **WHEN** a user views the source preview panel
- **THEN** no mutation SHALL be sent to the source CV

### Requirement: Application workspace SHALL embed standard CV editing for the tailored clone

The Prepare Application workspace SHALL link to or embed the existing section editor for `tailoredCvId`, reusing the same tabs and item CRUD as primary CVs. The shell SHALL indicate the CV is an application clone and show lineage to the source CV when `sourceCvId` is present.

#### Scenario: Edit tailored CV sections from workspace

- **WHEN** a user opens the tailored CV section from an application workspace
- **THEN** the UI SHALL use the same section editors and API helpers as `/dashboard/cv/[id]`

#### Scenario: Clone lineage visible

- **WHEN** a user views an application workspace with a tailored clone
- **THEN** the UI SHALL show that the CV was derived from a base CV and offer promote-to-library when appropriate

### Requirement: Application workspace SHALL include a cover letter panel without AI chat

The workspace layout SHALL include: job summary, selection rationale, Markdown cover letter preview with editable field, copy plain text (for email), optional copy Markdown, letter PDF download, and navigation to tailored CV editing and CV export. The layout SHALL NOT include a chat transcript or AI composer.

#### Scenario: Copy letter for email

- **WHEN** a user clicks copy on the cover letter
- **THEN** the UI SHALL copy plain text suitable for pasting into an email body

#### Scenario: Edit letter manually after generation

- **WHEN** a user edits the cover letter textarea and saves
- **THEN** the UI SHALL persist Markdown via `PATCH /applications/:id` without calling AI
