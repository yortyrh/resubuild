## 1. Dependencies and scaffolding

- [x] 1.1 Add `@wysimark/react@3.0.20` (+ peer requirements) and remove `@uiw/react-md-editor` from `apps/web/package.json`; register `patches/@wysimark__react@3.0.20.patch` in `pnpm-workspace.yaml`.
- [x] 1.2 Introduce `apps/api/src/media/` module (`MediaController`, `MediaService`, `media-upload.types.ts`); register in `apps/api/src/app.module.ts`.
- [x] 1.3 Document env vars (`MEDIA_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_API_URL`, `MEDIA_MAX_BYTES`) in `apps/api/README.md` and `apps/api/.env.example`.
- [x] 1.4 Add Supabase migration `supabase/migrations/20260524130000_create_media_table.sql` for `public.media` registry + RLS.

## 2. Backend – upload API

- [x] 2.1 Implement Bearer-guarded **`POST /media/upload`** (multipart field `file`) and public **`GET /media/:id`** stream under `/media` prefix.
- [x] 2.2 Upload flow: Supabase Storage object at `{user_id}/{uuid}.{ext}`, insert `public.media` row, return `{ id, url, contentType }` with API viewer URL; rollback Storage object on DB insert failure.
- [x] 2.3 Unit tests beside service/controller (`media.service.spec.ts`, `media.controller.spec.ts`) with Jest `-- --run`; cover auth, MIME/size validation, happy path, rollback, and stream.
- [x] 2.4 `MediaService.onModuleInit`: fail fast in production when storage env missing; warn in dev.

## 3. Frontend – shared clients and primitives

- [x] 3.1 Add `uploadResumeMedia(file)` and `MediaUploadResult` to `apps/web/src/lib/api.ts` (multipart POST, bearer refresh parity with CV fetchers).
- [x] 3.2 `TextField`, `StringListField`, and related primitives accept `description` prop; wire help copy across section cards in `cv-sections.tsx`.
- [x] 3.3 Add `CountryCodeField` (`apps/web/src/components/cv/country-code-field.tsx`) bound to ISO alpha-2 codes.

## 4. Frontend – rich text replacement

- [x] 4.1 Replace `markdown-editor.tsx` with `@wysimark/react` via `markdown-editor-impl.tsx`; preserve `variant`, `value`, `onChange`, `placeholder`, `className` props.
- [x] 4.2 Load editor with `next/dynamic({ ssr: false })`; patch Wysimark dist `:first-child` → `:first-of-type` for remaining Emotion SSR warnings.
- [x] 4.3 **pnpm patch** toolbar: inline `minimalToolbar` (Bold, Italic, Strikethrough, Emoji); block `compactBlockToolbar` (+ Link, Lists, Block Quote, Table, Emoji); remove paragraph styles, code blocks, and in-editor image upload.
- [x] 4.4 Override editor padding in `globals.css` (block `1rem`, inline `0.5rem` on `[data-slate-editor='true']`).
- [x] 4.5 Remove `@uiw/react-md-editor` imports and dependency.

## 5. Frontend – Basics & tabs layout

- [x] 5.1 Refactor `cv-sections.tsx` Basics ordering: Name, Label + hint, Summary (Wysimark), contact fields, structured location + `CountryCodeField`, optional `address` help, profile photo upload (`uploadResumeMedia`) + URL fallback last.
- [x] 5.2 Extract `basics.profiles` into **Social profiles** tab; remove duplicate from Basics.
- [x] 5.3 Tab list includes Social profiles alongside existing section tabs.

## 6. Frontend – cross-section help text

- [x] 6.1 Work experience: Summary, Description, Highlights descriptions per product copy.
- [x] 6.2 Education, Skills, Projects, Awards, Certificates, Publications, Interests, References: targeted `description` strings per cv-editor-ui spec.

## 7. Verification

- [ ] 7.1 Manual QA matrix: Basics save roundtrip (`countryCode`, avatar URL from upload vs paste), Social Profiles tab isolation, Wysimark toolbar scope, no SSR `:first-child` console warnings.
- [x] 7.2 Automated tests pass with mocked Storage (`pnpm test` / API Jest `-- --run`).

_Note (7.1): Requires applied Supabase migration + `MEDIA_BUCKET` / service role for live uploads._
