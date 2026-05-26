## ADDED Requirements

### Requirement: Item list state SHALL support reorder without separate document save

After a successful reorder API call, the client SHALL update the in-memory section array to match the server response order. Reorder SHALL NOT require a document-level Save CV action.

#### Scenario: Local skills array updates after reorder

- **WHEN** a reorder API call for skills succeeds
- **THEN** the editor's skills array state SHALL match the returned order
- **AND** subsequent edit actions SHALL use indices from the new order

### Requirement: Reorderable section items SHALL carry stable row ids in client state

For Social profiles, Skills, Languages, Interests, and References, the client SHALL retain each entry's server row uuid (returned from create, section GET, or reorder responses) to build reorder request payloads.

#### Scenario: Reorder payload uses row ids

- **WHEN** the client sends a skills reorder request after drag-and-drop
- **THEN** the `order` array SHALL contain uuid strings matching the skill rows, not display names or legacy indices alone
