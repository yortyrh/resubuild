## ADDED Requirements

### Requirement: The application workspace editor MUST render the saved cover letter Markdown on load

The application workspace at `/dashboard/applications/[id]` MUST display the application's saved `cover_letter` Markdown in the cover-letter rich-text editor's visible region when a signed-in user opens a `ready` application. The editor MUST NOT show the empty "Cover letter markdown…" placeholder when `cover_letter` is non-empty Markdown so the user can review and edit the letter directly on the workspace page.

The Copy, Print, and PDF actions continue to render the
letter via the server-side letter HTML / PDF endpoints
(unchanged from the existing requirement); this
requirement only governs the on-screen editor. The
workspace loads `cover_letter` from a `GET
/applications/:id` query and MAY mount the editor before
the data resolves. When the data resolves, the editor's
imperative `setMarkdown` ref (per the `cv-editor-ui` spec)
MUST be called with the loaded value so the rendered text
reflects the saved letter. The editor MUST display the
saved text on the first paint after the data resolves and
MUST NOT require the user to click into the editor, press
a refresh button, or trigger a remount to see the text.

#### Scenario: User opens a ready application with a saved cover letter

- **WHEN** a signed-in user opens `/dashboard/applications/:id` for a `ready` application whose `cover_letter` is non-empty Markdown
- **THEN** the cover-letter editor's visible region MUST contain the saved Markdown text
- **AND** MUST NOT display the empty "Cover letter markdown…" placeholder
- **AND** the Copy, Print, and PDF actions MUST continue to produce the same server-rendered letter they produce today

#### Scenario: User opens a ready application with no saved cover letter

- **WHEN** a signed-in user opens `/dashboard/applications/:id` for a `ready` application whose `cover_letter` is empty or null
- **THEN** the cover-letter editor's visible region MUST remain empty (showing the placeholder) so the user can author a letter from scratch
- **AND** MUST NOT throw a runtime error from a missing or null value

#### Scenario: User navigates between two applications with different cover letters

- **WHEN** a signed-in user navigates from application A's workspace to application B's workspace
- **THEN** the cover-letter editor's visible region MUST update to display application B's saved `cover_letter` Markdown
- **AND** MUST NOT continue to display application A's text
