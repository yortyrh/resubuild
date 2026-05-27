## MODIFIED Requirements

### Requirement: The CV editor SHALL persist resume sections through item-scoped API helpers

The web client in `apps/web/src/lib/cv-item-api.ts` (and related helpers) SHALL expose typed functions for each item operation defined in `cv-rest-api` (basics patch, array CRUD, section GET, reorder where applicable). Array-item update and delete helpers SHALL accept the item row UUID (`itemId`) rather than a numeric array index. Parent create and update helpers for work, volunteer, education, and projects SHALL accept full `highlights` and `courses` arrays in the payload. The client SHALL NOT expose nested highlight or course CRUD helpers. The dashboard CV editor SHALL call these functions on per-item Save and confirmed Delete instead of deferring resume body changes to a single Save CV action. After update or delete, local section state SHALL be merged by matching item `id`; after create, the client SHALL incorporate the returned item (with `id`) and refresh section ordering via section GET or equivalent sort logic.

#### Scenario: Saving a language entry

- **WHEN** a user saves a language from the inline edit form
- **THEN** the client SHALL invoke the language update helper with the CV id, the language row id, payload, and current meta version
- **AND THEN** on success SHALL replace the matching entry in local section state by `id` from the response

#### Scenario: Deleting an award entry

- **WHEN** a user confirms deletion of an award
- **THEN** the client SHALL call the award delete helper with the award row id
- **AND THEN** on success SHALL remove the entry from local state by `id` without requiring a full section refetch

#### Scenario: Saving work entry with highlights

- **WHEN** a user saves a work entry whose form includes multiple highlights
- **THEN** the client SHALL call the work create or update helper with the full `highlights` array
- **AND** SHALL NOT call separate nested highlight API helpers
