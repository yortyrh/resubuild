# cv-json-export Specification

## Purpose

Normalize assembled CV data into portable JSON Resume files for download and round-trip re-import.

## Requirements

### Requirement: The system SHALL normalize assembled resumes for JSON export

A shared function in `@resumind/types` (e.g. `prepareExportedResume`) SHALL accept a `Resume` object from `assembleResume` and return a plain JSON-serializable object suitable for download and external tooling. It MUST recursively remove Resumind-internal `id` fields from section array items and from `basics.profiles` entries. It SHALL omit top-level sections that are empty or undefined after normalization. It SHALL include a `$schema` URI pointing to the official JSON Resume schema. It SHALL include `meta` with at least `lastModified` (ISO 8601 string from the CV row `updated_at`) and `version` (non-empty string). It SHALL NOT include `inactive_highlights` or other non–JSON Resume fields.

#### Scenario: Internal row ids are stripped

- **WHEN** `prepareExportedResume` receives a resume whose work items include internal UUID `id` fields
- **THEN** the exported work items SHALL NOT include an `id` property
- **AND** other JSON Resume fields (name, position, startDate, highlights) SHALL be preserved

#### Scenario: Empty sections are omitted

- **WHEN** the assembled resume has no volunteer entries and no references
- **THEN** the export object SHALL NOT include top-level `volunteer` or `references` keys

#### Scenario: Meta and schema are present

- **WHEN** `prepareExportedResume` is called with a valid assembled resume and `updatedAt` timestamp
- **THEN** the result SHALL include `$schema` as a URI string
- **AND** `meta.lastModified` SHALL be an ISO 8601 datetime string derived from `updatedAt`
- **AND** `meta.version` SHALL be a non-empty string

### Requirement: Exported JSON SHALL round-trip through import normalization

An export produced by `prepareExportedResume` followed by `prepareImportedResume` SHALL yield a document suitable for `POST /cv` without manual editing. Import normalization MAY re-add empty array sections stripped by export; content fields SHALL remain equivalent.

#### Scenario: Export then re-import preserves basics

- **WHEN** a user exports a CV with basics name and label, then runs `prepareImportedResume` on the parsed export
- **THEN** the imported object SHALL preserve `basics.name` and `basics.label`
- **AND** SHALL NOT retain export-only `$schema` or `meta` in the create payload

#### Scenario: Export then re-import preserves work content

- **WHEN** a CV has one work entry with employer, position, and highlights
- **THEN** after export and `prepareImportedResume`, the work array SHALL contain equivalent employer, position, and highlight strings
