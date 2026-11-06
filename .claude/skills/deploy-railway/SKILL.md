---
name: deploy-railway
description: Use when the user asks to deploy, ship, release or publish Resubuild, or to redeploy the api/web services to Railway staging after approved local changes, including new env vars or secrets the release needs. Staging only, never production.
---

# Deploy to Railway (staging)

Deploys the `api` and `web` services of the Resubuild **staging** Railway project. Complements the generic `use-railway` skill (CLI conventions, verification rules); follow its rule that a deploy is only reported successful after observing `SUCCESS` for that deployment.

## Target: staging only

- **Staging** is the Railway project `resubuild-sitewebr` (id `6f5f1038-a451-483a-8715-a1fa29efc20e`), served at `https://resubuild.sitewebr.com` (web) and `https://resubuild-api.sitewebr.com` (api). Careful: its Railway environment is literally named `production`; that is still staging. Go by the project and domains, not the environment name.
- **Production** is `resubuild.dev` (`app.resubuild.dev`, `api.resubuild.dev`). It is out of scope: never deploy, set variables or run any mutating command against it.
- Every deploy goes to staging, even if the user just says "deploy". If the user asks for production, explain that this skill only covers staging and stop. A future staging-to-production promotion script is separate from this skill.

## Hard rule: secrets never pass through the agent

A secret is any key with `secret: true` in `scripts/lib/env-prod-schema.mjs` (e.g. `BETTER_AUTH_SECRET`, `AI_AGENT_ENCRYPTION_KEY`, `MCP_KEY_PEPPER`, `*_CLIENT_SECRET`, `*_API_KEY`, `SMTP_PASSWORD`, `TURNSTILE_SECRET_KEY`, S3 keys, `DATABASE_URL`).

- Never read secret values from `.env`, `.env.prod`, `prod-secrets.json` or anywhere else, and never set them yourself.
- Never ask the user to paste a secret into the chat or put it in a command argument.
- Give the user a command that reads the value from **stdin** with echo off, so it lands neither in shell history nor in this conversation. The user runs it with the `!` prefix or in their own terminal:

```bash
! read -rs "V?Value for <KEY>: " && printf '%s' "$V" | railway variable set <KEY> --stdin --service <api|web> --skip-deploys; unset V
```

(zsh syntax; in bash use `read -rs -p "Value for <KEY>: " V`.) `--skip-deploys` avoids one redeploy per secret; the deploy in step 6 picks them all up. After the user confirms, verify presence only: `railway variable list --service <svc> --json` and check the key exists, never print its value.

Non-secret variables are set by you, after the user approves the exact `KEY=value` list (they should not have to type them).

## Steps

1. **Preflight.** Working tree clean and on the branch to ship (`git status`). Confirm CLI context with `railway status --json`: the project id must be the staging one above (explicit `--project`/`--environment` flags if the link differs) and services `api` and `web` exist. If the project is anything else, or any of its domains is on `resubuild.dev`, stop and tell the user. Run Railway CLI calls with `RAILWAY_CALLER=skill:use-railway@1.7.0`. Railway's own variables are the source of truth: the local `.env.prod` is only a generator artifact and may be absent or incomplete, so do not gate on `pnpm deploy:railway` and never regenerate it here (that needs secrets).

2. **Find the last deploy.** `railway deployment list --service api --json`: take the newest deployment whose `meta.reason` is not `redeploy`, whatever its status (a later redeploy marks it `REMOVED`, which is expected). Its `createdAt` is the reference point (uploads from the CLI carry no commit hash). Then list what shipped since: `git log --since=<createdAt> --oneline`.

3. **Detect new configuration.** For each commit since then that is already approved locally, check what it added:
   `git diff $(git rev-list -1 --before=<createdAt> HEAD) HEAD -- apps/api/.env.example apps/web/.env.example scripts/lib/env-prod-schema.mjs`
   and the commit messages/requirements (`docs/requirements/`) for features needing config. Compare new keys with `railway variable list --service <svc> --json` (key names only). A key is **missing** when the new code needs it and Railway does not have it.

4. **Secrets (missing keys with `secret: true`).** Tell the user which keys are missing, which feature needs each, and which service. Give one stdin command per key as above. For generated secrets (e.g. `BETTER_AUTH_SECRET`, `AI_AGENT_ENCRYPTION_KEY`, `MCP_KEY_PEPPER`) the command may generate the value inside the user's shell, e.g. `openssl rand -base64 32 | railway variable set <KEY> --stdin --service api --skip-deploys`, so it never appears anywhere. Wait for the user to say they ran them, then verify presence.

5. **Non-secrets (missing keys without `secret`).** Show a table: key, proposed value (default from the schema or `.env.prod`'s non-secret value), service. Ask permission via AskUserQuestion. On approval set them with `railway variable set KEY=value --service <svc> --skip-deploys`. Never include secret keys in this table.

6. **Deploy, api first.** Ask permission to deploy, then `railway up --service api --detach -m "<summary of commits>"` (pre-deploy runs migrations). Poll `railway deployment list --service api --json` for that deployment id until `SUCCESS`. On `FAILED`/`CRASHED`, read `railway logs` and stop; do not deploy web. Then the same for `web`.

7. **Verify.** Never use domains from the README, scripts or memory: they can belong to another project. Read the project's real domains first with `railway domain list --service <svc> --json`, then `curl` the `api` domain at `/_health` and the `web` domain at `/` and confirm HTTP 200. They must be the staging domains (`*.sitewebr.com`); never check `resubuild.dev`. Report: commits shipped, variables set (names only), deployment ids and final status.

## Quick reference

| Situation                       | Action                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| Key `secret: true`, missing     | User runs stdin command; you verify presence only               |
| Key not secret, missing         | Propose, get approval, you set it                               |
| Key already present             | Leave untouched; changing its value needs explicit user request |
| No new config since last deploy | Skip steps 4-5                                                  |
| Deploy of api fails             | Stop; web is not deployed                                       |

## Red flags, stop

- About to `cat`/grep `.env.prod` or `prod-secrets.json` values, or echo a secret.
- Writing `railway variable set SECRET=<value>` with the value as an argument.
- Asking the user to paste a secret "just this once".
- Reporting success from `railway up` exit code alone.
- Curling a URL that did not come from `railway domain list` for this project.
- The linked project is not the staging project, a domain is on `resubuild.dev`, or the user asks to deploy to production: stop, this skill is staging only.

All of these mean: switch to the stdin command or keep verifying until `SUCCESS`.
