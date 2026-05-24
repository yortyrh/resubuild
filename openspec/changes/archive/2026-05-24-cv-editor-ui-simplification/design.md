## Context

Resumind’s dashboard CV editor today uses generic text inputs—including a free-text country value—and `@uiw/react-md-editor`, which biases authors toward Markdown. Basics combines identity, geography, summaries, imagery, social profiles, and long-form prose in ways that overwhelm the primary path (who you are → what you do → how to contact). Help text is minimal. Image handling is a raw **Image URL**, which pushes users toward third-party paste instead of trustworthy uploads.

The web app intentionally talks **only** to `apps/api` with bearer tokens—not direct Supabase clients in the browser (see `openspec/specs/web-application/spec.md`). Upload orchestration stays server-mediated.

JSON Resume semantics already distinguish structured `location` (`city`, `region`, `postalCode`, `countryCode`, optional `address` string).

## Goals / Non-Goals

**Goals:**

- Deliver a Basics flow that mirrors mental models: headline (label), summary, URLs, geographic structure, optional multi-line postal note, avatar last.
- Normalize **country selection** onto ISO-aligned values (`countryCode`) via a searchable UI control.
- Move **profiles** editing out of Basics into **Social Profiles** tab.
- Replace Markdown-first editing with **`@wysimark/react`** and a **trimmed toolbar** (no in-editor image upload).
- Expand **hint microcopy** for Work (summary, description, highlights) and the sparse categorical fields listed in the cv-editor-ui spec.
- Add **Nest-backed**, user-scoped **multipart media upload** with a **`public.media` registry** and **API-hosted viewer URLs** (`GET /media/:id`).

**Non-Goals:**

- Internationalizing UI copy beyond the existing product language decisions.
- Migrating unrelated dashboard shell or landing pages.
- Presigned URL / client-direct-to-Storage upload tickets (MVP uses server-relayed multipart).
- Inline rich-text image insertion inside Wysimark (profile photo upload in Basics only).
- Vector search, CDN invalidation choreography, or orphan-object lifecycle automation beyond documented manual cleanup.

## Decisions

1. **Country picker UX** → `CountryCodeField` combobox (shadcn `Command` + `Popover`) seeded from ISO Alpha-2 data. Persist as `basics.location.countryCode`.
2. **Address textarea semantics** → Structured fields authoritative; **`address` textarea** labelled optional with helper copy clarifying it supplements City / Region / Postal code.
3. **Tab decomposition** → **`Social Profiles`** tab binds `resume.basics.profiles`; Basics drops inline profiles block.
4. **Field order** → Basics: Label (+ hint), Summary (Wysimark), contact fields, structured location grid, optional `address` note, profile photo (file upload + URL paste fallback).
5. **Editor migration** → `@wysimark/react` via shared `MarkdownEditor` wrapper; **`markdown-editor-impl.tsx`** loaded with `next/dynamic({ ssr: false })` to avoid Emotion `:first-child` SSR warnings; **`pnpm` patch** replaces remaining `:first-child` with `:first-of-type` in Wysimark dist.
6. **Wysimark toolbar** → **`pnpm` patch** adds `minimalToolbar` (inline) and `compactBlockToolbar` (block) options:
   - Inline: Bold, Italic, Strikethrough, Emoji.
   - Block: Bold, Italic, Strikethrough, Link, Lists, Block Quote, Table, Emoji.
   - Removed: paragraph style dropdown, extra text styles, code block group, image upload.
7. **Upload pathway** → **`POST /media/upload`** (multipart `file`, Bearer-guarded). Nest writes to Supabase Storage at `{user_id}/{media_uuid}.{ext}`, inserts **`public.media`**, returns `{ id, url, contentType }` where **`url`** is `{PUBLIC_API_URL}/media/{id}`. **`GET /media/:id`** streams bytes publicly (UUID as capability token). No presigned client PUT.
8. **Storage** → Direct Supabase Storage + Postgres registry in `MediaService` (no separate strategy interface in MVP). Production boot fails if `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MEDIA_BUCKET` are missing; dev logs a warning and returns `503` on upload attempts.
9. **Client coupling** → `uploadResumeMedia(file)` in `apps/web/src/lib/api.ts`; used by Basics profile-photo picker only.

Alternatives discarded: presigned URL two-step (simpler MVP with server relay), client-direct-to-Supabase uploads (violates SPA auth architecture), Wysimark inline image upload (removed per product scope), Markdown dual-mode.

## Risks / Trade-offs

| Risk                                   | Mitigation                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| WYSIWYG divergence from stored strings | Wysimark exports Markdown; acceptance via save roundtrip QA.                                               |
| Large asset abuse                      | MIME allow-list (PNG, JPEG, WebP, GIF), `MEDIA_MAX_BYTES` ceiling (default 10 MiB).                        |
| Public `GET /media/:id` leakage        | UUID v4 as opaque capability; document that published ids are world-readable.                              |
| Patched dependency drift               | Pin `@wysimark/react@3.0.20` + `patchedDependencies` in `pnpm-workspace.yaml`; re-apply patch on upgrades. |
| Supabase IAM exposure                  | Service role server-only; Storage objects not exposed via public Storage URL in resume JSON.               |

## Migration Plan

1. Apply Supabase migration `20260524130000_create_media_table.sql`.
2. Configure `SUPABASE_SERVICE_ROLE_KEY`, `MEDIA_BUCKET`, optional `PUBLIC_API_URL` in API env.
3. Ship web editor + Basics upload; remove `@uiw/react-md-editor`.
4. Manual QA: country code, profile upload vs URL paste, Social Profiles tab, work-section hints.

Rollback: revert client editor swap leaving URL paste path; disable uploads by omitting storage env (dev only; prod requires config).

## Open Questions

- Whether to add inline rich-text image upload later (currently out of scope).
- Bucket lifecycle rules for orphaned Storage objects if DB insert fails mid-flight (rollback on insert failure is implemented; periodic cleanup is not).
- PDF/SSR rendering policy for API-hosted media URLs in exports.
