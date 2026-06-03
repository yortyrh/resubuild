# Resumind API (NestJS)

REST API for authenticated CV persistence and **auth issuance** consumed by `apps/web` over HTTPS (possibly on a **different hostname** than the Next.js UI).

## Environment

| Variable                    | Purpose                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL (server-side only).                                                                                                                                                                                                                                  |
| `SUPABASE_ANON_KEY`         | Public anon key — used server-side only for `/auth/login`, `/auth/register`, `/auth/refresh` and JWT validation (`auth.getUser`).                                                                                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server-only** — used for Supabase Storage uploads in `POST /media/upload` (`MediaService`). Never expose to the browser.                                                                                                                             |
| `MEDIA_BUCKET`              | Supabase Storage bucket name for resume-owned uploads (images). Required for uploads when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.                                                                                                                         |
| `MEDIA_MAX_BYTES`           | Optional max upload size in bytes (default 10 MiB).                                                                                                                                                                                                                       |
| `PUBLIC_API_URL`            | Optional. Public base URL of this API (**no trailing slash**) used when building canonical image URLs (`{PUBLIC_API_URL}/media/{id}`). If omitted, defaults to `http://localhost:${PORT}`. Production: set to the HTTPS origin browsers use (`<img src=…>` must load it). |
| `PORT`                      | Listen port (`3001` default locally).                                                                                                                                                                                                                                     |
| `CORS_ORIGIN`               | Comma-separated browser origins allowed to call the API (example: `http://localhost:3000` or `https://app.example.com`). No cookies auth: **`credentials` is off** — clients send `Authorization: Bearer` only.                                                           |

Optional / legacy entries may exist in `.env.example`; JWT secret validation is unused if you rely solely on Supabase-backed tokens.

## Auth (JSON Bearer, no cookie transport)

Responses return **tokens in JSON**. The SPA holds `access_token` / `refresh_token` client-side (`sessionStorage` in the bundled web app today) and sends:

```http
Authorization: Bearer <access_token>
```

| Method | Path             | Notes                                                                                  |
| ------ | ---------------- | -------------------------------------------------------------------------------------- |
| `POST` | `/auth/register` | `201`; body `{ access_token, ... }` or `{ message }` if email confirmation is required |
| `POST` | `/auth/login`    | `200`; returns token bundle                                                            |
| `POST` | `/auth/refresh`  | `{ "refresh_token": "..." }` → new bundle                                              |
| `POST` | `/auth/logout`   | `204`; client clears local tokens (`POST` intentionally no-body)                       |
| `GET`  | `/auth/me`       | Bearer required; `{ user: { id, email } }`                                             |

CORS exposes `Authorization` and `Content-Type` on preflight. Add every deployed web origin exactly (no wildcard in production recommended).

### Media (Supabase Storage + registry rows)

Uploads accept **multipart** `file` on `POST /media/upload` behind the same **Bearer** guard as `/cv`. The service writes objects to Storage under `{user_id}/{media_uuid}.{ext}` (MIME allowlist: PNG, JPEG, WebP, GIF), inserts a row in **`public.media`**, and responds with **`{ id, url, contentType }`**. The **`url`** points at **`GET /media/:id`** on this API (`PUBLIC_API_URL` or `http://localhost:${PORT}`), not the Supabase Storage public URL, so embeddings depend only on the media id portion of that path.

**`GET /media/:id`** is **public** (no Bearer) and streams bytes with `Cache-Control: public`. Treat the UUID as an unguessable capability if you rely on secrecy.

In **production**, if `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MEDIA_BUCKET` are not all set at startup, `MediaService` **throws** during `onModuleInit`. In non-production, uploads are disabled with a warning until those variables are provided.

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

