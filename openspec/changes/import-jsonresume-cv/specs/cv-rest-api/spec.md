## MODIFIED Requirements

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a row with empty `data`, merge schema meta via shared `@resumind/types` helpers, validate, then update the row with the validated document in a second step. The final update SHALL set `title` from `deriveCvTitleFromBasics` applied to the validated `data.basics` (ignoring client-supplied `title` when basics are present). When `data` contains a full imported JSON Resume (multiple sections beyond `basics`), the same flow SHALL apply: incoming `meta` from the client SHALL be replaced by `applyResumeMetaForCreate`, and the full document SHALL be validated against the JSON Resume schema before persist.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics`
- **THEN** the response SHALL include the new row with persisted `data` including applied meta and schema-valid content
- **AND** `title` SHALL reflect the derived value from basics

#### Scenario: Successful create from imported full resume

- **WHEN** `POST /cv` includes valid `data` with `basics`, `work`, `education`, and other JSON Resume sections as produced by `prepareImportedResume`
- **THEN** the response SHALL persist all supplied sections
- **AND** `data.meta` SHALL reflect Resumind canonical URL and version from `applyResumeMetaForCreate`, not the import source's meta

#### Scenario: Imported document fails schema validation

- **WHEN** `POST /cv` includes `data` that violates the JSON Resume schema after meta merge
- **THEN** the API SHALL respond with 400 and structured validation errors
- **AND** SHALL NOT leave a partially populated CV row (create rollback or failed second-step update per existing create implementation)
