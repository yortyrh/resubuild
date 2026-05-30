## MODIFIED Requirements

### Requirement: E2E changes SHALL document impact in tasks.md

Each change `tasks.md` MUST end with an **E2E test impact** section listing scenarios that must pass unchanged, scenarios that need updates, and new scenarios to add. Implementation agents MUST NOT weaken unrelated E2E assertions to make a change pass.

#### Scenario: tasks.md includes E2E section

- **WHEN** a change is ready for `/opsx:apply`
- **THEN** its `tasks.md` SHALL contain `## E2E test impact` with subsections **Must pass unchanged**, **Update required**, and **Add**

## ADDED Requirements

### Requirement: E2E catalog SHALL include JSON export

The test catalog for `local-supabase.e2e-spec.ts` SHALL list JSON export alongside existing HTML export coverage.

#### Scenario: JSON export smoke test

- **WHEN** E2E requests `GET /cv/:id/export/json` for a seeded owned CV with a valid bearer token
- **THEN** the response status SHALL be 200
- **AND** the `Content-Type` SHALL include `application/json`
- **AND** the parsed body SHALL include `basics.name` matching the seeded CV
