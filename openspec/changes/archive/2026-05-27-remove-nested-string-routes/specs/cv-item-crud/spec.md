## ADDED Requirements

### Requirement: Nested string arrays SHALL NOT have dedicated API routes

The Nest API SHALL NOT expose separate create, update, or delete routes for individual strings within `work[].highlights`, `volunteer[].highlights`, `education[].courses`, or `projects[].highlights`. All mutations to those arrays SHALL occur only when the parent work, volunteer, education, or project entry is created or updated with the full string array in the request payload.

#### Scenario: Highlight change via parent update only

- **WHEN** a client needs to add, edit, or remove a work highlight
- **THEN** it SHALL call `PATCH /cv/:cvId/work/:itemId` with the complete updated `highlights` array
- **AND** SHALL NOT call a nested `/highlights/:index` route

#### Scenario: Course change via parent update only

- **WHEN** a client needs to add, edit, or remove an education course line
- **THEN** it SHALL call `PATCH /cv/:cvId/education/:itemId` with the complete updated `courses` array
- **AND** SHALL NOT call a nested `/courses/:index` route
