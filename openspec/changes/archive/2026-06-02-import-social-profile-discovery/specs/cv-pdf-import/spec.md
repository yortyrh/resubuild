## MODIFIED Requirements

### Requirement: PDF import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract text from the PDF, map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup tools using the user's Tavily web scrape key when configured), optionally discover and merge social profiles into `basics.profiles` when Tavily is configured, and pass the result through `prepareImportedResume` and schema validation. The job SHALL store the prepared object as `previewData` and SHALL NOT persist a CV row. CV creation SHALL occur only when the client calls `POST /cv` after user confirmation with the prepared data (same meta, validation, and title derivation as direct create). When discovery adds profiles, the job response MAY include `discoveredProfilesCount` indicating how many profiles were auto-added.

#### Scenario: Valid PDF yields preview data

- **WHEN** processing completes for a text-based PDF with extractable content
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Preview includes discovered profiles

- **WHEN** a PDF import job succeeds after social profile discovery added two profiles
- **THEN** `previewData.basics.profiles` SHALL include those profiles
- **AND** `discoveredProfilesCount` MAY equal `2`

#### Scenario: Unextractable PDF fails job

- **WHEN** the PDF yields no extractable text (e.g. scanned image-only)
- **THEN** the job SHALL end in `failed` with an error indicating the PDF could not be parsed
- **AND** no CV row SHALL be created
