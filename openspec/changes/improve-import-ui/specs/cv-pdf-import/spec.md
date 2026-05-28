## MODIFIED Requirements

### Requirement: The web app SHALL expose PDF import on the new CV route

`/dashboard/cv/new` SHALL include an **Import from PDF** path alongside manual create and JSON import, presented as the first tab and selected by default per `web-application`. PDF import SHALL be **disabled** until the user has a valid **active AI agent account** per `ai-agent-accounts`, showing a setup link to AI agent settings or the user menu instead of upload when unset. When configured, the client SHALL use the shared import file upload component for PDF selection, upload the PDF only after explicit user confirmation, poll job status until terminal state, display human-readable progress during polling, navigate to `/dashboard/cv/:id` on success, and display job errors on failure. Visiting the page alone SHALL NOT start an import or create a CV.

#### Scenario: User imports PDF successfully

- **WHEN** a signed-in user selects a PDF and confirms import
- **THEN** the client SHALL call `POST /cv/import/pdf`, poll until `succeeded`, and navigate to the returned CV editor route

#### Scenario: User abandons import in progress

- **WHEN** a user navigates away while a job is running
- **THEN** the client MAY stop polling
- **AND** the server job MAY continue; no duplicate CV SHALL be created for a single job id

#### Scenario: User without active AI agent account sees setup instead of upload

- **WHEN** a signed-in user opens the PDF import section without an active AI agent account
- **THEN** the UI SHALL NOT show the PDF file upload drop zone
- **AND** SHALL prompt the user to open AI agent settings or the user menu

#### Scenario: PDF upload uses drop zone

- **WHEN** a signed-in user with a valid active AI agent account views the PDF import tab
- **THEN** the UI SHALL present the shared import file upload drop zone for PDF files
- **AND** SHALL NOT use an unstyled native file input as the primary control
