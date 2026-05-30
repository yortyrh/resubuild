## MODIFIED Requirements

### Requirement: E2E catalog SHALL list scenarios with stable identifiers

The repository MUST maintain a catalog table in this spec mapping scenario ids to Jest describe blocks and primary assertions. When import URL behavior changes, catalog descriptions SHALL reflect synchronous JSON vs async agent paths without removing regression guards for invalid URL rejection.

| Scenario id                              | Describe block  | Primary assertion                                          |
| ---------------------------------------- | --------------- | ---------------------------------------------------------- |
| `import URL validation (local Supabase)` | `cv-import-url` | Reject invalid URLs on `POST /cv/import/from-url` with 400 |

#### Scenario: Invalid import URL rejected

- **WHEN** E2E calls `POST /cv/import/from-url` with a malformed URL
- **THEN** the API SHALL respond with 400
- **AND** SHALL NOT enqueue an agent job
