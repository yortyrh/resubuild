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

| Method   | Path                              | Notes                          |
| -------- | --------------------------------- | ------------------------------ |
| `GET`    | `/ai/agents/providers`            | Provider catalog               |
| `GET`    | `/ai/agents/providers/:id/models`   | Models for provider            |
| `GET`    | `/ai/agents/accounts`             | List accounts (no raw keys)    |
| `POST`   | `/ai/agents/accounts`             | Create account (probes key)    |
| `PATCH`  | `/ai/agents/accounts/:id`         | Update account                 |
| `DELETE` | `/ai/agents/accounts/:id`         | Delete account                 |
| `GET`    | `/ai/agents/active`               | Active account summary         |
| `PUT`    | `/ai/agents/active`               | Set active by `accountId`      |

Deprecated aliases under `/import/llm/*` delegate to the same services for one release cycle.

## Scripts

See `package.json`: `pnpm dev`, `pnpm build`, `pnpm test`.
