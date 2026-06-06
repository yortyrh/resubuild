## Context

The repository already has a local-first Supabase workflow (`scripts/setup-local-env.sh`, `scripts/show-local-credentials.mjs`) that reads `supabase status -o env` and writes `apps/api/.env` + `apps/web/.env`. That script depends on a running `supabase start` stack on `localhost`, so it does not work in the Railway deploy path where the only Supabase is the self-hosted one being stood up on Railway services.

A separate change (`openspec/changes/deploy-railway-self-hosted-supabase/`) scopes the full Railway deployment — multi-service topology, Nixpacks/Dockerfile, healthchecks, public-vs-private networking, one-time bootstrap script. The user's request is a tighter, **additive** piece of that work: a standalone script that generates the env vars a developer needs to paste into Railway's per-service variable panel **before** any service is up. The script is offline-capable, deterministic, and idempotent — running it twice produces a fresh, valid set of secrets.

The env vars the script must produce mirror the canonical `supabase/.env` produced by `supabase init` (or `supabase start`):

- `POSTGRES_PASSWORD` — Postgres superuser password (32 bytes random).
- `JWT_SECRET` — HMAC secret used by GoTrue to sign Supabase JWTs.
- `ANON_KEY` — JWT with `role: "anon"`, HS256-signed with `JWT_SECRET`.
- `SERVICE_ROLE_KEY` — JWT with `role: "service_role"`, HS256-signed with `JWT_SECRET`, longer expiry.
- `SECRET_KEY_BASE` — 64-char hex used by GoTrue / PostgREST for cookie / payload encryption.
- `PG_META_CRYPTO_KEY` — symmetric key for `pg_meta` (Studio) query encryption.
- `SITE_URL`, `API_EXTERNAL_URL`, `SUPABASE_PUBLIC_URL` — public-facing hostnames Railway auto-assigns per service (the script accepts these as flags / env, with sensible defaults).
- `ADDITIONAL_REDIRECT_URLS` — comma-separated list of allowed OAuth / email redirect origins.

And the Resumind-side env vars the API and web app read:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` — server-side.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-side (web service).
- `NEXT_PUBLIC_API_URL` — browser-side (web service); points at the API's public Railway hostname.
- `AI_AGENT_ENCRYPTION_KEY` — base64-encoded 32-byte random key (mirrors `scripts/setup-local-env.sh#generate_encryption_key`).
- `MEDIA_BUCKET=media`, `MCP_EXPORT_BUCKET=mcp-exports` — bucket names from `supabase/config.toml`.
- `CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL` — server-side, computed from the public hostnames the user passes in.

The script does **not** start, configure, or talk to any service. It is a pure offline generator.

## Goals / Non-Goals

**Goals:**

