## MODIFIED Requirements

### Requirement: Reorder UI SHALL call the existing reorder API

On reorder (drop or keyboard move), the client SHALL send `PUT /cv/:cvId/{section}/reorder` with an ordered array of row uuids. On success, the client SHALL align local section state with the server response only when the server order differs from the optimistic order. On failure, the client SHALL revert to the pre-reorder list and surface an error. The client SHALL NOT send `version` and SHALL NOT treat HTTP 409 as a special concurrency case.

#### Scenario: Successful reorder matches optimistic order

- **WHEN** the reorder API returns success with the same id order the client already displays
- **THEN** the editor SHALL NOT repaint the section list

#### Scenario: Successful reorder differs from optimistic order

- **WHEN** the reorder API returns success with a different id order than the client displayed optimistically
- **THEN** the editor SHALL replace local section state with the server response order

#### Scenario: Failed reorder reverts UI

- **WHEN** the reorder API returns any non-success status
- **THEN** the client SHALL restore the section list to the order before the reorder attempt
- **AND** SHALL surface an error message
