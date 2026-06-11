# opsx:setup-prod-env

Generate a `.env.prod` file for the release-1 docker compose target connected to a cloud Supabase instance.

This command is a thin wrapper around `pnpm setup:env:prod` (backed by `scripts/setup-prod-env.mjs`). It writes a `prod-secrets.json` manifest to disk and uses the script's `--from` flag so secret values never appear in chat.

**Use this command when:** the operator wants to set up the release-1 production environment interactively or from a pre-written manifest.

**Prerequisites:**

1. A Supabase project (cloud, not self-hosted) with:
   - A `media` storage bucket
   - A `mcp-exports` storage bucket (or adjust the `MCP_EXPORT_BUCKET` value)
2. Credentials from Supabase Dashboard → Project Settings → API:
   - Project URL
   - Anon key
   - Service role key

---

## Step 1 — Collect credentials

When prompted, provide:

- Supabase project URL
- Supabase anon key
- Supabase service role key (treated as confidential — never exposed in chat)
- Storage bucket names (defaults: `media` and `mcp-exports`)
- Public URLs for your deployment (e.g., `https://app.example.com`)

Do NOT paste secret values directly into chat. Instead, use the prompt fields or write a manifest file.

---

## Step 2 — Manifest is written to `prod-secrets.json`

The command writes your credentials to `prod-secrets.json` in the workspace root. This file is gitignored.

---

## Step 3 — Dry-run review

The command runs `pnpm setup:env:prod:dry-run --from prod-secrets.json` and displays the would-be `.env.prod` content for your review.

**Review the output carefully** before confirming. If anything looks wrong, answer "no" and the file will not be written.

---

## Step 4 — Confirm to write `.env.prod`

Only after you confirm, the command runs `pnpm setup:env:prod --from prod-secrets.json` to write the final `.env.prod` file.

---

## Files

- Script: `scripts/setup-prod-env.mjs`
- Schema: `scripts/lib/env-prod-schema.mjs`
- Docker compose: `docker-compose.prod.yml`
- SKILL (LLM agents): `.cursor/skills/setup-prod-env/SKILL.md`
- Full spec: `openspec/specs/prod-env-bootstrap-helper/spec.md`

## Quick reference

```bash
# Interactive
pnpm setup:env:prod

# From manifest
pnpm setup:env:prod --from prod-secrets.json

# Dry-run
pnpm setup:env:prod:dry-run --from prod-secrets.json

# Verify docker compose
docker compose -f docker-compose.prod.yml --env-file .env.prod config
```
