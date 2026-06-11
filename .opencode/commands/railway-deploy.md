# opsx:railway-deploy

Walk the operator (or an LLM agent) through the release-1 Railway deploy target for resubuild.

This command is a thin wrapper around `pnpm setup:env:prod --target railway` (the extended env generator) and `pnpm deploy:railway` (the preflight check). It does not invoke `railway up` directly — the operator runs the two `railway up --service <name>` commands manually so they can watch the build log.

**Use this command when:** the operator wants to deploy resubuild to a managed Railway project connected to a cloud Supabase instance, reusing the existing `apps/api/Dockerfile` and `apps/web/Dockerfile`.

**Prerequisites:**

1. A Supabase project (cloud, not self-hosted) with:
   - A `media` storage bucket
   - A `mcp-exports` storage bucket (or adjust the `MCP_EXPORT_BUCKET` value)
2. Credentials from Supabase Dashboard → Project Settings → API:
   - Project URL
   - Anon key
   - Service role key
3. The Railway CLI installed (`npm install -g @railway/cli` or `brew install railway`)
4. A Railway account (https://railway.com)

---

## Step 1 — Collect credentials and write the manifest

When prompted, provide:

- Supabase project URL
- Supabase anon key
- Supabase service role key (treated as confidential — never exposed in chat)
- Storage bucket names (defaults: `media` and `mcp-exports`)

The command writes your credentials to `prod-secrets.json` in the workspace root. This file is gitignored. If a `prod-secrets.json` already exists on disk, the command reuses it and just verifies the required keys are present.

The manifest MUST set `"DEPLOY_TARGET": "railway"` so the generator bakes the production custom-domain defaults. If it does not, the operator can pass `--target railway` on the CLI in Step 3 (the manifest still wins).

**Do NOT paste secret values directly into chat.** Use the prompt fields or write a manifest file.

---

## Step 2 — Dry-run review

The command runs the generator in dry-run mode first so the operator can review the output before any file is written:

```bash
pnpm setup:env:prod --target railway --from prod-secrets.json --dry-run
```

The four public-URL keys (`CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL`) MUST be visible as the production custom domains (`https://app.resubuild.dev` for the web app, `https://api.resubuild.dev` for the API), not docker compose placeholders. **Review the output carefully** before confirming.

If the dry-run output looks wrong, answer "no" and the file will not be written.

---

## Step 3 — Confirm to write `.env.prod`

Only after the operator confirms, the command runs:

```bash
pnpm setup:env:prod --target railway --from prod-secrets.json
```

The script writes `.env.prod` and prints a one-line note about the production custom domains (the placeholders are gone — the values are now the real production custom domains, so no find-and-replace step is needed as long as the operator attaches the matching custom domains in the Railway dashboard).

---

## Step 4 — Stop and confirm with the operator

The command stops here and asks the operator to confirm two more steps before they run them manually:

1. **Run the preflight** — `pnpm deploy:railway` confirms `.env.prod` is well-formed and prints the two `railway up` commands.
2. **Create the Railway project + two services + paste Variables + attach custom domains + enable App Sleeping** — see the [`.cursor/skills/railway-deploy/SKILL.md`](../skills/railway-deploy/SKILL.md) workflow for the per-service Variables split, the public-URL handshake, the custom-domain attachment, and the App Sleeping toggle (the toggle is the operator's signal that the service should scale to zero — it is a per-service dashboard setting, not a `railway.json` field).

**This command does not call `railway up`.** The operator runs the two `railway up --service <name>` commands themselves, one at a time, watching each build log.

---

## Step 5 — Verify

After the deploys complete, the operator runs the two `curl` checks from the SKILL:

```bash
curl -f https://api.resubuild.dev/_health
curl -f https://app.resubuild.dev/
```

---

## Files

- SKILL (LLM agents): [`.cursor/skills/railway-deploy/SKILL.md`](../skills/railway-deploy/SKILL.md)
- Service config: `apps/api/railway.json`, `apps/web/railway.json`
- Build context exclusions: `.railwayignore`
- Preflight wrapper: `scripts/deploy-railway.mjs`
- Generator (extended with `--target railway`): `scripts/setup-prod-env.mjs`
- Schema: `scripts/lib/env-prod-schema.mjs`
- Full spec: `openspec/changes/railway-deployment/specs/railway-deployment/spec.md`

## Quick reference

```bash
# Dry-run (review the public-URL placeholders)
pnpm setup:env:prod --target railway --from prod-secrets.json --dry-run

# Write .env.prod
pnpm setup:env:prod --target railway --from prod-secrets.json

# Preflight + print the two deploy commands
pnpm deploy:railway

# Verify after deploy
curl -f https://api.resubuild.dev/_health
curl -f https://app.resubuild.dev/
```
