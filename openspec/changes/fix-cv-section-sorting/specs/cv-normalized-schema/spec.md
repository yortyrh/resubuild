## MODIFIED Requirements

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

## MODIFIED Requirements

### Requirement: Indexes SHALL support section listing by CV

`cv_profile`, `cv_skill`, `cv_language`, `cv_interest`, and `cv_reference` MUST have an index on `(cv_id, sort)`. Date-primary tables MUST have an index on `(cv_id, <date column>)` appropriate to the section: `cv_work`, `cv_volunteer`, `cv_education`, and `cv_project` on `(cv_id, end_date)`; `cv_award` and `cv_certificate` on `(cv_id, date)`; `cv_publication` on `(cv_id, release_date)`. The `cv` table MUST retain an index on `(user_id, updated_at desc)`.

#### Scenario: List skills by cv_id uses sort index

- **WHEN** the API loads all skill rows for a CV
- **THEN** the query SHALL filter by `cv_id` and order by `sort` using the defined composite index

#### Scenario: List work by cv_id uses end_date index

- **WHEN** the API loads all work rows for a CV
- **THEN** the query SHALL filter by `cv_id` and order by `end_date` using the defined composite index
