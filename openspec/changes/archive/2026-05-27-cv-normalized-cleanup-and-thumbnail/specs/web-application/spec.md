## ADDED Requirements

### Requirement: CV editor section components SHALL NOT thread document version

Reorderable section components (`managed-array-section`, `sortable-managed-array-section`, and callers) SHALL NOT accept `version`, `onVersionChange`, or `onMetaVersionChange` props. Reorder helpers SHALL NOT read `meta.version` from API responses. Failed reorders SHALL revert UI state without 409-specific handling.

#### Scenario: Skills reorder without version field

- **WHEN** a user reorders skills in the editor
- **THEN** the client SHALL call the reorder API with `order` only
- **AND** SHALL NOT send or expect a `version` field in the request or response
