## ADDED Requirements

### Requirement: Array item payloads SHALL omit empty string fields before persistence

When the Nest API or web client creates or updates a resume array item (work, volunteer, education, skills, projects, awards, certificates, publications, languages, interests, references, profiles), the payload SHALL be sanitized so that string fields containing only whitespace are omitted entirely. Non-string fields SHALL pass through unchanged except null/undefined values. This prevents optional URI and date fields from being persisted as empty strings that fail JSON Resume schema validation.

#### Scenario: Empty work URL omitted on create

- **WHEN** a client creates a work entry with `url: ""` or whitespace-only url alongside other populated fields
- **THEN** the persisted work object SHALL NOT include a `url` property
- **AND** the create operation SHALL succeed

#### Scenario: Empty optional field omitted on update

- **WHEN** a client updates an existing array item merging fields where a previously omitted optional string is sent as empty
- **THEN** the merged persisted object SHALL omit that key rather than store `""`

#### Scenario: Non-empty strings trimmed

- **WHEN** a client sends a string field with leading or trailing whitespace and non-empty content
- **THEN** the persisted value SHALL be trimmed
