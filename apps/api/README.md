# Resumind API (NestJS)

REST API for authenticated CV persistence and **auth issuance** consumed by `apps/web` over HTTPS (possibly on a **different hostname** than the Next.js UI).

## Environment

| Variable            | Purpose                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`      | Supabase project URL (server-side only).                                                                                                                                                                        |
| `SUPABASE_ANON_KEY` | Public anon key — used server-side only for `/auth/login`, `/auth/register`, `/auth/refresh` and JWT validation (`auth.getUser`).                                                                               |
| `PORT`              | Listen port (`3001` default locally).                                                                                                                                                                           |
| `CORS_ORIGIN`       | Comma-separated browser origins allowed to call the API (example: `http://localhost:3000` or `https://app.example.com`). No cookies auth: **`credentials` is off** — clients send `Authorization: Bearer` only. |

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

## CV routes

All `/cv*` routes remain behind `Authorization: Bearer` as before.

## Scripts

See `package.json`: `pnpm dev`, `pnpm build`, `pnpm test`.
