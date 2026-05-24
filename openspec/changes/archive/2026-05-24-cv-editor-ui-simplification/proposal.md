## Why

The CV editor’s Basics and section forms mix free-text geography fields, Markdown-oriented editors, and dense labels without guidance, which increases errors and hides how structured address and profile-photo data map to JSON Resume. Authors should select countries reliably, compose addresses from clear parts without redundant lines, upload profile images safely, edit rich text without learning Markdown, and find social profiles without crowding Basics.

## What Changes

- Replace the country basics field with a **country picker** (search/select with ISO alignment to JSON Resume `location.countryCode`).
- Clarify **address editing**: structured fields (city, region/state, postal code, country code) remain primary; the legacy “one-line address” textarea is labelled optional/supplementary—not a duplicate editor for the structured row.
- Reorder Basics: **Summary** immediately after **Label**; move **profiles** (`basics.profiles`) to a dedicated **Social Profiles** tab; place **photo / profile image** after structured **Address**, last in Basics.
- Add **hint / description text** under Label (`basics.label`) plus contextual help on sparse fields across Work, Education, Skills, Projects, Awards, Certificates, Publications, Interests, and References.
- Replace **`@uiw/react-md-editor`** with **`@wysimark/react`** for “authoring without Markdown”; constrain toolbars via a **pnpm patch** (Bold, Italic, Strikethrough, Link, lists, block quote, table, emoji—no paragraph styles, code blocks, or in-editor image upload).
- Implement **user-scoped media management**: authenticated **`POST /media/upload`** stores files in **Supabase Storage**, registers rows in **`public.media`**, and returns canonical **`GET /media/:id`** API URLs (opaque UUID; no direct Storage URL in resume JSON). Profile photo upload in Basics uses this path; rich-text editors do **not** expose image upload.

## Capabilities

### New Capabilities

- `cv-editor-ui`: Tabs, Basics field order, country selector, Social Profiles tab, address UX, help/description copy on listed fields, Wysimark integration with trimmed toolbars and client-only SSR loading (`apps/web`).
- `resume-media-uploads`: Authenticated Nest multipart upload, `public.media` registry, public **`GET /media/:id`** streaming proxy, and web client helper `uploadResumeMedia`.

### Modified Capabilities

- `web-application`: Dashboard CV authoring uses country selection, reorganized Basics and tabs, optional help text patterns, `@wysimark/react` instead of Markdown-only editing, and **SHALL NOT** bypass Nest for profile-photo uploads when media APIs exist.
- `cv-rest-api`: Adds authenticated **`POST /media/upload`** and public **`GET /media/:id`**, user-scoped like existing `/cv` patterns.

## Impact

- **Frontend**: CV editor components (`apps/web/src/components/cv/**`), tab layout, `TextField`/form primitives for descriptions, `@wysimark/react` with `pnpm` patch (`patches/@wysimark__react@3.0.20.patch`), dynamic import (`ssr: false`) for SSR safety, padding overrides in `globals.css`.
- **Backend**: Nest `MediaModule` (`MediaService`, `MediaController`); Supabase Storage + `public.media` table; env vars in `apps/api/README.md` and `.env.example`.
- **Database**: Migration `supabase/migrations/20260524130000_create_media_table.sql`.
- **Dependencies**: `@wysimark/react@3.0.20` (patched; transitive `zustand` only inside Wysimark); removed `@uiw/react-md-editor`.
