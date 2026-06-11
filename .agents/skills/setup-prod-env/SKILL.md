---
name: setup-prod-env
description: Generate a release-1 .env.prod file for docker compose deployment with a cloud Supabase instance. Use when the user wants to deploy to production or set up the release-1 environment.
license: MIT
compatibility: Requires Node.js 22+ at runtime; only run in a developer environment, never in a CI pipeline that might log output.
metadata:
  author: resubuild
  version: '1.0'
---

## When to use

- The operator (or an LLM agent) wants to deploy the resubuild system to a production docker compose stack connected to a non-self-hosted (cloud) Supabase project.
- The operator is preparing the environment for the first release-1 deployment.
- The operator has already gathered their Supabase credentials and needs to generate the `.env.prod` file.

## When NOT to use

- For local development — use `pnpm setup:env` (which runs `bash scripts/setup-local-env.sh`) instead.
- For CI/CD pipelines that must be fully deterministic — write a pre-committed manifest JSON and use `pnpm setup:env:prod --from manifest.json --force` with the key already supplied.
- If the `.env.prod` already exists and is correct — check before regenerating.

---

## Inputs

No explicit inputs required. The SKILL walks the operator through:

1. **Supabase project URL** — from the Supabase dashboard → Project Settings → API → "Project URL"
2. **Supabase anon key** — Project Settings → API → "anon / public" key
3. **Supabase service role key** — Project Settings → API → "service_role" key (treat as server-only secret)
4. **Media bucket name** — the Supabase Storage bucket name for resume media uploads (must exist in the project)
5. **MCP export bucket name** — the Supabase Storage bucket name for MCP export artifacts (must exist; typically `mcp-exports`)
6. **CORS origin** — the public URL of the web application (e.g., `https://app.example.com`)
7. **APP URL** — the public URL of the web application (same as CORS origin in most setups)
8. **PUBLIC_API_URL** — the public URL the API is reachable at (used in media src attributes)
9. **NEXT_PUBLIC_API_URL** — the public API URL that the Next.js browser bundle calls
10. **AI_AGENT_ENCRYPTION_KEY** — AES-256 encryption key for per-user AI agent settings. The SKILL can auto-generate this interactively, but cannot generate it without operator interaction (it never echoes it back). For non-interactive use, pre-supply this key.

Optional variables are accepted but have sensible defaults.

---

## Workflow

### Step 1 — Collect credentials

Ask the operator (or retrieve from a secrets manager) for the required Supabase credentials listed above. **Never ask for or log the `SUPABASE_SERVICE_ROLE_KEY` or `AI_AGENT_ENCRYPTION_KEY` values in the chat.** If the user pastes a secret value into chat, remind them to revoke it and use the manifest file approach instead.

### Step 2 — Write a manifest to disk

Write a `prod-secrets.json` manifest to the workspace root. This file is gitignored and MUST NOT be committed.

```json
{
  "SUPABASE_URL": "https://xxxx.supabase.co",
  "SUPABASE_ANON_KEY": "eyJ...",
  "SUPABASE_SERVICE_ROLE_KEY": "eyJ...",
  "MEDIA_BUCKET": "media",
  "MCP_EXPORT_BUCKET": "mcp-exports",
  "CORS_ORIGIN": "https://app.example.com",
  "APP_URL": "https://app.example.com",
  "PUBLIC_API_URL": "https://api.example.com",
  "NEXT_PUBLIC_API_URL": "https://api.example.com",
  "AI_AGENT_ENCRYPTION_KEY": "REPLACE_WITH_REAL_KEY_OR_LEAVE_BLANK_FOR_AUTO_GENERATION"
}
```

If `AI_AGENT_ENCRYPTION_KEY` is left blank or absent, the script will auto-generate one using `node:crypto.randomBytes(32).toString('base64')` when run interactively.

### Step 3 — Dry-run for review

Invoke the script with `--dry-run` first so the operator can review the output before anything is written:

```
pnpm setup:env:prod:dry-run --from prod-secrets.json
```

Print the output to the chat for operator review.

### Step 4 — Operator confirmation

If the operator approves, run the actual script to write `.env.prod`:

```
pnpm setup:env:prod --from prod-secrets.json
```

### Step 5 — Verify

Confirm the file was written:

```
docker compose -f docker-compose.prod.yml --env-file .env.prod config
```

---

## Guardrails

### NEVER echo secret values back to the user

Do not print, repeat, or summarize secret values (especially `SUPABASE_SERVICE_ROLE_KEY`, `AI_AGENT_ENCRYPTION_KEY`, or any key that starts with `eyJ`). If the user asks what a secret value is, direct them to the manifest file on disk.

### Use the manifest file as the only safe place for secret material

The SKILL must write secrets to `prod-secrets.json` on disk (which is gitignored). The script reads from the manifest, not from the chat. This prevents secret values from appearing in chat transcripts.

### If the user pastes a secret into chat

1. Do NOT repeat or echo it back.
2. Tell the user to revoke the key in the Supabase dashboard and generate a new one.
3. Advise them to use the manifest file approach instead of pasting secrets into chat.

### The script's `--dry-run` must always be used before writing

The SKILL MUST invoke the dry-run first and wait for operator confirmation before running without `--dry-run`.

### The manifest file must exist before running the script

The SKILL must write the manifest before invoking `pnpm setup:env:prod --from prod-secrets.json`.

---

## Related files

- Script: `scripts/setup-prod-env.mjs`
- Schema module: `scripts/lib/env-prod-schema.mjs`
- Docker compose: `docker-compose.prod.yml`
- Full spec: `openspec/specs/prod-env-bootstrap-helper/spec.md`
