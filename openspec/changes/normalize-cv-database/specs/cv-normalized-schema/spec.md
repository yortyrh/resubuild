## ADDED Requirements

### Requirement: CV content SHALL be stored in normalized relational tables keyed by `cv.id`

The system MUST persist resume body fields across dedicated tables (`cv_basics`, `cv_basics_profile`, `cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`, `cv_project`) instead of a monolithic `cv.data` jsonb document. The `cv_basics` row MUST include a `location jsonb` column for nested basics location fields. The `cv` header row MUST retain `id`, `user_id`, `title`, timestamps, and flattened meta columns (`meta_version`, `meta_canonical`, `meta_last_modified`).

#### Scenario: Schema includes all section tables

- **WHEN** migrations for normalized CV storage are applied
- **THEN** each table listed in the change design exists with foreign keys to `cv.id` and ON DELETE CASCADE from `cv`

#### Scenario: CV header without jsonb blob after cutover

- **WHEN** the final migration phase completes
- **THEN** the `cv` table SHALL NOT include a `data` jsonb column

### Requirement: Multi-valued entity tables MUST include a `sort` column for display order

Every table representing a JSON Resume array section (`cv_basics_profile`, `cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`, `cv_project`) SHALL have `sort integer not null`. New rows SHALL receive `sort = max(sort)+1` within the same `cv_id` unless explicitly supplied. Queries that list section items MUST order by `sort ASC`, then `id ASC` as tiebreaker.

#### Scenario: Work entries returned in sort order

- **WHEN** two work rows exist for a CV with `sort` values 0 and 1
- **THEN** assembling or listing work entries SHALL return them in that order regardless of insertion time

#### Scenario: Future reorder updates sort only

- **WHEN** a reorder operation changes display order without editing field content
- **THEN** the system SHALL update `sort` values on affected rows and SHALL NOT require rewriting unrelated columns

### Requirement: String-list fields SHALL be stored as jsonb arrays on the parent row

Parent entity tables MUST store these JSON Resume string arrays as `jsonb` defaulting to `'[]'::jsonb`:

- `cv_work.highlights`, `cv_volunteer.highlights`, `cv_education.courses`
- `cv_skill.keywords`, `cv_interest.keywords`
- `cv_project.highlights`, `cv_project.keywords`, `cv_project.roles`

`cv_basics.location` MUST store the JSON Resume `basics.location` object as `jsonb` defaulting to `'{}'::jsonb`.

Application code MUST treat missing or null database values as empty arrays when assembling JSON Resume output, and an empty object for missing `cv_basics.location`.

#### Scenario: Work highlights persist as jsonb

- **WHEN** a work row is saved with highlights `["Built API", "Led team"]`
- **THEN** the `cv_work.highlights` column SHALL store a jsonb array of strings with that content

#### Scenario: Empty keywords default

- **WHEN** a skill row is created without keywords
- **THEN** `cv_skill.keywords` SHALL be `'[]'::jsonb` after insert

#### Scenario: Empty location default

- **WHEN** a CV is created without basics location data
- **THEN** `cv_basics.location` SHALL be `'{}'::jsonb` after insert

### Requirement: Singleton basics SHALL use one row per CV

`cv_basics` SHALL use `cv_id` as primary key (one row maximum per CV). Creating a CV SHALL insert an empty `cv_basics` row with `location = '{}'::jsonb`. Location fields inside the jsonb object MAY be absent until the user provides address data.

#### Scenario: New CV gets empty basics row

- **WHEN** a CV is created via the API
- **THEN** a corresponding `cv_basics` row SHALL exist for that `cv_id`

### Requirement: Normalized tables MUST inherit CV row-level security

Each child table SHALL enable RLS with policies allowing SELECT, INSERT, UPDATE, and DELETE only when the linked `cv.user_id` equals `auth.uid()`, consistent with existing `public.cv` isolation.

#### Scenario: Cross-tenant work row access denied

- **WHEN** user A's JWT is used to query `cv_work` rows belonging to user B's CV
- **THEN** Postgres RLS SHALL return no rows and SHALL NOT allow mutation

### Requirement: Indexes SHALL support section listing by CV

Each multi-valued table MUST have an index on `(cv_id, sort)`. The `cv` table MUST retain an index on `(user_id, updated_at desc)`.

#### Scenario: List work by cv_id uses index

- **WHEN** the API loads all work rows for a CV
- **THEN** the query SHALL filter by `cv_id` and order by `sort` using the defined composite index
