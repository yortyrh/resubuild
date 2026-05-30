## MODIFIED Requirements

### Requirement: Clients SHALL poll import job status until terminal state

The API SHALL expose `GET /cv/import/:jobId` for the authenticated job owner. Responses SHALL include `status` (`queued` | `running` | `succeeded` | `failed`), optional `progress` (human-readable step label), optional `cvId` on PDF/Markdown success when a CV was created, optional `previewData` (prepared JSON Resume object) on website URL import success before client create, and optional `errors` (string array or structured validation messages) on failure. Jobs SHALL NOT be readable by other users. Unknown or expired job ids SHALL return `404`.

#### Scenario: Successful PDF import completion

- **WHEN** a client polls a PDF import job that finished successfully
- **THEN** the response SHALL have `status: succeeded` and `cvId` set to the created CV id

#### Scenario: Successful website import preview

- **WHEN** a client polls a website URL import job that finished successfully
- **THEN** the response SHALL have `status: succeeded` and `previewData` containing schema-valid prepared JSON
- **AND** `cvId` MAY be absent

#### Scenario: Failed import

- **WHEN** extraction, agent, or schema validation ultimately fails
- **THEN** the response SHALL have `status: failed` and non-empty `errors` describing the failure

#### Scenario: Job not found

- **WHEN** a client requests a job id that does not exist or expired
- **THEN** the API SHALL respond with `404`

### Requirement: PDF import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract text from the PDF, map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup tools using the user's Tavily web scrape key when configured), and pass the result through `prepareImportedResume` before invoking the same create semantics as `POST /cv` (meta application, AJV validation, title derivation). The pipeline SHALL NOT persist a CV unless final schema validation succeeds.

#### Scenario: Valid PDF yields persisted CV

- **WHEN** processing completes for a text-based PDF with extractable content
- **THEN** the service SHALL create exactly one CV row owned by the caller
- **AND** persisted resume data SHALL pass the shared resume schema validator

#### Scenario: Unextractable PDF fails job

- **WHEN** the PDF yields no extractable text (e.g. scanned image-only)
- **THEN** the job SHALL end in `failed` with an error indicating the PDF could not be parsed
- **AND** no CV row SHALL be created
