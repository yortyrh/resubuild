## ADDED Requirements

### Requirement: Basics read routes SHALL return header columns only

`GET /cv/:cvId/basics` SHALL return basics fields stored on the `cv` row (name, label, image, email, phone, url, summary, location). It SHALL NOT query `cv_profiles` or include a `profiles` array. Clients needing profiles SHALL call `GET /cv/:cvId/profiles`.

#### Scenario: Fetch basics without profiles query

- **WHEN** an authenticated client calls `GET /cv/:cvId/basics`
- **THEN** the response SHALL include basics scalar fields and location from the `cv` row
- **AND** the response SHALL NOT include a `profiles` property
- **AND** the service SHALL NOT list profile rows for that request

#### Scenario: Update basics response excludes profiles

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the mutation response `item` SHALL contain only updated basics fields from the header row
- **AND** SHALL NOT embed profiles loaded from `cv_profiles`
