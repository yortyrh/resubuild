# API E2E tests

In-process Nest (`AppModule` via Supertest, same `configureApp()` wiring as production). `global-setup.ts` starts throw-away containers with Testcontainers (Postgres on tmpfs, RustFS S3 storage, Mailpit), applies the migrations, creates the buckets and seeds the fixture accounts with the same code as `pnpm samples:seed`; `global-teardown.ts` stops them. Only Docker (or Podman) is needed. Runs in the CI `e2e` job, not in `pnpm test`.

```bash
pnpm test:e2e
```

- `.samples/e2e-fixture.json` (committed) lists the `developerUser` / `e2eUser` accounts, the JSON Resume files and the profile photos to seed.
- Seeding resets both accounts and writes the following files, both gitignored:
  - `.samples/e2e-fixture.state.json`: ids and URLs for the e2e account.
  - `.samples/local-credentials.json`: passwords for this machine. Show them with `pnpm local:credentials`.
- Email flows are asserted through the Mailpit API (`auth-helpers.ts`).

Rule: a change that does not alter an API contract must not edit these specs. A change that does alter one updates only the affected scenarios.

## Catalog (`api.e2e-spec.ts`)

| Area                  | Contract                                                                                                                                                                                                                                         | Requirements          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Auth                  | Sign-in via `/api/auth`; `/auth/me`; 401 without/unknown token; logout revokes; sign-up + emailed verification; reset via emailed link; magic link and OTP; another user cannot read/patch/delete fixture CVs                                    | REQ-AUTH-001…007      |
| CV REST               | Seeded ids listed; get by id; every CV has `basics.image`; invalid POST → 400; skills reorder; work patch by row id                                                                                                                              | REQ-CV-002…008        |
| Media                 | Public GET streams bytes; owner GET meta; authenticated upload returns `{ id, url, contentType }`; upload without token → 401                                                                                                                    | REQ-CV-012            |
| Export                | `GET /cv/export/templates`; HTML export; JSON export with `basics.name` and `application/json`                                                                                                                                                   | REQ-EXP-001, 006, 007 |
| Template presentation | GET defaults; PATCH hidden sections round-trip                                                                                                                                                                                                   | REQ-CV-013            |
| Lifecycle             | PATCH template + basics; DELETE ephemeral CV                                                                                                                                                                                                     | REQ-CV-002, 003       |
| Sections              | GET basics/education/languages; work create + delete by row id                                                                                                                                                                                   | REQ-CV-004, 005, 009  |
| AI agent / import LLM | Provider catalogs with model option fields; active config unconfigured for fixture user; account with model options and default display name; 409 for a second unlabeled account on the same model; 400 for options the provider does not accept | REQ-IMP-008           |
| Import URL            | `POST /cv/import/from-url` rejects malformed URLs with 400 and enqueues no job                                                                                                                                                                   | REQ-IMP-004           |
| MCP                   | Initialize returns `mcp-session-id`; `tools/list` equals `MCP_TOOL_NAMES`; 3 resource templates; per-tool smoke calls; key limits; revoked key → 401; JWT on `/mcp` → 401; `MCP_SERVER_ENABLED=false` → 404                                      | REQ-MCP-001…004       |
