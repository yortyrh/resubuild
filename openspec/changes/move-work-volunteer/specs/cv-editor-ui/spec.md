## ADDED Requirements

### Requirement: Work and Volunteer entry rows SHALL expose cross-section move actions

Each persisted Work entry row in the CV editor Work tab SHALL include a **Move to Volunteer** control. Each persisted Volunteer entry row in the Volunteer tab SHALL include a **Move to Work** control. Controls SHALL appear on saved view rows (entries with a server-assigned `id`), SHALL NOT appear on in-progress create drafts, and SHALL be disabled while any item mutation (save, delete, reorder, or move) is in progress for that section.

Activating a move control SHALL open a confirmation dialog stating the destination section and that the current entry will be removed from the source section after a successful transfer.

#### Scenario: Move control visible on saved work entry

- **WHEN** a user views a saved work entry with a persisted id on the Work tab
- **THEN** the entry row action bar SHALL include **Move to Volunteer**
- **AND** the control SHALL be operable when no mutation is in progress

#### Scenario: Move control hidden while creating

- **WHEN** a user is filling the Add work experience create form
- **THEN** no **Move to Volunteer** control SHALL appear on that draft

#### Scenario: Volunteer row exposes move to work

- **WHEN** a user views a saved volunteer entry with a persisted id on the Volunteer tab
- **THEN** the entry row action bar SHALL include **Move to Work**

#### Scenario: Confirm before move

- **WHEN** a user activates **Move to Volunteer** on a work entry
- **THEN** a confirmation dialog SHALL appear before any API call
- **AND** confirming SHALL proceed with the transfer
- **AND** canceling SHALL leave the work entry unchanged

#### Scenario: Work-only fields stored hidden on move to volunteer

- **WHEN** a user confirms moving a work entry that has `location` and/or `description` populated
- **THEN** the created volunteer row SHALL persist those values as hidden storage fields
- **AND** the volunteer editor and JSON Resume export SHALL NOT expose `location` or `description`
- **AND** the source work entry SHALL be removed after successful persistence

#### Scenario: Hidden fields restored on move to work

- **WHEN** a user confirms moving a volunteer entry that has hidden `location` and/or `description` from a prior work move
- **THEN** the created work entry SHALL restore those field values on `location` and `description`
- **AND WHEN** no hidden values exist
- **THEN** `location` and `description` SHALL be unset until the author edits them

#### Scenario: Organization maps to company on move to work

- **WHEN** a user confirms moving a volunteer entry with `organization` "Open Source Foundation"
- **THEN** the created work entry SHALL have `name` equal to "Open Source Foundation"

#### Scenario: Shared fields preserved on transfer

- **WHEN** a user moves an entry with `position`, `url`, date range, `summary`, and non-empty `highlights`
- **THEN** the target-section entry SHALL retain those field values (subject to existing sanitize rules)
