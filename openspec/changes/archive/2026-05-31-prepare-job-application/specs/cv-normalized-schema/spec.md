## ADDED Requirements

### Requirement: CV rows SHALL support application clone lineage

The `public.cv` table SHALL include nullable `source_cv_id uuid references public.cv(id) on delete set null` and non-null `kind text not null default 'primary'` with allowed values `primary` and `application_clone`. Application clones SHALL be inserted with `kind = application_clone` and `source_cv_id` referencing the selected base CV. Promoted library CVs SHALL be new rows with `kind = primary` and `source_cv_id` referencing the application clone they were copied from.

#### Scenario: Application clone row shape

- **WHEN** the prepare workflow creates a tailored CV
- **THEN** the new `cv` row SHALL have `kind = application_clone` and non-null `source_cv_id`

#### Scenario: Primary CV defaults unchanged

- **WHEN** a user creates a CV through manual create or import
- **THEN** the row SHALL have `kind = primary` with null `source_cv_id`

#### Scenario: Promoted CV row shape

- **WHEN** a user promotes an application clone to the library
- **THEN** the new `cv` row SHALL have `kind = primary` and `source_cv_id` set to the application clone id

### Requirement: Job applications SHALL be stored in a dedicated table

The schema SHALL define `public.job_application` with at minimum: `id`, `user_id`, `status`, job fields (`job_title`, `job_company`, `job_source_type`, `job_raw_text`), `source_cv_id`, `tailored_cv_id`, `cover_letter text` (Markdown), optional `selection_rationale text`, `created_at`, `updated_at`.

#### Scenario: Application row links CVs

- **WHEN** an application is created by the prepare workflow
- **THEN** `job_application.source_cv_id` and `job_application.tailored_cv_id` SHALL reference existing CV rows owned by the same user

#### Scenario: Cover letter stored as Markdown

- **WHEN** the prepare workflow completes
- **THEN** `job_application.cover_letter` SHALL contain Markdown text

#### Scenario: Source CV unchanged after prepare

- **WHEN** the prepare workflow tailors a clone
- **THEN** all rows on the source CV SHALL remain unchanged
