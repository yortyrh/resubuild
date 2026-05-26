# E2E testing (local Supabase)

## Purpose

Define how Resumind runs integration tests against a real local Supabase stack (Postgres RLS, Auth, Storage) and the Nest API services—not mocked unit doubles. E2E tests validate end-to-end contracts that unit tests intentionally isolate.

## Requirements

### Requirement: A committed fixture SHALL describe seed accounts and sample assets

The repository MUST include `.samples/e2e-fixture.json` listing:

- **`developerUser`** / **`e2eUser`** — fixed emails in the committed fixture; **passwords are generated once per machine** in gitignored `.samples/local-credentials.json` on first `pnpm samples:seed`.
- **`cvProfilePhotos`** — maps each resume JSON file to a profile image; every CV gets `basics.image` on seed.
- Every JSON Resume file under `.samples/resumes/jsonresume/`.
- Every profile image under `.samples/media/` (uploaded to Storage; CVs use the mapped subset).

#### Scenario: Developer inspects fixture before seeding

- **WHEN** they open `.samples/e2e-fixture.json`
- **THEN** they see both account credentials and the full list of resumes and media files the seed script will create

### Requirement: A seed script SHALL populate local Supabase for both accounts

`scripts/seed-e2e-fixture.mjs` MUST, for **each** of `developerUser` and `e2eUser`:

1. Create or reset the Supabase Auth user (password synced on re-run).
2. Clear that user's previous CV and media rows (Storage + Postgres).
3. Insert one CV per listed JSON Resume.
4. Upload each listed media file to Storage and `public.media`.
5. Assign each CV's `basics.image` from `cvProfilePhotos` (every CV gets a profile photo).

The script MUST write `.samples/e2e-fixture.state.json` with ids/urls for the **e2e** account only (used by `pnpm test:e2e`). It MUST write `.samples/local-credentials.json` (gitignored) with unique passwords for this machine and print them to the console. **`pnpm local:credentials`** re-displays them anytime.

The seed script requires **`pnpm setup:env`** after `supabase start`. It writes directly to Supabase — **no Nest API process needed**.

#### Scenario: Fresh local stack before E2E

- **WHEN** a developer runs `supabase start`, `pnpm setup:env`, then `pnpm samples:seed`
- **THEN** `.samples/e2e-fixture.state.json` exists with CV and media ids matching Supabase rows

### Requirement: E2E tests SHALL run against in-process Nest with real Supabase env

`apps/api/test/e2e/*.e2e-spec.ts` MUST bootstrap `AppModule` via Supertest (same ValidationPipe as production) using env from `apps/api/.env`. Tests MUST fail fast when env or state file is missing (`global-setup.ts`).

Root script: **`pnpm test:e2e`** → `apps/api` Jest config `test/e2e/jest-e2e.config.cjs`.

E2E tests are **not** part of default `pnpm test` / CI unit-test jobs—they require local Supabase.

#### Scenario: E2E without seed

- **WHEN** a developer runs `pnpm test:e2e` without `.samples/e2e-fixture.state.json`
- **THEN** Jest global setup fails with instructions to run `pnpm samples:seed`

### Requirement: Each OpenSpec change SHALL declare E2E test impact

Every change under `openspec/changes/<name>/tasks.md` MUST include an **E2E test impact** section with three lists:

1. **Must pass unchanged** — regression guards; do not edit these specs to greenwash a breaking change.
2. **Update required** — existing E2E specs that must change because behavior intentionally changed.
3. **Add** — new E2E specs or scenarios to cover new behavior.

If a change does not touch API, media, auth, or CV persistence, the section MAY state `None — UI-only change`.

#### Scenario: API behavior change with intentional contract update

- **WHEN** a change modifies `POST /cv` response shape
- **THEN** its tasks list names `local-supabase.e2e-spec.ts` under **Update required** and lists affected scenarios; unrelated media/auth scenarios remain under **Must pass unchanged**

#### Scenario: UI-only styling change

- **WHEN** a change only adjusts Tailwind classes in the web app
- **THEN** tasks **E2E test impact** states no E2E updates and no test edits are made

### Requirement: E2E catalog SHALL map specs to capabilities

| E2E file / describe block        | Capability                                | Stable contract                                                    |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `auth (local Supabase)`          | `authentication`                          | Login + `/auth/me` for fixture user                                |
| `CV REST (local Supabase)`       | `cv-rest-api`, `resume-schema-validation` | List/get seeded CVs; profile photo assignment; reject invalid JSON |
| `media service (local Supabase)` | `resume-media-uploads`                    | Public GET stream; owner meta; authenticated upload                |

Changes that only affect `cv-editor-ui` or `web-application` MUST NOT modify API E2E specs unless the REST contract also changed.

#### Scenario: UI-only change leaves E2E untouched

- **WHEN** a change modifies only CV editor layout components
- **THEN** its tasks **E2E test impact** lists existing auth/CV/media scenarios under **Must pass unchanged**
- **AND** no edits are made to `local-supabase.e2e-spec.ts`

## Test catalog (current)

### `local-supabase.e2e-spec.ts`

**Must pass unchanged** unless the corresponding capability spec intentionally changes:

- Auth: login fixture user; `/auth/me` with Bearer; 401 without token
- CV: all seeded ids present in list; get by id; every CV has `basics.image`; invalid POST returns 400
- Media: public GET streams bytes; owner GET meta; authenticated upload returns `{ id, url, contentType }`; upload without token returns 401

## tasks.md template (E2E test impact)

Each change `tasks.md` MUST end with:

```markdown
## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth: login + /auth/me
- …

### Update required

- None

### Add

- None
```
