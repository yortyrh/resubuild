## MODIFIED Requirements

### Requirement: The system SHALL normalize external JSON Resume documents before create

A shared function in `@resumind/types` (e.g. `prepareImportedResume`) SHALL accept parsed JSON and return a plain object suitable for `POST /cv` `data`. It MUST reject non-object roots. It SHALL remove top-level `$schema` and `meta` from the import (Resumind meta is applied server-side on create). It SHALL ensure all standard JSON Resume array sections exist, defaulting missing or non-array values to empty arrays for: `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, and `projects`. It SHALL preserve `basics` and section item content without renaming JSON Resume fields except when reclassifying volunteer work entries per the volunteer reclassification requirement below.

After array sections are normalized, `prepareImportedResume` SHALL run volunteer reclassification: any `work[]` entry that describes an unpaid or volunteer role SHALL be removed from `work[]` and appended to `volunteer[]` with fields mapped to the JSON Resume volunteer shape (`name` or misplaced `organization` → `organization`; `position`, `url`, `startDate`, `endDate`, and `highlights` copied; `summary` and `description` merged into volunteer `summary`; work-only `location` and `description` omitted from the volunteer row). Reclassification SHALL use role text in `position`, `summary`, `description`, and `highlights` (not employer `name`) to detect volunteer/unpaid/community-service/pro-bono indicators. Entries that only mention "Volunteer" in the employer name SHALL remain in `work[]`.

#### Scenario: Volunteer role in work moves to volunteer on import

- **WHEN** `prepareImportedResume` receives a document whose `work[]` includes an entry with `summary` containing "Volunteer/part-time role" and a paid employment entry without volunteer indicators
- **THEN** the volunteer entry SHALL appear in `volunteer[]` with `organization` set from the work `name`
- **AND** the paid entry SHALL remain in `work[]`
- **AND** the volunteer entry SHALL NOT include work-only fields `name`, `location`, or `description`

#### Scenario: Employer name containing Volunteer does not trigger move

- **WHEN** `prepareImportedResume` receives a `work[]` entry whose `name` is "Volunteer State Community College" and role text does not contain volunteer/unpaid indicators
- **THEN** the entry SHALL remain in `work[]`
- **AND** `volunteer[]` SHALL not gain a duplicate from that entry

#### Scenario: Full sample file normalizes successfully

- **WHEN** `prepareImportedResume` receives a parsed object equivalent to `.samples/resumes/jsonresume/Jane Doe - Senior Software Engineer.json`
- **THEN** the result SHALL include all resume sections with array fields
- **AND** the result SHALL NOT include `$schema` or `meta`

#### Scenario: Minimal object gets empty arrays

- **WHEN** `prepareImportedResume` receives `{ "basics": { "name": "Alex" } }`
- **THEN** the result SHALL include `basics.name` equal to `Alex`
- **AND** `work`, `education`, and other array sections SHALL be empty arrays

#### Scenario: Non-object input rejected

- **WHEN** `prepareImportedResume` receives an array or string
- **THEN** it SHALL throw an error indicating the resume must be a JSON object
