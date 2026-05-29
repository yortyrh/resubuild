## ADDED Requirements

### Requirement: The UI SHALL support importing a JSON Resume via URL

The JSON import tab SHALL accept any publicly accessible URL that returns JSON Resume data. The system SHALL fetch the JSON via the API proxy (to bypass CORS), run `prepareImportedResume`, and proceed with the same import flow as file upload.

#### Scenario: Successful URL import

- **WHEN** the user enters a publicly accessible HTTPS URL (e.g., `https://example.com/resume.json`) and confirms import
- **THEN** the client SHALL call `POST /cv/import-from-url` with the URL
- **AND** the API SHALL fetch the URL server-side
- **AND** the API SHALL validate the response is JSON
- **AND** the API SHALL call `prepareImportedResume` on the parsed data
- **AND** the API SHALL validate against JSON Resume schema
- **AND** the API SHALL return the normalized data to the client
- **AND** the client SHALL call `POST /cv` with the returned data
- **AND** SHALL navigate to `/dashboard/cv/:id`

#### Scenario: Fetch failure

- **WHEN** the URL fetch returns an error (network failure, non-2xx response, timeout)
- **THEN** the UI SHALL display an inline error with the failure reason
- **AND** SHALL NOT call `POST /cv`

#### Scenario: Non-JSON response

- **WHEN** the URL returns HTML, PDF, or non-JSON content
- **THEN** the API SHALL return a 400 error indicating the URL did not return JSON
- **AND** the UI SHALL display the error
- **AND** SHALL NOT call `POST /cv`

#### Scenario: Invalid JSON Resume schema

- **WHEN** the URL returns valid JSON but it is not valid JSON Resume
- **THEN** the API SHALL return a 400 with schema validation errors
- **AND** the UI SHALL display the validation errors
- **AND** SHALL NOT call `POST /cv`

#### Scenario: Private/internal URL rejected

- **WHEN** the user enters a URL to a private or internal IP (localhost, 10.x, 192.168.x, etc.)
- **THEN** the API SHALL return a 400 error
- **AND** the UI SHALL display an error indicating security restriction
- **AND** SHALL NOT attempt to fetch

### Requirement: The UI SHALL reference JSON Resume resources

The JSON import section SHALL display a reference to the JSON Resume standard (linking to `https://jsonresume.org/schema`) and clarify that any publicly hosted JSON Resume URL can be imported.

#### Scenario: Credit text displayed

- **WHEN** the user views the JSON import tab
- **THEN** the UI SHALL show a text reference linking to `https://jsonresume.org/schema`
- **AND** a hint that any publicly accessible JSON Resume URL can be imported
