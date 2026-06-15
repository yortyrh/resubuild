> This change retroactively documents work already implemented in the working tree.

## Why

The public site lacked structured SEO (metadata, sitemap, robots, JSON-LD, trend-aligned keywords) and loaded React Query plus Supabase session listeners on every route—including static marketing pages. Auth pages lived at loose `app/login` paths without a shared layout for provider scoping or `noindex` metadata. Google Trends data highlighted high-intent resume queries (best resume, resume skills, AI resume, resume summary) that the FAQ and metadata did not target.

## What Changes

- Add shared site config (`site.ts`), Google Trends–aligned keywords (`seo-faq.ts`), expanded marketing FAQ copy, and `FAQPage` JSON-LD on `/`.
- Add root metadata (Open Graph, Twitter, viewport, robots, icons, keywords) and marketing layout metadata wired to `siteConfig`.
- Add App Router SEO routes: `sitemap.ts`, `robots.ts`, `manifest.ts`, and `JsonLd` structured-data component with unit tests.
- Move login, register, forgot-password, and reset-password under `(auth)/` route group with `noindex` metadata and `AuthenticatedProviders`; add `auth/layout.tsx` for check-email/callback routes.
- Split `AppProviders` (root passthrough) from `AuthenticatedProviders` (Query + Supabase listener); mount authenticated providers only on dashboard and auth layouts.
- Harden `next.config.ts` with security/cache headers, `poweredByHeader: false`, and package import optimization.
- Add colocated Vitest coverage for SEO config, JSON-LD, sitemap/robots handlers, and moved auth tests.

## Capabilities

### New Capabilities

- `web-seo`: Public-site SEO metadata, sitemap, robots, web manifest, JSON-LD, and trend-aligned FAQ schema.

### Modified Capabilities

- `landing-page`: FAQ section expanded with Google Trends–driven Q&A; subtitle and minimum FAQ count updated.
- `web-application`: Auth routes grouped under `(auth)/`; authenticated client providers scoped to auth/dashboard; dashboard and auth layouts emit `noindex` robots metadata.

## Impact

- **Code**: `apps/web/src/lib/{site,seo-faq}.ts`, `apps/web/src/components/seo/json-ld.tsx`, `apps/web/src/app/{sitemap,robots,manifest}.ts`, root and marketing layouts, `(auth)/*`, `auth/layout.tsx`, provider split, `next.config.ts`, marketing FAQ/header/footer tweaks.
- **Routing**: Public URLs unchanged (`/login`, `/register`, etc.); implementation paths move under `(auth)/`.
- **Dependencies**: No new npm packages; no API contract changes.
- **E2E**: UI-only provider scoping and SEO surface — existing API E2E scenarios unchanged.
