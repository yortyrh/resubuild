## MODIFIED Requirements

### Requirement: The system SHALL normalize assembled resumes for JSON export

A shared function in `@resubuild/types` (e.g. `prepareExportedResume`) SHALL accept a `Resume` object from `assembleResume` and return a plain JSON-serializable object suitable for download and external tooling. It MUST recursively remove Resubuild-internal `id` fields from section array items and from `basics.profiles` entries. It SHALL omit top-level sections that are empty or undefined after normalization. It SHALL include a `$schema` URI pointing to the official JSON Resume schema. It SHALL include `meta` with at least `lastModified` (ISO 8601 string from the CV row `updated_at`) and `version` (non-empty string). It SHALL NOT include `inactive_highlights` or other non–JSON Resume fields.

#### Scenario: Internal row ids are stripped

- **WHEN** `prepareExportedResume` receives a resume whose work items include internal UUID `id` fields
- **THEN** the exported work items SHALL NOT include an `id` property
- **AND** other JSON Resume fields (name, position, startDate, highlights) SHALL be preserved

#### Scenario: Meta and schema are present

- **WHEN** `prepareExportedResume` is called with a valid assembled resume and `updatedAt` timestamp
- **THEN** the result SHALL include `$schema` as a URI string
- **AND** `meta.lastModified` SHALL be an ISO 8601 datetime string derived from `updatedAt`
- **AND** `meta.version` SHALL be a non-empty string
