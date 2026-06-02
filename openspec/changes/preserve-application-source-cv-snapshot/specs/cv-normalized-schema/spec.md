## MODIFIED Requirements

### Requirement: Job applications SHALL be stored in a dedicated table

The schema SHALL define `public.job_application` with at minimum: `id`, `user_id`, `status`, job fields (`job_title`, `job_company`, `job_source_type`, `job_raw_text`), `source_cv_id`, `source_cv_snapshot jsonb`, `tailored_cv_id`, `cover_letter text` (Markdown), optional `selection_rationale text`, `created_at`, `updated_at`.

#### Scenario: Application row links CVs

- **WHEN** an application is created by the prepare workflow
- **THEN** `job_application.source_cv_id` and `job_application.tailored_cv_id` SHALL reference existing CV rows owned by the same user when live source rows exist

#### Scenario: Cover letter stored as Markdown

- **WHEN** the prepare workflow completes
- **THEN** `job_application.cover_letter` SHALL contain Markdown text

#### Scenario: Source CV unchanged after prepare

- **WHEN** the prepare workflow tailors a clone
- **THEN** all rows on the source CV SHALL remain unchanged

#### Scenario: Source snapshot stored for regeneration durability

- **WHEN** the prepare workflow completes
- **THEN** `job_application.source_cv_snapshot` SHALL persist a resume JSON copy of the selected base CV
