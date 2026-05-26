## ADDED Requirements

### Requirement: Users SHALL reorder non-date CV section entries manually

The system MUST support user-initiated reordering of entries in these sections only:

- Social profiles (`basics.profiles` / `cv_basics_profile`)
- Skills (`skills` / `cv_skill`)
- Languages (`languages` / `cv_language`)
- Interests (`interests` / `cv_interest`)
- References (`references` / `cv_reference`)

Reorder SHALL NOT be offered for Work, Volunteer, Education, Projects, Awards, Certificates, or Publications in this capability.

#### Scenario: User reorders skills

- **WHEN** a user drags a skill row to a new position and releases
- **THEN** the system SHALL persist the new order and SHALL display skills in that order on subsequent loads and export

#### Scenario: Date-primary sections excluded

- **WHEN** a user views the Work section
- **THEN** drag reorder controls SHALL NOT be shown for work entries

### Requirement: Reorder SHALL persist by updating normalized `sort` values

The server SHALL accept an ordered list of row ids for the target section, assign `sort = 0..n-1` matching that order in a single transaction, and bump `cv.meta_version`. All rows for the CV section MUST be included exactly once; partial or unknown ids SHALL be rejected with 400.

#### Scenario: Successful reorder transaction

- **WHEN** an authenticated client sends `PUT /cv/:cvId/skills/reorder` with a valid permutation of all skill row ids and current version
- **THEN** each `cv_skill.sort` SHALL match the index in the request order
- **AND** the response SHALL include the skills array in the new order and an updated version

#### Scenario: Invalid permutation rejected

- **WHEN** the reorder request omits a row id or includes an id from another CV
- **THEN** the API SHALL respond with 400 and SHALL NOT modify any `sort` values

### Requirement: Reorder API SHALL require authentication and CV ownership

Reorder routes MUST use the same Supabase auth guard and RLS-backed user client as other `/cv/:cvId` item routes.

#### Scenario: Unauthorized reorder

- **WHEN** a client calls a reorder endpoint without a bearer token
- **THEN** the response SHALL be 401

### Requirement: Reorder SHALL participate in optimistic concurrency control

The reorder request MUST include the current `cv.meta_version`. Stale version SHALL yield 409 with the same reload guidance as item create/update/delete.

#### Scenario: Stale version on reorder

- **WHEN** the client sends an outdated version while reordering languages
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the reorder

### Requirement: Reordered sections SHALL reflect order in assembled JSON Resume output

When the full CV or section is assembled for export or preview, entries in reorderable sections MUST appear in `sort` ascending order.

#### Scenario: Export preserves skill order

- **WHEN** skills were reordered so "Rust" appears before "TypeScript"
- **THEN** assembled `data.skills` SHALL list Rust before TypeScript

### Requirement: Public item indices SHALL match post-reorder sort order

After reorder, numeric indices in item URLs (`/cv/:cvId/skills/:index`) SHALL correspond to zero-based positions after ordering by `sort ASC`, then `id ASC`.

#### Scenario: Index updates after move to top

- **WHEN** the skill at former index 2 is moved to index 0
- **THEN** subsequent `PATCH /cv/:cvId/skills/0` SHALL target that skill row
