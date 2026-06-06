## 1. Shared helpers

- [ ] 1.1 Add `scripts/lib/railway-env.mjs` with pure-function helpers: `base64urlEncode(buf)`, `base64urlDecode(str)`, `randomBase64(bytes)`, `randomHex(bytes)`, `signHs256(header, payload, secret)`, `buildSupabaseJwt({ role, secret, ref?, iss?, kid?, expYears? })`, `defaultServiceHostnames()` (returns the `<service>.up.railway.app` placeholders).
- [ ] 1.2 Add `scripts/lib/railway-env.mjs` formatter helpers: `formatDotenv(groups)`, `formatShell(groups)`, `formatJson(groups)`, where `groups` is a `{ serviceName: { KEY: value } }` map.
- [ ] 1.3 Add `scripts/lib/railway-env.mjs` env builder: `buildEnvGroups({ hostnames, noHostnames })` returning the canonical `{ web, api, auth, rest, storage, realtime, db, studio, imgproxy, kong, supabase-admin }` groups with all required keys populated from generated secrets + hostnames.
- [ ] 1.4 Add `scripts/lib/railway-env.mjs.test.mjs` (Node `--test` runner, beside the file) with unit tests for: `base64urlEncode` round-trips, `signHs256` matches a known HS256 vector, `buildSupabaseJwt` produces a JWT with the documented `iss` / `ref` / `role` / `kid` / `iat` / `exp` / `sub` claims and decodes into the same payload, `buildEnvGroups` includes every required key, `formatDotenv` quotes values containing `#` / `=` / whitespace, `formatShell` emits `export KEY="value"`, `formatJson` returns a valid object whose top-level keys are service names. Run with `node --test scripts/lib/railway-env.mjs.test.mjs`.

## 2. Top-level entrypoint

- [ ] 2.1 Add `scripts/generate-railway-supabase-env.mjs` as a thin Node ESM wrapper: parse `argv` for `--format`, `--output`, `--seed`, `--no-hostnames`, `--web-host`, `--api-host`, `--auth-host`, `--rest-host`, `--storage-host`, `--realtime-host`, `--db-host`, `--studio-host`, `--kong-host`, `--imgproxy-host`, `--admin-host`; honour `RAILWAY_*_HOST` env vars as defaults; call `buildEnvGroups` then write via the requested formatter. On unknown flag, print usage to stderr and `process.exit(1)`. On success, print a one-paragraph summary to stderr (env-var count, service count, output path if any, "do not commit" reminder) and exit 0.
- [ ] 2.2 Wire `crypto.randomBytes` to honour `--seed` (use `crypto.createHash('sha256').update(seed).digest()` as the deterministic source for the first round of randomness; subsequent random values derive from a counter) so re-running with the same seed produces byte-identical output.
- [ ] 2.3 Add `scripts/generate-railway-supabase-env.mjs.test.mjs` (beside the file) with integration-style tests: spawn the script via `node:child_process#execFile` and assert stdout contains `POSTGRES_PASSWORD=`, `JWT_SECRET=`, `ANON_KEY=`, `SERVICE_ROLE_KEY=`, `SECRET_KEY_BASE=`, `PG_META_CRYPTO_KEY=`, `AI_AGENT_ENCRYPTION_KEY=`, `SUPABASE_URL=`, `NEXT_PUBLIC_API_URL=`, `CORS_ORIGIN=`, plus the `# === api ===` / `# === web ===` / `# === auth ===` / `# === db ===` section comments. Run with `node --test scripts/generate-railway-supabase-env.mjs.test.mjs`. Use `--seed` in the test to keep output deterministic.

## 3. Root script wiring

- [ ] 3.1 Add `"railway:env": "node scripts/generate-railway-supabase-env.mjs"` to the `scripts` block in `package.json` (root). No new dev dependencies.
- [ ] 3.2 Verify `pnpm railway:env` is **not** referenced by any turbo pipeline task in `package.json` or `turbo.json` and is **not** included in the `pnpm verify` chain (`grep` to confirm). The script remains a developer-only helper.

## 4. Documentation

- [ ] 4.1 Add a "Railway env generation" section to `scripts/README.md` (or create the file if it does not exist) with: a one-line description, the supported flags, a sample invocation for each `--format`, and a short "which block goes in which Railway service" table mapping `# === web ===` → `web` service, `# === api ===` → `api` service, `# === auth ===` → GoTrue service, `# === rest ===` → PostgREST service, `# === storage ===` → Storage service, `# === db ===` → Postgres service, etc.
- [ ] 4.2 Add a short paragraph to the root `README.md` "Deploy to Railway" section (or to the existing "Cloud Supabase setup" section) pointing at `pnpm railway:env` as the first step of a Railway deployment, with a single inline example.

## 5. Verification

- [ ] 5.1 From the repo root, run `pnpm railway:env --seed test-seed --no-hostnames` and confirm stdout contains only the secret env vars, with no `*_URL` or `*_HOST` lines.
- [ ] 5.2 From the repo root, run `pnpm railway:env --seed test-seed --web-host example-web.up.railway.app --api-host example-api.up.railway.app --auth-host example-auth.up.railway.app --format json --output /tmp/railway-env.json` and confirm `/tmp/railway-env.json` parses as JSON, has top-level keys for `web`, `api`, `auth`, `rest`, `storage`, `db`, etc., and that `api.CORS_ORIGIN === "https://example-web.up.railway.app"` and `api.SUPABASE_URL === "https://example-auth.up.railway.app"`.
- [ ] 5.3 From the repo root, run `node --test scripts/lib/railway-env.mjs.test.mjs scripts/generate-railway-supabase-env.mjs.test.mjs -- --run` and confirm all unit tests pass.
- [ ] 5.4 From the repo root, run `pnpm format:check` and `pnpm lint` and confirm the new files pass Prettier and Biome.
- [ ] 5.5 From the repo root, run `pnpm typecheck` and confirm the repo still type-checks (the new script is plain ESM and has no TS surface, but verify the workspace builds).

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth: login + `/auth/me` + 401 without token
- `local-supabase.e2e-spec.ts` — CV REST: list seeded ids, get by id, profile photos, invalid POST 400
- `local-supabase.e2e-spec.ts` — media: public stream, owner meta, authenticated upload, 401 without token
- `local-supabase.e2e-spec.ts` — Export: HTML + JSON export, template catalog
- `local-supabase.e2e-spec.ts` — Template presentation, lifecycle, sections coverage
- `local-supabase.e2e-spec.ts` — AI agent catalog, import LLM config
- `local-supabase.e2e-spec.ts` — Import URL validation
- `local-supabase.e2e-spec.ts` — MCP server: 20 tools, 3 resources, key limits, revoked-key 401, JWT 401

### Update required

- None — the new script is purely additive and does not change any API, web, MCP, auth, or database contract that the E2E suite covers.

### Add

- None — E2E coverage is local-Supabase-only. Live verification of the generated Railway env-var set against a running GoTrue / PostgREST belongs to the separate `deploy-railway-self-hosted-supabase` change (bootstrap step) and is out of scope for the generator.
