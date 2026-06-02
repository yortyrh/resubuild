## MODIFIED Requirements

### Requirement: Users SHALL list and revisit past applications

The API SHALL expose `GET /applications` returning only active, list-visible applications for the authenticated user ordered by `updated_at` descending with summary fields (job title, company, status, timestamps). Update replacement drafts and failed/incomplete staged rows SHALL be excluded from the default listing. The web app SHALL provide a list/history view and deep link to each listed workspace.

#### Scenario: Application history list excludes staged replacement draft

- **WHEN** a signed-in user has one active application and one staged replacement draft linked to it
- **THEN** the applications list SHALL show only the active application row
- **AND** the staged replacement draft SHALL NOT appear in the default list

### Requirement: Application regeneration SHALL fallback to saved base CV snapshots

Retry and update flows SHALL regenerate from the persisted `source_cv_snapshot` when live base CV rows are no longer available. When fallback is used, the workflow SHALL keep regeneration functional without requiring the original source CV id to remain in the user library. For update flows, snapshot-based regeneration SHALL run against a staged replacement draft while preserving the currently active application until swap success.

#### Scenario: Retry succeeds after base CV deletion

- **WHEN** an application has no resolvable live `source_cv_id` but has a valid `source_cv_snapshot`
- **THEN** retry SHALL regenerate the tailored CV and cover letter from the snapshot
- **AND** SHALL set source metadata so clients can indicate saved-copy fallback

#### Scenario: Update succeeds after base CV deletion

- **WHEN** update is requested for a ready application whose live source CV has been deleted
- **THEN** update SHALL use `source_cv_snapshot` as the base resume input
- **AND** SHALL produce a new staged tailored clone without requiring a live source CV row
- **AND** SHALL keep the original application active until staged update completion swaps records
