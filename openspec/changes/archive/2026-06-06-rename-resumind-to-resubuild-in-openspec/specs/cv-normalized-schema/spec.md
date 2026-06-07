## MODIFIED Requirements

### Requirement: Date-primary sections SHALL list by date attributes

Services that list `cv_work`, `cv_volunteer`, `cv_education`, and `cv_project` SHALL order by `end_date DESC NULLS FIRST`, then `start_date DESC`, then `id ASC`. A null or absent `end_date` SHALL represent an ongoing role and SHALL sort before any row with a set `end_date`. Services that list `cv_award` and `cv_certificate` SHALL order by `date DESC NULLS LAST`, then `id ASC`. Services that list `cv_publication` SHALL order by `release_date DESC NULLS LAST`, then `id ASC`.

Shared in-memory sort helpers in `@resubuild/types` (`sortSectionRows` and section-specific `sort*Rows` functions) SHALL implement the same ordering rules as API list and full-CV assembly paths.

#### Scenario: Ongoing work entry listed first

- **WHEN** two work rows exist for a CV where row A has `start_date` `2020-01` and no `end_date`, and row B has `start_date` `2022-06` and `end_date` `2024-01`
- **THEN** listing or assembling work entries SHALL return row A before row B

#### Scenario: Work entries with end dates ordered by end date

- **WHEN** two work rows exist where row A has `end_date` `2022-06` and row B has `end_date` `2024-01`
- **THEN** listing or assembling work entries SHALL return row B before row A regardless of start dates

#### Scenario: Award entries returned by date

- **WHEN** two award rows exist with `date` values `2019` and `2021`
- **THEN** listing or assembling awards SHALL return the 2021 entry first
