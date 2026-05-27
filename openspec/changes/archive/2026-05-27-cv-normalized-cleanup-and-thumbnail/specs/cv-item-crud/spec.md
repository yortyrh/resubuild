## MODIFIED Requirements

### Requirement: Editor sections SHOULD fetch section-scoped data when available

When the API exposes section GET routes, each editor tab SHALL load only its section (e.g. work list via `GET /cv/:id/work`) instead of requiring the full assembled CV document for initial render. Full CV assembly is reserved for a future export or preview endpoint—not `GET /cv/:id`.

#### Scenario: Work tab uses section endpoint

- **WHEN** a user opens the Work tab in the CV editor and section GET is available
- **THEN** the client SHALL request work entries via the section-scoped endpoint rather than relying solely on a full CV payload loaded at editor mount

#### Scenario: Export uses dedicated assembly (future)

- **WHEN** a user exports or previews the complete JSON Resume document
- **THEN** the client SHALL use a future export endpoint or explicit assembly API—not slim `GET /cv/:id`
