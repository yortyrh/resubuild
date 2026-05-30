## MODIFIED Requirements

### Requirement: E2E catalog SHALL map specs to capabilities

The repository MUST maintain the catalog table below mapping E2E describe blocks to capabilities and stable contracts. When import URL behavior adds JSON vs agent job paths, catalog descriptions SHALL be updated without removing invalid-URL regression guards.

| E2E file / describe block                | Capability                                | Stable contract                                                                                   |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `auth (local Supabase)`                  | `authentication`                          | Login + `/auth/me` for fixture user                                                               |
| `CV REST (local Supabase)`               | `cv-rest-api`, `resume-schema-validation` | List/get seeded CVs; profile photo assignment; reject invalid JSON                                |
| `media service (local Supabase)`         | `resume-media-uploads`                    | Public GET stream; owner meta; authenticated upload                                               |
| `CV export (local Supabase)`             | `cv-export`                               | Template catalog; HTML export for seeded CV                                                       |
| `CV template presentation`               | `cv-template-presentation`                | GET defaults; PATCH hidden sections round-trip                                                    |
| `CV lifecycle (local Supabase)`          | `cv-rest-api`                             | PATCH template + basics; DELETE ephemeral CV                                                      |
| `CV sections coverage (local Supabase)`  | `cv-items-api`                            | Basics/education/languages GET; work create/delete by row id                                      |
| `AI agent catalog (local Supabase)`      | `ai-agent-settings`                       | Provider catalog; active status unconfigured for fixture user                                     |
| `import LLM config (local Supabase)`     | `import-llm-config`                       | Provider catalog; config unconfigured for fixture user                                            |
| `import URL validation (local Supabase)` | `cv-import-url`                           | Reject invalid URLs on `POST /cv/import/from-url`; JSON Resume URLs may return `{ kind: 'json' }` |

Changes that only affect `cv-editor-ui` or `web-application` MUST NOT modify API E2E specs unless the REST contract also changed.

#### Scenario: UI-only change leaves E2E untouched

- **WHEN** a change modifies only CV editor layout components
- **THEN** its tasks **E2E test impact** lists existing auth/CV/media scenarios under **Must pass unchanged**
- **AND** no edits are made to `local-supabase.e2e-spec.ts`

#### Scenario: Invalid import URL still rejected

- **WHEN** E2E calls `POST /cv/import/from-url` with a malformed URL
- **THEN** the API SHALL respond with 400
- **AND** SHALL NOT enqueue an agent job
