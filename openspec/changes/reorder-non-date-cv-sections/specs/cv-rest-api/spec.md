## ADDED Requirements

### Requirement: The API SHALL expose reorder endpoints for non-date CV sections

Authenticated handlers under `/cv/:cvId` SHALL provide `PUT /cv/:cvId/profiles/reorder`, `PUT /cv/:cvId/skills/reorder`, `PUT /cv/:cvId/languages/reorder`, `PUT /cv/:cvId/interests/reorder`, and `PUT /cv/:cvId/references/reorder`. Each SHALL accept a body with `version` (optional but recommended) and `order` (array of row uuid strings). Successful responses SHALL return the reordered section items and updated `meta.version`.

#### Scenario: Reorder profiles

- **WHEN** an authenticated client calls `PUT /cv/:cvId/profiles/reorder` with a valid order array
- **THEN** the service SHALL update `cv_basics_profile.sort` values and return profiles in the new order

#### Scenario: Reorder response includes version

- **WHEN** a reorder succeeds
- **THEN** the response SHALL include a new `version` string for client state refresh

## MODIFIED Requirements

### Requirement: Item mutation responses SHALL include enough data for the client to refresh UI state

Successful item create and update responses SHALL include the affected entity, its index (for array items), its stable row `id` (uuid), and the new `meta.version`. Delete responses SHALL confirm removal and return the new version; optional section snapshots MAY be included to simplify client re-render. Reorder responses SHALL return the full ordered section array with each item's `id` and implied index.

#### Scenario: Work highlight update response

- **WHEN** a client successfully patches a work highlight
- **THEN** the response SHALL include the highlight value, parent work index, highlight index, and updated `meta.version`

#### Scenario: Skill create includes row id

- **WHEN** a client successfully creates a skill
- **THEN** the response SHALL include the skill entity with its uuid `id`, array index, and updated `meta.version`
