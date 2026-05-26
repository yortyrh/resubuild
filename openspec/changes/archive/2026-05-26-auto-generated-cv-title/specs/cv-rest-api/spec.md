## ADDED Requirements

### Requirement: CV title SHALL derive from basics on create and basics patch

The API service SHALL compute `cv.title` from `data.basics.name` and `data.basics.label` using the shared derivation function in `@resumind/types` whenever a CV is created with basics data or when `PATCH /cv/:cvId/basics` (or equivalent basics merge) succeeds. The derived title SHALL be persisted in the `title` column in the same write as the updated `data`. Product clients SHALL NOT rely on sending a separate `title` field to keep the display string in sync.

#### Scenario: Create derives title from basics

- **WHEN** `POST /cv` includes `data.basics` with name `Alex` and label `Designer`
- **THEN** the created row SHALL have `title` equal to `Alex — Designer`
- **AND** the response SHALL include the derived title

#### Scenario: Basics patch updates title

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` changing `name` or `label`
- **THEN** the service SHALL merge basics, validate, persist `data`, and update `title` to the newly derived value in one operation

#### Scenario: Empty basics yields default title

- **WHEN** a create or basics patch results in empty name and label after trim
- **THEN** `title` SHALL be `Untitled CV`

#### Scenario: Name-only basics

- **WHEN** basics contain name `Alex` and no label
- **THEN** derived `title` SHALL be `Alex`

## MODIFIED Requirements

### Requirement: Create and update payloads MUST be validated with class-validator DTOs

`POST` bodies SHALL use `CreateCvDto` (optional `title`, required `data` object). `PATCH` bodies SHALL use `UpdateCvDto` (optional `title`, optional `data`). The global validation pipe SHALL strip unknown properties and reject invalid shapes. When `data.basics` is supplied on create or when basics are patched via item routes, the service SHALL overwrite any client-provided `title` with the value derived from basics.

#### Scenario: Invalid DTO

- **WHEN** the body violates DTO constraints (e.g. missing `data` on create)
- **THEN** the framework SHALL return 400 without persisting

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a row with empty `data`, merge schema meta via shared `@resumind/types` helpers, validate, then update the row with the validated document in a second step. The final update SHALL set `title` from `deriveCvTitleFromBasics` applied to the validated `data.basics` (ignoring client-supplied `title` when basics are present).

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics`
- **THEN** the response SHALL include the new row with persisted `data` including applied meta and schema-valid content
- **AND** `title` SHALL reflect the derived value from basics
