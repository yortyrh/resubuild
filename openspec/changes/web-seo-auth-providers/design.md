## Context

Marketing pages shipped without centralized SEO config, crawler directives, or FAQ structured data. The root `AppProviders` wrapped every route in React Query and Supabase session sync, adding client bundle work to static marketing HTML. Auth pages were flat files under `app/login` without a route-group layout for shared metadata or provider boundaries.

## Goals / Non-Goals

**Goals:**

- Trend-aligned keywords and FAQ content derived from Google Trends selections (underlined queries).
- `FAQPage` JSON-LD on `/` matching visible FAQ markup.
- Sitemap, robots, manifest, and rich root metadata for crawlers and social previews.
- Scope `AuthenticatedProviders` to routes that need session/query state.
- Group credential auth pages under `(auth)/` with `noindex` robots metadata.

**Non-Goals:**

- Changing auth API contracts or Supabase configuration.
- Adding third-party SEO SaaS integrations.
- Indexing dashboard or auth pages in search engines.

## Decisions

### 1. Shared `siteConfig` + `seo-faq.ts`

`site.ts` holds title, description, OG image, locale, and keywords imported from `seo-faq.ts`. FAQ questions/answers live in one module consumed by both `MarketingFaq` and `JsonLd` so schema matches visible content.

### 2. FAQPage JSON-LD only on `/`

`JsonLd` emits `FAQPage` when `path` is `/` (or unset in marketing layout). `/features` gets WebPage + SoftwareApplication graph nodes without FAQ duplication.

### 3. Provider split

`AppProviders` at root returns `children` only. `AuthenticatedProviders` (client) wraps `QueryProvider` + `SupabaseListener` and mounts in `(auth)/layout.tsx`, `auth/layout.tsx`, and `dashboard/layout.tsx`.

### 4. Auth route group `(auth)/`

Login, register, forgot-password, reset-password move to `(auth)/` with unchanged URLs. Layout sets `robots: { index: false, follow: false }`. OAuth callback and check-email routes keep `auth/` prefix with the same authenticated layout.

### 5. Crawler policy via `robots.ts`

Allow `/`; disallow `/dashboard/` and `/api/`. Sitemap lists `/` and `/features` only. Dashboard layout metadata reinforces `noindex`.

### 6. Security and cache headers in `next.config.ts`

Immutable cache for static assets; HSTS, nosniff, referrer-policy on all routes; disable `X-Powered-By`.

## Risks / Trade-offs

- **Large FAQ section** — fourteen items (nine SEO + five product) increases page length; acceptable for SEO targeting.
- **Keyword meta tag** — Google largely ignores it; kept for other crawlers and consistency with Trends research.
- **Marketing footer Live demo** — still links to `app.resubuild.dev`; unchanged from prior marketing work.

## Migration Plan

No migration. Set `NEXT_PUBLIC_SITE_URL` in production for canonical/OG URLs. Deploy web app only.
