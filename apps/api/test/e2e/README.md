# API E2E tests

In-process Nest (`AppModule` via Supertest, same `ValidationPipe` as production) against the **local Supabase** stack, using env from `apps/api/.env`. They are not part of `pnpm test` or CI.

```bash
supabase start && pnpm setup:env && pnpm samples:seed
pnpm test:e2e
```

- `.samples/e2e-fixture.json` (committed) lists the `developerUser` / `e2eUser` accounts, the JSON Resume files and the profile photos to seed.
- `pnpm samples:seed` resets both accounts and writes the following files, both gitignored:
  - `.samples/e2e-fixture.state.json`: ids and URLs for the e2e account.
  - `.samples/local-credentials.json`: passwords for this machine. Show them with `pnpm local:credentials`.
- `global-setup.ts` fails fast with instructions when env or the state file is missing.

Rule: a change that does not alter an API contract must not edit these specs. A change that does alter one updates only the affected scenarios.

## Catalog (`local-supabase.e2e-spec.ts`)

| Area                  | Contract                                                                                                                                                                                                    | Requirements          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Auth                  | Login fixture user; `/auth/me` with Bearer; 401 without token                                                                                                                                               | REQ-AUTH-001, 003     |
| CV REST               | Seeded ids listed; get by id; every CV has `basics.image`; invalid POST → 400; skills reorder; work patch by row id                                                                                         | REQ-CV-002…008        |
| Media                 | Public GET streams bytes; owner GET meta; authenticated upload returns `{ id, url, contentType }`; upload without token → 401                                                                               | REQ-CV-012            |
| Export                | `GET /cv/export/templates`; HTML export; JSON export with `basics.name` and `application/json`                                                                                                              | REQ-EXP-001, 006, 007 |
| Template presentation | GET defaults; PATCH hidden sections round-trip                                                                                                                                                              | REQ-CV-013            |
| Lifecycle             | PATCH template + basics; DELETE ephemeral CV                                                                                                                                                                | REQ-CV-002, 003       |
| Sections              | GET basics/education/languages; work create + delete by row id                                                                                                                                              | REQ-CV-004, 005, 009  |
| AI agent / import LLM | Provider catalogs; active config unconfigured for fixture user                                                                                                                                              | REQ-IMP-008           |
| Import URL            | `POST /cv/import/from-url` rejects malformed URLs with 400 and enqueues no job                                                                                                                              | REQ-IMP-004           |
| MCP                   | Initialize returns `mcp-session-id`; `tools/list` equals `MCP_TOOL_NAMES`; 3 resource templates; per-tool smoke calls; key limits; revoked key → 401; JWT on `/mcp` → 401; `MCP_SERVER_ENABLED=false` → 404 | REQ-MCP-001…004       |
