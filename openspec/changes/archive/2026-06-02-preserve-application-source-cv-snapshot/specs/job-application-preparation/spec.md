## MODIFIED Requirements

### Requirement: Prepare Application SHALL produce a job_application record with tailored artifacts in one run

On successful workflow completion, the system SHALL persist a `job_application` row containing: extracted job metadata (title, company when known), reference to the selected live `source_cv_id` when available, a persisted `source_cv_snapshot` JSON copy of the base CV used for tailoring, reference to a new `tailored_cv_id` clone, and a `cover_letter` **Markdown** draft in the job posting language unless the optional user message specifies another language. The application SHALL be owned by the authenticated user. The flow SHALL NOT require or expose AI chat for refinement.

#### Scenario: Successful prepare creates linked records

- **WHEN** the prepare workflow completes successfully
- **THEN** a `job_application` row SHALL exist for the user
- **AND** `tailored_cv_id` SHALL reference a CV clone derived from the selected base CV content
- **AND** `source_cv_snapshot` SHALL contain a persisted resume JSON copy used for future regeneration
- **AND** `cover_letter` SHALL contain non-empty Markdown draft text

#### Scenario: User views application workspace after prepare

- **WHEN** a signed-in user opens an application they own
- **THEN** the UI SHALL show the cover letter, tailored CV editor entry, job summary, and selection rationale
- **AND** SHALL NOT show an AI chat panel

## ADDED Requirements

### Requirement: Application regeneration SHALL fallback to saved base CV snapshots

Retry and update flows SHALL regenerate from the persisted `source_cv_snapshot` when live base CV rows are no longer available. When fallback is used, the workflow SHALL keep regeneration functional without requiring the original source CV id to remain in the user library.

#### Scenario: Retry succeeds after base CV deletion

- **WHEN** an application has no resolvable live `source_cv_id` but has a valid `source_cv_snapshot`
- **THEN** retry SHALL regenerate the tailored CV and cover letter from the snapshot
- **AND** SHALL set source metadata so clients can indicate saved-copy fallback

#### Scenario: Update succeeds after base CV deletion

- **WHEN** update is requested for a ready application whose live source CV has been deleted
- **THEN** update SHALL use `source_cv_snapshot` as the base resume input
- **AND** SHALL produce a new tailored clone without requiring a live source CV row
