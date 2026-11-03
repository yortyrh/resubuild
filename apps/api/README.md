# Resubuild API (NestJS)

REST API for authenticated CV persistence and **auth issuance** consumed by `apps/web` over HTTPS (possibly on a **different hostname** than the Next.js UI).

## Environment

| Variable               | Purpose                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string (any Postgres 15+). User isolation is enforced by `user_id` filters in every repository.                                                                                                                                                       |
| `S3_*`, `MEDIA_BUCKET` | S3-compatible storage (`S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`) and the private media bucket.                                                                                                 |
| `SMTP_*`, `MAIL_FROM`  | SMTP server for transactional email (`SMTP_URL`, or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`).                                                                                                                                                                 |
| `BETTER_AUTH_SECRET`   | Signs session tokens (≥32 chars). `BETTER_AUTH_URL`, `WEB_URL`, `AUTH_*_ENABLED` and `<PROVIDER>_CLIENT_ID/SECRET` configure Better Auth.                                                                                                                                 |
| `MEDIA_MAX_BYTES`      | Optional max upload size in bytes (default 10 MiB).                                                                                                                                                                                                                       |
| `PUBLIC_API_URL`       | Optional. Public base URL of this API (**no trailing slash**) used when building canonical image URLs (`{PUBLIC_API_URL}/media/{id}`). If omitted, defaults to `http://localhost:${PORT}`. Production: set to the HTTPS origin browsers use (`<img src=…>` must load it). |
| `PORT`                 | Listen port (`3001` default locally).                                                                                                                                                                                                                                     |
| `CORS_ORIGIN`          | Comma-separated browser origins allowed to call the API (example: `http://localhost:3000` or `https://app.example.com`). No cookies auth: **`credentials` is off** — clients send `Authorization: Bearer` only.                                                           |

See `.env.example` for the full list.

## Auth (Better Auth, Bearer tokens)

Better Auth is mounted at `/api/auth/*` (sign-in/up, verify email, reset password, magic link, email OTP, OAuth callbacks). Endpoints that create a session return the token in the `set-auth-token` header; clients send `Authorization: Bearer <token>`. Sessions are stored in Postgres and revoked on logout or password change.

| Method | Path                    | Notes                                                                |
| ------ | ----------------------- | -------------------------------------------------------------------- |
| `GET`  | `/auth/me`              | Bearer required; `{ user: { id, email, picture }, has_password }`    |
| `POST` | `/auth/password`        | `{ current_password?, new_password }`; returns `{ updated, token? }` |
| `POST` | `/auth/logout`          | `204`; revokes the session                                           |
| `GET`  | `/auth/oauth/:provider` | Starts OAuth (top-level navigation); ends at web `/auth/callback`    |
| `POST` | `/auth/oauth/exchange`  | `{ code }` → `{ token }` (single-use, 2 min)                         |

CORS exposes `set-auth-token`. Add every deployed web origin exactly (no wildcard in production recommended).

### Media (object storage + registry rows)

Uploads accept **multipart** `file` on `POST /media/upload` behind the same **Bearer** guard as `/cv`. The service writes objects to Storage under `{user_id}/{media_uuid}.{ext}` (MIME allowlist: PNG, JPEG, WebP, GIF), inserts a row in **`public.media`**, and responds with **`{ id, url, contentType }`**. The **`url`** points at **`GET /media/:id`** on this API (`PUBLIC_API_URL` or `http://localhost:${PORT}`), not a storage URL, so embeddings depend only on the media id portion of that path.

**`GET /media/:id`** is **public** (no Bearer) and streams bytes with `Cache-Control: public`. Treat the UUID as an unguessable capability if you rely on secrecy.

In **production**, if the `S3_*` credentials and `MEDIA_BUCKET` are not set at startup, `MediaService` **throws** during `onModuleInit`. In non-production, uploads are disabled with a warning until those variables are provided.

## CV routes

All `/cv*` routes remain behind `Authorization: Bearer` as before.

## AI agent accounts (BYOK)

Per-user LLM credentials for PDF import and other Mastra workflows live in `ai_agent_account` with an active selection in `ai_agent_preference`. API keys are encrypted at rest with `AI_AGENT_ENCRYPTION_KEY` (falls back to `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`).

**Bring your own key (BYOK) only** — use API keys from Anthropic, OpenAI, Google, or OpenRouter. Cursor IDE or ChatGPT Plus subscriptions do not expose user API keys; there is no Cursor OAuth integration in v1.

| Method   | Path                              | Notes                       |
| -------- | --------------------------------- | --------------------------- |
| `GET`    | `/ai/agents/providers`            | Provider catalog            |
| `GET`    | `/ai/agents/providers/:id/models` | Models for provider         |
| `GET`    | `/ai/agents/accounts`             | List accounts (no raw keys) |
| `POST`   | `/ai/agents/accounts`             | Create account (probes key) |
| `PATCH`  | `/ai/agents/accounts/:id`         | Update account              |
| `DELETE` | `/ai/agents/accounts/:id`         | Delete account              |
| `GET`    | `/ai/agents/active`               | Active account summary      |
| `PUT`    | `/ai/agents/active`               | Set active by `accountId`   |

Deprecated aliases under `/import/llm/*` delegate to the same services for one release cycle.

### Import model catalog (Mastra gateway + models.dev)

Provider/model lists are discovered via the `MastraModelGateway` public class
shipped in `@mastra/core/llm` (v1; the legacy v0.20 `PROVIDER_REGISTRY`
re-export was removed) and enriched with model metadata fetched from
[models.dev](https://models.dev/api.json). The catalog is loaded
into memory on **API startup**, then refreshed **daily at midnight UTC**. No
per-request fetch.

| Variable                       | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `IMPORT_MODELS_CATALOG_SOURCE` | Set to `static` to use bundled `catalog.json` only (tests, offline). |

If the first startup fetch fails, the API falls back to bundled `packages/import-models/catalog.json`. Failed daily refreshes keep the last good snapshot.

Optional: `pnpm import-models:sync` rebuilds the fallback file from models.dev (not required for normal operation).

## Prepare Application

Requires **`cv-html-view-pdf-export`** (Puppeteer HTML/PDF pipeline) for cover letter export and tailored CV export in the application workspace.

| Variable                      | Purpose                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `APPLICATION_PREPARE_ENABLED` | Set to `false` to disable `POST /applications/prepare` (default on). |
| `PDF_IMPORT_MAX_BYTES`        | Shared 5 MB limit for PDF/image job posting uploads.                 |

Routes under `/applications/*` reuse the active AI agent account (`AiAgentCredentialService`) and the prepare workflow in `@resubuild/import-agent`.

## MCP server (Streamable HTTP)

Users enable MCP in the dashboard, create up to **two** API keys, and connect external agents (Cursor, Claude Desktop, etc.). MCP requests use `Authorization: Bearer <mcp_api_key>` — not the session token used by the web app.

| Variable                 | Purpose                                                                                                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_SERVER_ENABLED`     | Set to `false` to skip the `@rekog/mcp-nest` registration entirely. `/mcp` (and `/mcp/`) then returns `404` from the Express layer because no controller is mounted there, while the REST key-management routes (`/settings/mcp`) keep working. Default: enabled when unset. |
| `MCP_KEY_PEPPER`         | **Required** HMAC pepper for API key hashing. Changing it invalidates existing keys.                                                                                                                                                                                         |
| `MCP_EXPORT_BUCKET`      | **Required** for the four `export_cv_*` MCP tools. Name of the private bucket that holds short-lived rendered artifacts.                                                                                                                                                     |
| `MCP_EXPORT_TTL_SECONDS` | Default signed-URL TTL in seconds (default `3600` = 1h). Agents can override per-call via `fetch_export_url` (`[60, 86400]`).                                                                                                                                                |
| `MCP_EXPORT_MAX_BYTES`   | Max decoded size for MCP exports (default 10 MiB). Enforced at upload time inside `ExportStorageService`; oversize returns 413.                                                                                                                                              |

| Method         | Path                     | Auth                                                              |
| -------------- | ------------------------ | ----------------------------------------------------------------- |
| `GET`          | `/settings/mcp`          | Session token                                                     |
| `PATCH`        | `/settings/mcp`          | Session token — `{ "mcpEnabled": true }`                          |
| `POST`         | `/settings/mcp/keys`     | Session token — optional `{ "label" }`; returns `{ secret }` once |
| `DELETE`       | `/settings/mcp/keys/:id` | Session token — revoke key                                        |
| `POST` / `GET` | `/mcp` and `/mcp/`       | MCP API key                                                       |

### Example MCP client config (Cursor / Claude)

```json
{
  "mcpServers": {
    "resubuild": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer rm_YOUR_KEY_FROM_SETTINGS"
      }
    }
  }
}
```

Tools include CV list/read/delete, JSON Resume create/replace, HTML/PDF/PNG export, template presentation, and job application read/update. They intentionally exclude web search, import, and AI agent configuration — use your client’s own tools for those.

#### MCP export transport (signed-URL envelopes)

The four `export_cv_*` tools (HTML / PDF / PNG / JSON Resume) no longer return inline content. Each successful call uploads the rendered artifact to a dedicated `MCP_EXPORT_BUCKET` and returns a small envelope whose `url` is a **presigned storage URL** — a self-contained URL whose `X-Amz-*` query parameters authenticate the request at the storage host. There is no API-host download endpoint: paste the `url` into a browser tab, `curl`, `wget`, `fetch`, `Read`/open in editors, etc., and the storage host serves the artifact directly. No `Authorization: Bearer` header is required.

```json
{
  "exportId": "9f1b…",
  "url": "https://storage.example.com/mcp-exports/<user>/<cv>/pdf/9f1b….pdf?X-Amz-Signature=…",
  "expiresAt": "2026-06-02T23:00:00Z",
  "expiresInSeconds": 3600,
  "filename": "jane-doe-classic.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 12345,
  "kind": "pdf",
  "templateId": "classic"
}
```

- **HTML (`export_cv_html`)** — the URL is openable in a browser tab (renders the full CV) **or** saveable with `curl <url> -o cv.html`; served as `text/html; charset=utf-8`.
- **PDF (`export_cv_pdf`)** — download with `curl <url> -o cv.pdf` (or open in a browser/PDF viewer); served as `application/pdf`. Large exports return 413 if over `MCP_EXPORT_MAX_BYTES`.
- **Screenshot / PNG (`export_cv_screenshot`)** — `mode=first_page` (default, one Letter-sized page) or `mode=full_document` (entire document height); download with `curl <url> -o cv.png`; served as `image/png`.
- **JSON Resume (`export_cv_jsonresume`)** — `curl <url> | jq .` or `fetch(url).then(r => r.json())`; served as `application/json; charset=utf-8`. The envelope also includes a `document` field with the parsed JSON Resume object (includes `$schema` and `meta`, strips Resubuild-internal row ids) so agents can reason about it inline without a follow-up `fetch`.

> **BREAKING**: clients that previously consumed `html`, `contentBase64`, or `document` directly from the tool result must switch to `fetch(url)` (or the new `document` field for JSON Resume). Tool descriptions are updated to reflect the new shape.

The default TTL is **1h** (`MCP_EXPORT_TTL_SECONDS`). If a URL is about to expire, agents can re-fetch it via the `fetch_export_url` tool (passing the prior `exportId`, optionally with a `ttlSeconds` between 60 and 86400). The same `mcp_export` row is reused, its `expires_at` is extended, and a fresh presigned URL is issued. Unknown / swept exports return 404. A scheduled sweep (`@nestjs/schedule` cron every 5 minutes) deletes expired rows and removes their storage objects best-effort.

##### Bucket setup (one-off, per environment)

Create a private `mcp-exports` bucket in your storage service (locally `pnpm infra:up` creates it; `S3_AUTO_CREATE_BUCKETS=true` makes the API create it at start).

Add `MCP_EXPORT_BUCKET=mcp-exports` to your `.env` (or the equivalent env file your platform reads); `pnpm setup:env` writes this for you. The other env vars (`MCP_EXPORT_TTL_SECONDS`, `MCP_EXPORT_MAX_BYTES`) are optional and default to 3600 / 10 MiB.

## Debugging the API

The API ships with NestJS Devtools and a Node inspector for step-through debugging.

### Debug mode (watch + inspector)

```bash
pnpm dev:api:debug
```

This starts the Nest dev server with `--inspect=0.0.0.0:9229`, exposing the Node inspector at `ws://localhost:9229`.

