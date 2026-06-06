# Railway Supabase env script

## Purpose

Provide a single, offline command that generates the env vars a developer must paste into the Railway per-service variable panel when deploying self-hosted Supabase + Resumind to Railway. The script is the canonical source of truth for the secret values (Postgres password, JWT secret, anon / service-role keys, secret-key-base, pg-meta crypto key) and the public-hostname env vars (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, etc.) that mirror the local `supabase status -o env` flow.

## ADDED Requirements

### Requirement: A root script SHALL generate the full Railway env-var set in one command

The repository root `package.json` MUST expose a script entry that runs `node scripts/generate-railway-supabase-env.mjs` (e.g. `pnpm railway:env`). The script MUST be a thin Node ESM entrypoint with no new npm dependencies — only `node:crypto`, `node:fs/promises`, and `node:path` are used. The script MUST be runnable before any Supabase service is up (no network calls, no `supabase start` dependency). Re-running the script MUST regenerate a fresh, valid key set unless `--seed` is provided (in which case output is deterministic for the same input).

#### Scenario: Developer runs the generator before creating Railway services

- **WHEN** a developer with the repository cloned runs `pnpm railway:env` from the repo root with no flags
- **THEN** the script prints a `dotenv`-formatted env-var set to stdout
- **AND** exits 0
- **AND** does not contact any external service

#### Scenario: Developer re-runs the generator with a seed

- **WHEN** a developer runs `pnpm railway:env --seed 12345` twice
- **THEN** both runs emit byte-identical `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE`, `PG_META_CRYPTO_KEY`, and `AI_AGENT_ENCRYPTION_KEY` values

### Requirement: The script SHALL emit canonical Supabase self-hosting secrets

The script MUST generate the following secret env vars, each with the documented length / encoding:

- `POSTGRES_PASSWORD` — 32 random bytes, base64-encoded.
- `JWT_SECRET` — at least 32 random bytes, base64-encoded; used by GoTrue to sign and verify Supabase JWTs.
- `ANON_KEY` — HS256-signed JWT, `role: "anon"`, claims `{iss: "supabase-demo", ref: "default", role: "anon", iat, exp, sub}` with `kid: "supabase-demo-key"`, exp ≈ 10 years out.
- `SERVICE_ROLE_KEY` — HS256-signed JWT, `role: "service_role"`, same `iss` / `ref` / `kid` as `ANON_KEY`, exp ≈ 10 years out.
- `SECRET_KEY_BASE` — 64 hex characters (32 random bytes hex-encoded).
- `PG_META_CRYPTO_KEY` — symmetric key for `pg_meta` (Studio) encryption; 64 hex characters.

#### Scenario: Generated keys round-trip through GoTrue JWT validation

- **WHEN** a developer pastes the generated `ANON_KEY` / `SERVICE_ROLE_KEY` / `JWT_SECRET` into the `auth` (GoTrue) Railway service and starts it
- **THEN** a subsequent API call presenting `ANON_KEY` as a Bearer token to the self-hosted GoTrue SHALL be accepted (HS256 signature matches)
- **AND** a call presenting `SERVICE_ROLE_KEY` SHALL be accepted with `role: "service_role"`

#### Scenario: Generated keys pass HS256 verification off-line

- **WHEN** the script's `signHs256(header, payload, secret)` helper is unit-tested with a known header / payload / secret vector
- **THEN** the resulting signature is byte-identical to the value GoTrue's `pgjwt` / `gotrue` library would produce for the same input

### Requirement: The script SHALL emit Resumind API and web env vars

The script MUST emit the env vars the Resumind API and web app read at runtime (mirroring `apps/api/.env.example` and `apps/web/.env.example`):

- API: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AI_AGENT_ENCRYPTION_KEY`, `MEDIA_BUCKET=media`, `MCP_EXPORT_BUCKET=mcp-exports`, `CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL`, `PORT=3001`.
- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` MUST be set from the `--auth-host` / `--rest-host` / `--storage-host` flags (or `<service>.up.railway.app` placeholders) and used consistently across API and web.
- `AI_AGENT_ENCRYPTION_KEY` MUST be a fresh 32-byte random key, base64-encoded — equivalent in length to `scripts/setup-local-env.sh#generate_encryption_key`.
- `MEDIA_BUCKET` and `MCP_EXPORT_BUCKET` MUST default to the bucket names declared in `supabase/config.toml` (`media` and `mcp-exports`) and be overridable via flags.

#### Scenario: Developer pastes the API block into the Railway `api` service

- **WHEN** a developer copies the `# === api ===` block from the script's output into the Railway `api` service's variable panel and restarts the service
- **THEN** `apps/api` ConfigModule reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AI_AGENT_ENCRYPTION_KEY`, `MEDIA_BUCKET`, `MCP_EXPORT_BUCKET`, `CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL` from the panel
- **AND** the API's Nest bootstrap succeeds and `GET /auth/me` returns 401 with no token (same as local)

#### Scenario: Developer pastes the web block into the Railway `web` service

- **WHEN** a developer copies the `# === web ===` block from the script's output into the Railway `web` service's variable panel and restarts the service
- **THEN** the Next.js client receives `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL` in the browser bundle
- **AND** the Supabase client and `src/lib/api.ts` use the Railway API public hostname for REST calls

