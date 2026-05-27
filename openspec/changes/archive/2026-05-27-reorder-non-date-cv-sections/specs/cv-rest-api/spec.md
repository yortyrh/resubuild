## MODIFIED Requirements

### Requirement: Item mutation responses SHALL include enough data for the client to refresh UI state

Successful item create and update responses SHALL include the affected entity, its index (for array items), its stable row `id` (uuid), and the new `meta.version`. Delete responses SHALL confirm removal and return the new version; optional section snapshots MAY be included to simplify client re-render. The web reorder UI relies on row `id` in section GET/create responses to build reorder payloads.

#### Scenario: Skill create includes row id

- **WHEN** a client successfully creates a skill
- **THEN** the response SHALL include the skill entity with its uuid `id`, array index, and updated `meta.version`