- One command (`pnpm railway:env`) produces the complete env-var set a developer pastes into the Railway per-service variable panel.
- Output is grouped by Railway service (`web`, `api`, `auth` (GoTrue), `rest` (PostgREST), `storage`, `realtime`, `db`, `studio`, `imgproxy`, `kong`, `supabase-admin`) so the developer can paste each block into the right Railway service.
- Output is deterministic for a given `--seed` value (so the script is reproducible for re-deploys) and random otherwise.
- Pure Node ESM, `node:crypto` + `node:fs` only — no new npm dependencies.
- Three output formats: `dotenv` (default; one `KEY="value"` per line, with the section header as a `# ===` comment so the developer can copy-paste the whole file into Railway's RAW Editor and split by service using the comments), `shell` (`export KEY="value"` lines), `json` (a single JSON object).
- Reuse the existing `scripts/lib/local-credentials.mjs` pattern (pure-function helpers + thin top-level entrypoint) so the script fits the existing `scripts/` conventions.

**Non-Goals:**

- Pushing migrations, creating Storage buckets, seeding accounts, or starting Railway services (those are the bootstrap step in the separate `deploy-railway-self-hosted-supabase` change).
- Storing generated secrets in a persistent file or keychain — the script is one-shot; the developer pastes the output into Railway and Railway stores the values.
- Verifying that the generated keys round-trip against a live GoTrue / PostgREST (no live services in scope here; that verification happens when the bootstrap script runs migrations and seeds accounts).
- Changing the existing local workflow (`pnpm setup:env` → `apps/api/.env` + `apps/web/.env`).

## Decisions

### 1. Generate keys locally with `node:crypto` instead of calling Supabase services

**Choice:** The script generates `POSTGRES_PASSWORD`, `JWT_SECRET`, `SECRET_KEY_BASE`, `PG_META_CRYPTO_KEY`, and `AI_AGENT_ENCRYPTION_KEY` locally using `crypto.randomBytes(32)` (or `crypto.randomBytes(48)` for the 64-char hex). It signs the `ANON_KEY` and `SERVICE_ROLE_KEY` JWTs locally with `crypto.createHmac('sha256', JWT_SECRET)`, mirroring GoTrue's HS256 token format.

**Rationale:** The script must work before any Supabase service is up; the developer's first step is to paste the env vars into Railway and **then** start the Supabase services. Generating locally keeps the script self-contained, deterministic, and CI-friendly (no network calls, no side effects, exit code reflects whether generation succeeded).

**Alternative considered:** Call `supabase start` first and copy `supabase status -o env` — rejected; that requires a Docker daemon and the local workflow the user is trying to escape.

### 2. Sign `ANON_KEY` and `SERVICE_ROLE_KEY` as HS256 JWTs

**Choice:** Build the JWT header `{"alg":"HS256","typ":"JWT","kid":"supabase-demo-key"}` and payload `{"iss":"supabase-demo","ref":"default","role":"anon","iat":<now>,"exp":<now+10y>,"sub":"<uuid>"}`, base64url-encode header + payload, and HMAC-SHA256 the result with `JWT_SECRET` to produce the signature. Use `role: "service_role"` and a longer `exp` for the service-role key.

**Rationale:** Supabase self-hosting GoTrue validates these keys as JWTs signed with the same `JWT_SECRET` it uses to mint session tokens. If the script emits random strings, GoTrue rejects them with "Invalid token" the first time the API or web makes a request. HS256 signing is fully implemented in `node:crypto` (no extra deps) and matches what GoTrue / PostgREST verify against.

**Alternative considered:** Generate opaque random tokens — rejected; GoTrue's `anon` / `service_role` key validation requires JWT shape.

### 3. Group output by Railway service with `# === SERVICE <name> ===` section comments

**Choice:** The default `dotenv` format prints one `KEY=value` line per variable, with a `# === <service> ===` header before each block. The developer copies the whole file into Railway's RAW Editor (which is per-service, so they paste the relevant block into each service). The script also prints a human-readable summary to stderr (`# Generated N env vars across K Railway services`) so the developer can verify the expected set.

**Rationale:** Railway's per-service variable panel does not have a notion of "shared variables across services" — the developer must paste values into each service independently. Grouped output minimizes paste errors. Section comments survive Railway's RAW Editor (which preserves `#` lines) and can be left in place or stripped; either is fine.

**Alternative considered:** Emit one file per service (e.g. `railway-env/web.env`, `railway-env/api.env`, ...) — possible follow-up; for v1 a single grouped file is simpler and matches Railway's RAW Editor workflow.

### 4. Pure Node ESM, no npm dependencies, no build step

**Choice:** `scripts/generate-railway-supabase-env.mjs` is a plain Node ESM script that imports from `./lib/railway-env.mjs`. It uses `node:crypto` for randomness and HMAC, `node:fs/promises` for `--output` writes, and `node:path` for path resolution. No `package.json` changes for the script itself; the only root change is a `"railway:env"` script entry.

**Rationale:** Matches the convention in `scripts/show-local-credentials.mjs` and `scripts/seed-e2e-fixture.mjs`: thin top-level entrypoint + helpers in `scripts/lib/`. Zero new dependencies keeps `pnpm install` unchanged and avoids the supply-chain review surface for what is, conceptually, a developer-experience helper.

**Alternative considered:** Use the Supabase JS SDK to mint tokens — rejected; the SDK's JWT helpers are designed for client-side session tokens, not for generating `anon` / `service_role` keys with the right `iss` / `ref` / `kid` claims.

### 5. Accept public hostnames via flags / env so the script is reusable across deployments

**Choice:** Flags `--web-host`, `--api-host`, `--auth-host`, `--rest-host`, `--storage-host`, `--realtime-host`, `--db-host`, `--studio-host`, `--kong-host`, `--imgproxy-host`, `--admin-host` (and corresponding `RAILWAY_*_HOST` env vars). Defaults: empty strings, in which case the script emits a `<service>.up.railway.app` placeholder the developer replaces. A `--no-hostnames` flag prints only the secret env vars (no service URLs) so the developer can run the script before the Railway service hostnames are known.

**Rationale:** A developer may run the script before they've created all Railway services (to start with the secrets), or after. Decoupling secret generation from hostname injection lets them do either. The script is still useful with placeholders — Railway auto-assigns `<service>.up.railway.app` hostnames the developer can paste back in via a follow-up `pnpm railway:env --web-host=resumind-web.up.railway.app`.

**Alternative considered:** Require the developer to pass all hostnames up front — rejected; forces a specific ordering on Railway service creation that does not match the natural "add Postgres + GoTrue first, paste secrets, then add web + api" flow.

## Risks / Trade-offs

- **Generated keys are not persisted** → Mitigation: the script prints the values to stdout / writes to `--output` (default stdout). The script also prints a "How to use" section to stderr explaining that the values are sensitive and must be pasted into Railway's variable panel, not committed. A follow-up could add `--write-to-railway` (using the Railway CLI) but that is out of scope.
- **Re-running the script produces a different key set** unless `--seed` is provided → Mitigation: the script prints a warning to stderr if it is about to overwrite an existing output file, and `--seed` accepts a deterministic input so a developer can re-generate the same set (for testing).
- **JWT shape drift in future Supabase versions** → Mitigation: the script pins the JWT claims (`iss`, `ref`, `kid`, `role`, `iat`, `exp`, `sub`) and the `alg` header to the values used by the current `supabase/supabase` Docker image. A unit test asserts the header + payload shape against a known-good fixture (committed under `scripts/lib/__fixtures__/railway-env/`).
- **HS256 signing in pure Node is easy to get wrong (base64url padding, header order)** → Mitigation: helpers in `scripts/lib/railway-env.mjs` are extracted into pure functions (`base64urlEncode`, `signHs256`, `buildSupabaseJwt`) and unit-tested with a known vector (header `{alg,typ,kid}`, payload `{iss,ref,role,iat,exp,sub}`) so the generated JWTs are byte-identical to what GoTrue expects.
- **No live verification** → Mitigation: the bootstrap step (in the separate `deploy-railway-self-hosted-supabase` change) calls `supabase db push` and seeds accounts using the same `ANON_KEY` / `SERVICE_ROLE_KEY`; if the keys round-trip cleanly through GoTrue the script's output is correct. That is the integration test for v1; an explicit "live verify" step in this change is out of scope.
- **CORS / public URL placeholders may be wrong** → Mitigation: the script prints a "Verify hostnames" checklist at the end (e.g. `NEXT_PUBLIC_API_URL must match the API service's public Railway hostname`) so the developer reviews the values before pasting.

## Migration Plan

- This is an additive change with no runtime impact. Existing local development (`supabase start` → `pnpm setup:env` → `pnpm dev`) is unchanged.
- Rollout: merge the change, document `pnpm railway:env` in `README.md` "Deploy to Railway" section (or in the separate `deploy-railway-self-hosted-supabase` change's docs), and let the bootstrap script in that change call `pnpm railway:env` to seed Railway env vars on first deploy.
- Rollback: delete the new files; remove the `"railway:env"` script entry. No data is migrated; no service depends on the script's output at runtime.
