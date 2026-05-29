## ADDED Requirements

### Requirement: Authenticated clients SHALL import JSON Resume data from a public website URL

The API SHALL expose `POST /cv/import/from-url` (existing route) accepting `{ url: string }` and returning `{ data: object }` with normalized JSON Resume suitable for `POST /cv`. The handler SHALL fetch the URL server-side with SSRF protections per `validateImportUrl`, enforce a fetch timeout, and validate the response as JSON Resume schema before returning. For `registry.jsonresume.org` profile URLs whose path does not end with `.json`, the server SHALL rewrite the fetch target to append `.json` to the pathname before requesting.

#### Scenario: JSON Resume Registry profile URL resolves

- **WHEN** a client posts `{ url: "https://registry.jsonresume.org/thomasdavis" }`
- **THEN** the server SHALL fetch `https://registry.jsonresume.org/thomasdavis.json`
- **AND** SHALL return normalized JSON Resume data on success

#### Scenario: Direct JSON URL succeeds

- **WHEN** a client posts a HTTPS URL that returns valid JSON Resume JSON
- **THEN** the server SHALL return `{ data }` with content passed through `prepareImportedResume`

#### Scenario: Invalid URL rejected

- **WHEN** a client posts a non-HTTPS URL, localhost, or private IP target
- **THEN** the API SHALL respond with `400` and SHALL NOT fetch

#### Scenario: Non-JSON response rejected

- **WHEN** the fetched URL returns HTML or other non-JSON content that cannot be parsed as JSON Resume
- **THEN** the API SHALL respond with `400` with a descriptive error

### Requirement: The web app SHALL expose website import on a dedicated route

`/dashboard/cv/new/import/website` SHALL provide a URL input for personal CV websites and JSON Resume Registry profiles. The client SHALL call `POST /cv/import/from-url` to fetch and preview normalized data, optionally resolve profile images per existing JSON import media helpers, and call `createCv` only after explicit user confirmation. On success, the UI SHALL navigate to `/dashboard/cv/:id`. The page SHALL reference [JSON Resume](https://jsonresume.org/schema) as the expected data format and MAY show `registry.jsonresume.org` as an example profile URL.

#### Scenario: User imports from registry profile URL

- **WHEN** a signed-in user enters `https://registry.jsonresume.org/thomasdavis` and confirms import
- **THEN** the client SHALL fetch via the API proxy, create the CV, and navigate to the editor

#### Scenario: User abandons website import

- **WHEN** a user opens `/dashboard/cv/new/import/website` and leaves without confirming
- **THEN** no `POST /cv` call SHALL have been made
