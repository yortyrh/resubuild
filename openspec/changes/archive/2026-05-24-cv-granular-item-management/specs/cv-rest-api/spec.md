## ADDED Requirements

### Requirement: The API SHALL expose item-scoped authenticated routes for CV resume content

Under `/cv/:cvId`, authenticated handlers SHALL provide create, update, and delete operations for each resume collection and nested child collection defined in `cv-item-crud`, plus `PATCH /cv/:cvId/basics` for the singleton basics object. Handlers MUST use the caller's Supabase user client (RLS), validate the full resume document after each mutation via the existing resume validator, and apply `meta.version` optimistic concurrency consistent with document-level PATCH.

#### Scenario: Create work entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/work` with a valid work payload and current version
- **THEN** the service SHALL append the entry to `data.work`, validate, persist, and return the created entry with its array index and updated version metadata

#### Scenario: Delete education course

- **WHEN** an authenticated client calls `DELETE /cv/:cvId/education/:educationIndex/courses/:courseIndex`
- **THEN** the service SHALL remove that course string, validate the document, persist, and return the updated education entry or courses list

#### Scenario: Update basics

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the service SHALL merge into `data.basics`, validate, and persist without requiring a full resume body in the request

#### Scenario: Create reference entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/references` with a valid reference payload and current version
- **THEN** the service SHALL append the entry to `data.references`, validate, persist, and return the created entry with its array index and updated version metadata

#### Scenario: Unauthorized item mutation

- **WHEN** a client calls an item route without a valid bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: Item mutation responses SHALL include enough data for the client to refresh UI state

Successful item create and update responses SHALL include the affected entity, its index (for array items), and the new `meta.version`. Delete responses SHALL confirm removal and return the new version; optional section snapshots MAY be included to simplify client re-render.

#### Scenario: Work highlight update response

- **WHEN** a client successfully patches a work highlight
- **THEN** the response SHALL include the highlight value, parent work index, highlight index, and updated `meta.version`

## MODIFIED Requirements

### Requirement: Updates SHALL detect concurrent edits using resume meta version metadata

When any item-scoped route mutates resume `data`, the service SHALL compare `meta.version` supplied by the client (header or body) with the stored row; mismatch MUST yield 409 with a message instructing the client to reload before retrying. Document-level `PATCH /cv/:id` with `data` SHALL retain the same behavior.

#### Scenario: Conflicting version on item update

- **WHEN** the client sends a stale meta version while patching a volunteer entry
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the mutation

#### Scenario: Conflicting version on document PATCH

- **WHEN** the client sends an outdated meta version while PATCHing full `data` (e.g. title-only or legacy clients)
- **THEN** the API SHALL respond with 409 and SHALL NOT apply the stale overwrite
