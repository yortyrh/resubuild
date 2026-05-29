## MODIFIED Requirements

### Requirement: The web app SHALL expose PDF import on the new CV route

`/dashboard/cv/new/import/pdf` SHALL provide **Import from PDF**. PDF import SHALL be **disabled** until the user completes import LLM configuration per `import-llm-config`, showing a setup link instead of upload when unset. When configured, the client SHALL upload the PDF only after explicit user confirmation, poll job status until terminal state, navigate to `/dashboard/cv/:id` on success, and display job errors on failure. Visiting the page alone SHALL NOT start an import or create a CV.

#### Scenario: User imports PDF successfully

- **WHEN** a signed-in user selects a PDF and confirms import
- **THEN** the client SHALL call `POST /cv/import/pdf`, poll until `succeeded`, and navigate to the returned CV editor route

#### Scenario: User abandons import in progress

- **WHEN** a user navigates away while a job is running
- **THEN** the client MAY stop polling
- **AND** the server job MAY continue; no duplicate CV SHALL be created for a single job id

#### Scenario: User without LLM config sees setup instead of upload

- **WHEN** a signed-in user opens `/dashboard/cv/new/import/pdf` without saved LLM settings
- **THEN** the UI SHALL NOT show the PDF file input
- **AND** SHALL prompt the user to open import LLM settings
