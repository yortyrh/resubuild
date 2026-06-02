# CV normalized schema

## Purpose

Define how JSON Resume content is persisted in relational tables, including ordering rules, jsonb string lists, and assembly expectations shared by the API and migrations.

## Requirements

### Requirement: CV content SHALL be stored in normalized relational tables keyed by `cv.id`

The system MUST persist resume body fields across dedicated tables (`cv_profile`, `cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`, `cv_project`) instead of a monolithic `cv.data` jsonb document. JSON Resume `basics` scalar fields (`name`, `label`, `image`, `email`, `phone`, `url`, `summary`) and nested `location` (`location jsonb`) MUST live on the `cv` row itself (1:1 with the document). The `cv` header row MUST retain `id`, `user_id`, and timestamps. Columns `meta_version`, `meta_canonical`, and `meta_last_modified` MAY exist in the database schema as legacy fields but SHALL NOT be read or written by current management APIs; a future export feature MAY use them or replace them with export-time computation. The `cv` table SHALL NOT include a `title` column; display title is computed at the API layer from `name` and `label`.

The `public.media` table SHALL include nullable `thumbnail_storage_path text` for editor preview derivatives (≤150×150, aspect-preserving), alongside existing `crop` and `cropped_storage_path`.

#### Scenario: Media row tracks thumbnail path

- **WHEN** thumbnail generation succeeds for a media id
- **THEN** `public.media.thumbnail_storage_path` SHALL reference the thumbnail object in Storage

### Requirement: Non-date multi-valued tables MUST include a `sort` column for display order

Only `cv_profile`, `cv_skill`, `cv_language`, `cv_interest`, and `cv_reference` SHALL have `sort integer not null`. Date-primary tables (`cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_project`) SHALL NOT have a `sort` column.

New rows in `sort`-backed tables SHALL receive `sort = max(sort) + 1` within the same `cv_id` (0 when the section is empty) unless explicitly supplied. Queries that list those sections MUST order by `sort ASC`, then `id ASC` as tiebreaker.

#### Scenario: Skills returned in sort order

- **WHEN** two skill rows exist for a CV with `sort` values 0 and 1
- **THEN** assembling or listing skills SHALL return them in that order regardless of insertion time

#### Scenario: Reorder updates sort only

- **WHEN** a reorder operation changes display order without editing field content
- **THEN** the system SHALL update `sort` values on affected rows and SHALL NOT require rewriting unrelated columns

#### Scenario: Sort auto-assigned on create

- **WHEN** a new skill row is created without an explicit `sort` value
- **THEN** the service SHALL assign `sort` to one greater than the current maximum for that `cv_id`, or 0 if the section is empty

### Requirement: Date-primary sections SHALL list by date attributes

Services that list `cv_work`, `cv_volunteer`, `cv_education`, and `cv_project` SHALL order by `end_date DESC NULLS FIRST`, then `start_date DESC`, then `id ASC`. A null or absent `end_date` SHALL represent an ongoing role and SHALL sort before any row with a set `end_date`. Services that list `cv_award` and `cv_certificate` SHALL order by `date DESC NULLS LAST`, then `id ASC`. Services that list `cv_publication` SHALL order by `release_date DESC NULLS LAST`, then `id ASC`.

Shared in-memory sort helpers in `@resumind/types` (`sortSectionRows` and section-specific `sort*Rows` functions) SHALL implement the same ordering rules as API list and full-CV assembly paths.

#### Scenario: Ongoing work entry listed first

- **WHEN** two work rows exist for a CV where row A has `start_date` `2020-01` and no `end_date`, and row B has `start_date` `2022-06` and `end_date` `2024-01`
- **THEN** listing or assembling work entries SHALL return row A before row B

#### Scenario: Work entries with end dates ordered by end date

- **WHEN** two work rows exist where row A has `end_date` `2022-06` and row B has `end_date` `2024-01`
- **THEN** listing or assembling work entries SHALL return row B before row A regardless of start dates

#### Scenario: Award entries returned by date

- **WHEN** two award rows exist with `date` values `2019` and `2021`
- **THEN** listing or assembling awards SHALL return the 2021 entry first

#### Scenario: Publication entries returned by release date

- **WHEN** two publication rows exist with `release_date` values `2020-05` and `2023-11`
- **THEN** listing or assembling publications SHALL return the 2023 entry first

### Requirement: String-list fields SHALL be stored as jsonb arrays on the parent row

Parent entity tables MUST store these JSON Resume string arrays as `jsonb` defaulting to `'[]'::jsonb`:

- `cv_work.highlights`, `cv_volunteer.highlights`, `cv_education.courses`
- `cv_skill.keywords`, `cv_interest.keywords`
- `cv_project.highlights`, `cv_project.keywords`, `cv_project.roles`

`cv.location` MUST store the JSON Resume `basics.location` object as `jsonb` defaulting to `'{}'::jsonb`.

Application code MUST treat missing or null database values as empty arrays when assembling JSON Resume output, and an empty object for missing `cv.location`.

#### Scenario: Work highlights persist as jsonb

- **WHEN** a work row is saved with highlights `["Built API", "Led team"]`
- **THEN** the `cv_work.highlights` column SHALL store a jsonb array of strings with that content

#### Scenario: Empty keywords default

- **WHEN** a skill row is created without keywords
- **THEN** `cv_skill.keywords` SHALL be `'[]'::jsonb` after insert

#### Scenario: Empty location default

- **WHEN** a CV is created without basics location data
- **THEN** `cv.location` SHALL be `'{}'::jsonb` after insert

### Requirement: Basics scalars SHALL live on the cv row

Creating a CV SHALL insert a single `cv` row with empty basics columns and `location = '{}'::jsonb`. Location fields inside the jsonb object MAY be absent until the user provides address data. There SHALL be no separate `cv_basics` table.

#### Scenario: New CV has basics columns on cv row

- **WHEN** a CV is created via the API
- **THEN** the `cv` row for that `id` SHALL exist with basics columns and `location = '{}'::jsonb`

### Requirement: Normalized tables MUST inherit CV row-level security

Each child table SHALL enable RLS with policies allowing SELECT, INSERT, UPDATE, and DELETE only when the linked `cv.user_id` equals `auth.uid()`, consistent with existing `public.cv` isolation.

#### Scenario: Cross-tenant work row access denied

- **WHEN** user A's JWT is used to query `cv_work` rows belonging to user B's CV
- **THEN** Postgres RLS SHALL return no rows and SHALL NOT allow mutation

### Requirement: Indexes SHALL support section listing by CV

`cv_profile`, `cv_skill`, `cv_language`, `cv_interest`, and `cv_reference` MUST have an index on `(cv_id, sort)`. Date-primary tables MUST have an index on `(cv_id, <date column>)` appropriate to the section. The `cv` table MUST retain an index on `(user_id, updated_at desc)`.

#### Scenario: List skills by cv_id uses sort index

- **WHEN** the API loads all skill rows for a CV
- **THEN** the query SHALL filter by `cv_id` and order by `sort` using the defined composite index

#### Scenario: List work by cv_id uses end_date index

- **WHEN** the API loads all work rows for a CV
- **THEN** the query SHALL filter by `cv_id` and order by `end_date` using the defined composite index

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
