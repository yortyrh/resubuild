## MODIFIED Requirements

### Requirement: CV content SHALL be stored in normalized relational tables keyed by `cv.id`

The system MUST persist resume body fields across dedicated tables (`cv_profile`, `cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`, `cv_project`) instead of a monolithic `cv.data` jsonb document. JSON Resume `basics` scalar fields (`name`, `label`, `image`, `email`, `phone`, `url`, `summary`) and nested `location` (`location jsonb`) MUST live on the `cv` row itself (1:1 with the document). The `cv` header row MUST retain `id`, `user_id`, and timestamps. Columns `meta_version`, `meta_canonical`, and `meta_last_modified` MAY exist in the database schema as legacy fields but SHALL NOT be read or written by current management APIs; a future export feature MAY use them or replace them with export-time computation. The `cv` table SHALL NOT include a `title` column; display title is computed at the API layer from `name` and `label`.

The `public.media` table SHALL include nullable `thumbnail_storage_path text` for editor preview derivatives (≤150×150, aspect-preserving), alongside existing `crop` and `cropped_storage_path`.

#### Scenario: Media row tracks thumbnail path

- **WHEN** thumbnail generation succeeds for a media id
- **THEN** `public.media.thumbnail_storage_path` SHALL reference the thumbnail object in Storage