### Requirement: The script SHALL group output by Railway service with section headers

The default `dotenv` output format MUST group env vars by Railway service, with a `# === <service> ===` comment header before each block. The grouping MUST at minimum cover: `web`, `api`, `auth` (GoTrue), `rest` (PostgREST), `storage`, `realtime`, `db`, `studio`, `imgproxy`, `kong`, `supabase-admin`. Section headers MUST be valid `dotenv` comments so the output is paste-safe into Railway's RAW Editor.

#### Scenario: Developer splits output across services

- **WHEN** a developer pastes the full script output into a text editor
- **THEN** they can locate the `# === api ===` block and paste only those `KEY=value` lines into the Railway `api` service's variable panel
- **AND** repeat for the `# === web ===`, `# === auth ===`, etc. blocks
- **AND** no env var is duplicated across blocks unless it is intentionally shared (documented in the script's stderr summary)

### Requirement: The script SHALL support dotenv, shell, and JSON output formats

The script MUST support a `--format dotenv|shell|json` flag (default `dotenv`) and a `--output <path>` flag (default stdout). The `shell` format MUST emit `export KEY="value"` lines. The `json` format MUST emit a single JSON object mapping service name to `KEY: value` records, suitable for piping into `jq` or other tooling. The `dotenv` format MUST quote values that contain whitespace, `#`, or `=` to preserve round-trippability.

#### Scenario: Developer emits JSON for downstream tooling

- **WHEN** a developer runs `pnpm railway:env --format json --output .env.railway.json`
- **THEN** the script writes a JSON file where each top-level key is a Railway service name and each value is an object of `KEY: value` pairs
- **AND** `jq '.api.SUPABASE_URL' .env.railway.json` prints the API's `SUPABASE_URL` value

#### Scenario: Developer emits shell format for local validation

- **WHEN** a developer runs `pnpm railway:env --format shell --output .env.railway.sh && source .env.railway.sh`
- **THEN** each `KEY` is exported into the developer's shell
- **AND** `echo "$SUPABASE_URL"` prints the generated Supabase URL
- **AND** the script does not print to stdout in this case (output redirected via `--output`)

### Requirement: The script SHALL accept per-service hostnames as flags or env

The script MUST accept per-service hostname flags (`--web-host`, `--api-host`, `--auth-host`, `--rest-host`, `--storage-host`, `--realtime-host`, `--db-host`, `--studio-host`, `--kong-host`, `--imgproxy-host`, `--admin-host`) and corresponding `RAILWAY_*_HOST` env vars. If a flag is not provided, the script MUST default to the Railway auto-assigned hostname pattern (`<service>.up.railway.app`) and embed the placeholder in the output. The script MUST also accept a `--no-hostnames` flag that emits only the secret env vars (no `*_URL` / `*_HOST` lines), for the case where the developer runs the script before any Railway service exists.

#### Scenario: Developer runs the script with no hostnames

- **WHEN** a developer runs `pnpm railway:env --no-hostnames`
- **THEN** the output contains only `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE`, `PG_META_CRYPTO_KEY`, `AI_AGENT_ENCRYPTION_KEY`
- **AND** no `SUPABASE_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_*`, or `*_HOST` lines are emitted
- **AND** the developer can paste these into the Railway `auth` and `db` services immediately

#### Scenario: Developer re-runs with a real hostname

- **WHEN** a developer runs `pnpm railway:env --web-host resumind-web.up.railway.app --api-host resumind-api.up.railway.app --auth-host resumind-auth.up.railway.app`
- **THEN** the output's `web` block contains `NEXT_PUBLIC_API_URL=https://resumind-api.up.railway.app`
- **AND** the `api` block contains `CORS_ORIGIN=https://resumind-web.up.railway.app`
- **AND** the `api` and `web` blocks contain `SUPABASE_URL=https://resumind-auth.up.railway.app` and the matching `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_API_URL` values

### Requirement: The script SHALL print a usage summary to stderr

The script MUST print a short, human-readable summary to stderr explaining: how many env vars were generated, how many Railway services they cover, which flags were honored, where the output was written (if `--output` is set), and a "How to use" reminder that the values are sensitive and must be pasted into Railway's variable panel (not committed). The script MUST exit 0 on success and 1 on user error (unknown flag, invalid format) with a usage message on stderr.

#### Scenario: Developer runs with an unknown flag

- **WHEN** a developer runs `pnpm railway:env --bogus`
- **THEN** the script prints a usage error to stderr identifying the unknown flag
- **AND** exits 1
- **AND** does not print any env vars to stdout

## Out of scope

- Pushing migrations, creating Storage buckets, seeding accounts, starting Railway services — handled by the separate `deploy-railway-self-hosted-supabase` change.
- Storing generated secrets in a keychain or persisting them across runs.
- Live verification that the generated keys round-trip against a running GoTrue / PostgREST (that is the integration test for the bootstrap step, not the generator).
- Generating placeholders for the developer's `developerUser` / `e2eUser` passwords (those are seeded by the bootstrap step).
