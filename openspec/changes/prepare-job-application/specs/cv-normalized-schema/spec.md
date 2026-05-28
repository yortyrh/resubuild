## ADDED Requirements

### Requirement: CV rows SHALL support application clone lineage and library visibility

The `public.cv` table SHALL include nullable `source_cv_id uuid references public.cv(id) on delete set null`, non-null `kind text not null default 'primary'` with allowed values `primary` and `application_clone`, and non-null `visible_in_library boolean not null default true`. Application clones SHALL be inserted with `kind = application_clone`, `visible_in_library = false`, and `source_cv_id` referencing the selected base CV.

#### Scenario: Application clone row shape

- **WHEN** the prepare workflow creates a tailored CV
- **THEN** the new `cv` row SHALL have `kind = application_clone`, `visible_in_library = false`, and non-null `source_cv_id`

#### Scenario: Primary CV defaults unchanged

- **WHEN** a user creates a CV through manual create or import
- **THEN** the row SHALL have `kind = primary` and `visible_in_library = true` with null `source_cv_id`

### Requirement: Highlight-bearing section rows SHALL store inactive highlights separately

`public.cv_work`, `public.cv_volunteer`, and `public.cv_project` SHALL include `inactive_highlights jsonb not null default '[]'::jsonb`. Active JSON Resume `highlights` export and assembly SHALL include only the `highlights` column. `inactive_highlights` SHALL NOT appear in assembled JSON Resume output.

#### Scenario: Deactivated bullet stored separately

- **WHEN** a highlight string is deactivated for an application-tailored CV
- **THEN** it SHALL be absent from `highlights` and present in `inactive_highlights`

#### Scenario: Reactivated bullet restored

- **WHEN** a user reactivates a previously inactive highlight
- **THEN** the string SHALL move from `inactive_highlights` back into `highlights`

### Requirement: Job applications and chat messages SHALL be stored in dedicated tables

The schema SHALL define `public.job_application` with at minimum: `id`, `user_id`, `status`, job fields (`job_title`, `job_company`, `job_source_type`, `job_raw_text`), `source_cv_id`, `tailored_cv_id`, `cover_letter text`, `created_at`, `updated_at`. It SHALL define `public.job_application_message` with: `id`, `application_id`, `role`, `content`, optional `metadata jsonb`, `created_at`, ordered by `created_at asc`.

#### Scenario: Application row links CVs

- **WHEN** an application is created by the prepare workflow
- **THEN** `job_application.source_cv_id` and `job_application.tailored_cv_id` SHALL reference existing CV rows owned by the same user

#### Scenario: Chat messages append in order

- **WHEN** multiple chat turns occur on one application
- **THEN** messages SHALL be retrievable in chronological order by `created_at`
