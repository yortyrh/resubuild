## ADDED Requirements

### Requirement: JSON export SHALL use the same assembly path as HTML and PDF

The export pipeline for JSON SHALL load the CV header and all normalized section rows, assemble them with `assembleResume` (including `profiles` under `basics.profiles`), then pass the result through `prepareExportedResume` before responding. JSON export SHALL NOT rewrite `basics.image` to absolute URLs; stored media references SHALL be preserved as in the database.

#### Scenario: JSON export includes profiles in basics

- **WHEN** a CV has two profile rows and JSON export is requested
- **THEN** the exported document SHALL include both profiles under `basics.profiles`
- **AND** profile entries SHALL NOT include internal row `id` fields

#### Scenario: JSON export preserves stored image reference

- **WHEN** `basics.image` is stored as a relative API media path
- **THEN** the JSON export SHALL emit the same stored path string
- **AND** SHALL NOT require absolute URL rewriting used for HTML/PDF rendering
