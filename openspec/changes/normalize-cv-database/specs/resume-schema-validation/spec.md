## MODIFIED Requirements

### Requirement: The API MUST validate CV `data` with AJV against the shared JSON Schema

The NestJS `ResumeSchemaValidator` SHALL load `@resumind/schemas` (`resume.schema.json`), compile it with AJV (including format support), and reject invalid assembled resume documents before they are stored, returning 400 with structured error messages when validation fails. For normalized storage, the validator SHALL operate on the JSON Resume object produced by assembling normalized rows (or on the incoming `data` payload before disassembly on bulk import), not on raw database rows.

#### Scenario: Invalid resume JSON on create

- **WHEN** create carries `data` that does not satisfy the schema after assembly
- **THEN** the API SHALL respond with 400 and a message indicating the resume does not match the JSON Resume schema, including per-path error strings
- **AND** no normalized section rows beyond the empty baseline SHALL remain from a failed create transaction

#### Scenario: Resolver paths

- **WHEN** the API process runs from the monorepo root or the `apps/api` package directory
- **THEN** the validator SHALL resolve the schema file from one of the supported relative paths without failing at startup

## ADDED Requirements

### Requirement: Section-scoped writes SHALL validate entity DTO shape before persistence

Item-scoped create and update routes SHALL validate request bodies against entity DTOs (class-validator) before writing normalized rows. Full JSON Resume schema validation MAY be deferred for single-field section patches but MUST run for bulk import and full-document replace operations.

#### Scenario: Invalid work DTO rejected

- **WHEN** a client sends a work create payload with invalid field types
- **THEN** the API SHALL return 400 from DTO validation without inserting a `cv_work` row

#### Scenario: Import validates full assembled document

- **WHEN** a client creates a CV with a complete imported JSON Resume document
- **THEN** the API SHALL assemble/disassemble and run full JSON Resume schema validation before committing all section rows
