# Resume JSON Schema validation

## Purpose

Ensure every persisted `data` payload conforms to the JSON Resume standard used by the ecosystem, using a single shared schema artifact and server-side validation before writes.

## Requirements

### Requirement: The API MUST validate CV `data` with AJV against the shared JSON Schema

The NestJS `ResumeSchemaValidator` SHALL load `@resumind/schemas` (`resume.schema.json`), compile it with AJV (including format support), and reject invalid payloads before they are stored, returning 400 with structured error messages when validation fails.

#### Scenario: Invalid resume JSON

- **WHEN** create or update carries `data` that does not satisfy the schema
- **THEN** the API SHALL respond with 400 and a message indicating the resume does not match the JSON Resume schema, including per-path error strings

#### Scenario: Resolver paths

- **WHEN** the API process runs from the monorepo root or the `apps/api` package directory
- **THEN** the validator SHALL resolve the schema file from one of the supported relative paths without failing at startup
