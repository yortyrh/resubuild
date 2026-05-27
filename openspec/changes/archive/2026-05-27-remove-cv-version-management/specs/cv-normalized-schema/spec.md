## MODIFIED Requirements

### Requirement: CV content SHALL be stored in normalized relational tables keyed by `cv.id`

The system MUST persist resume body fields across dedicated tables (`cv_profile`, `cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`, `cv_project`) instead of a monolithic `cv.data` jsonb document. JSON Resume `basics` scalar fields (`name`, `label`, `image`, `email`, `phone`, `url`, `summary`) and nested `location` (`location jsonb`) MUST live on the `cv` row itself (1:1 with the document). The `cv` header row MUST retain `id`, `user_id`, and timestamps. Columns `meta_version`, `meta_canonical`, and `meta_last_modified` MAY exist in the database schema as legacy fields but SHALL NOT be read or written by current management APIs; a future export feature MAY use them or replace them with export-time computation. The `cv` table SHALL NOT include a `title` column; display title is computed at the API layer from `name` and `label`.

#### Scenario: Header row holds basics only for management reads

- **WHEN** the API returns slim CV `data` for list or detail
- **THEN** the payload SHALL include `basics` from the `cv` row when present
- **AND** SHALL NOT include a `meta` object synthesized from `meta_*` columns

#### Scenario: Disassemble ignores meta on write

- **WHEN** a create or document update supplies `data.meta` in the request body
- **THEN** the disassembler SHALL NOT persist those values to `meta_*` columns