Provider/model lists are discovered via Mastra's `MastraModelGateway`
(`PROVIDER_REGISTRY` from `@mastra/core`) and enriched with model metadata
fetched from [models.dev](https://models.dev/api.json). The catalog is loaded
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

Routes under `/applications/*` reuse the active AI agent account (`AiAgentCredentialService`) and the prepare workflow in `@resumind/import-agent`.

## MCP server (Streamable HTTP)

Users enable MCP in the dashboard, create up to **two** API keys, and connect external agents (Cursor, Claude Desktop, etc.). MCP requests use `Authorization: Bearer <mcp_api_key>` — not the Supabase JWT used by the web app.

| Variable                 | Purpose                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_SERVER_ENABLED`     | Set to `false` to return `503` on `/mcp` while keeping key management routes available. Default: enabled when unset.                                                                                                  |
| `MCP_KEY_PEPPER`         | Optional HMAC pepper for API key hashing (defaults to `SUPABASE_SERVICE_ROLE_KEY`).                                                                                                                                   |
| `MCP_EXPORT_BUCKET`      | **Required** for the four `export_cv_*` MCP tools. Name of the Supabase Storage bucket that holds short-lived rendered artifacts. Create with `supabase storage create mcp-exports --public false` (see setup below). |
| `MCP_EXPORT_TTL_SECONDS` | Default signed-URL TTL in seconds (default `3600` = 1h). Agents can override per-call via `fetch_export_url` (`[60, 86400]`).                                                                                         |
| `MCP_EXPORT_MAX_BYTES`   | Max decoded size for MCP exports (default 10 MiB). Enforced at upload time inside `ExportStorageService`; oversize returns 413.                                                                                       |

| Method         | Path                     | Auth                                                             |
| -------------- | ------------------------ | ---------------------------------------------------------------- |
| `GET`          | `/settings/mcp`          | Supabase JWT                                                     |
| `PATCH`        | `/settings/mcp`          | Supabase JWT — `{ "mcpEnabled": true }`                          |
| `POST`         | `/settings/mcp/keys`     | Supabase JWT — optional `{ "label" }`; returns `{ secret }` once |
| `DELETE`       | `/settings/mcp/keys/:id` | Supabase JWT — revoke key                                        |
| `POST` / `GET` | `/mcp` and `/mcp/`       | MCP API key                                                      |

### Example MCP client config (Cursor / Claude)

```json
{
  "mcpServers": {
    "resumind": {
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

The four `export_cv_*` tools (HTML / PDF / PNG / JSON Resume) no longer return inline content. Each successful call uploads the rendered artifact to a dedicated `MCP_EXPORT_BUCKET` and returns a small envelope whose `url` is a **Supabase Storage signed URL** — a self-contained URL with a `?token=…` query parameter that authenticates the request at the storage host. There is no API-host download endpoint: paste the `url` into a browser tab, `curl`, `wget`, `fetch`, `Read`/open in editors, etc., and the Supabase Storage host serves the artifact directly. No `Authorization: Bearer` header is required.

```json
{
  "exportId": "9f1b…",
  "url": "https://<project>.supabase.co/storage/v1/object/sign/mcp-exports/<user>/<cv>/pdf/9f1b….pdf?token=…",
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
- **JSON Resume (`export_cv_jsonresume`)** — `curl <url> | jq .` or `fetch(url).then(r => r.json())`; served as `application/json; charset=utf-8`. The envelope also includes a `document` field with the parsed JSON Resume object (includes `$schema` and `meta`, strips Resumind-internal row ids) so agents can reason about it inline without a follow-up `fetch`.

> **BREAKING**: clients that previously consumed `html`, `contentBase64`, or `document` directly from the tool result must switch to `fetch(url)` (or the new `document` field for JSON Resume). Tool descriptions are updated to reflect the new shape.

The default TTL is **1h** (`MCP_EXPORT_TTL_SECONDS`). If a URL is about to expire, agents can re-fetch it via the `fetch_export_url` tool (passing the prior `exportId`, optionally with a `ttlSeconds` between 60 and 86400). The same `mcp_export` row is reused, its `expires_at` is extended, and a fresh `?token=…` query string is issued. Unknown / swept exports return 404. A scheduled sweep (`@nestjs/schedule` cron every 5 minutes) deletes expired rows and removes their storage objects best-effort.

##### Bucket setup (one-off, per environment)

The bucket is declared in `supabase/config.toml` (private, 10 MiB, MIME-allowlisted for `application/pdf`, `text/html`, `image/png`, `application/json`) and is created automatically on the next `supabase start`. For local Supabase stacks started before the declaration was added, re-running `pnpm setup:env` (or `bash scripts/setup-local-env.sh`) provisions it via the storage management API on demand, so you do not need to run `supabase storage create` manually.

Add `MCP_EXPORT_BUCKET=mcp-exports` to your `.env` (or the equivalent env file your platform reads); `pnpm setup:env` writes this for you. The other env vars (`MCP_EXPORT_TTL_SECONDS`, `MCP_EXPORT_MAX_BYTES`) are optional and default to 3600 / 10 MiB.

## Scripts

See `package.json`: `pnpm dev`, `pnpm build`, `pnpm test`.