### Attach from VS Code / Cursor

1. Run `pnpm dev:api:debug` in a terminal.
2. In the editor, select the **"Attach to @resubuild/api"** launch configuration and press Run/Debug.

Breakpoints set in `apps/api/src/*.ts` will resolve via the source maps emitted under `apps/api/dist/`.

### Devtools UI

Once the API is running in debug mode, open the Devtools dashboard:

```bash
pnpm local:devtools
```

Or navigate directly to `http://localhost:3001/_devtools/`.

The Devtools module graph, route table, and request inspector are available at `/_devtools/*`. This endpoint is **never mounted in production** (`NODE_ENV=production`).

### Agent debugging (inspector-mcp)

Agents (including Cursor's built-in agent) can attach to the Node inspector via the [inspector-mcp](https://github.com/amine7511/inspector-mcp) MCP server. Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "inspector-nest": {
      "command": "npx",
      "args": ["-y", "inspector-mcp", "--port", "9229"]
    }
  }
}
```

This lets the agent introspect the module graph, list providers, and step through TypeScript source.

### Debugging without Devtools (inspector only)

The `start:debug` script enables only the Node inspector (no Devtools HTTP routes):

```bash
pnpm --filter @resubuild/api start:debug
```

### Notes

- The inspector port (`9229`) binds to all interfaces (`0.0.0.0`). Do not expose port 9229 publicly.
- `DevtoolsModule` is gated on `NODE_ENV !== 'production'` — running `pnpm start` or `NODE_ENV=production node dist/main` will **not** mount `/_devtools/`.

## Scripts

See `package.json`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm test`.
