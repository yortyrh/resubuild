## 1. SEO configuration

- [x] 1.1 Add `apps/web/src/lib/site.ts` with title, description, keywords, OG image, locale, and `absoluteUrl()`.
- [x] 1.2 Add `apps/web/src/lib/seo-faq.ts` with Google Trends keywords and trend-driven FAQ items plus product FAQ entries.
- [x] 1.3 Expand root `layout.tsx` metadata (Open Graph, Twitter, viewport, robots, icons, keywords).
- [x] 1.4 Wire `(marketing)/layout.tsx` metadata and keywords to `siteConfig`.

## 2. SEO routes and structured data

- [x] 2.1 Add `sitemap.ts`, `robots.ts`, and `manifest.ts` App Router handlers.
- [x] 2.2 Add `JsonLd` component with Organization, WebSite, WebPage, SoftwareApplication, and FAQPage on `/`.
- [x] 2.3 Add `JsonLd` to `(marketing)/layout.tsx` and `/features` page.
- [x] 2.4 Harden `next.config.ts` with cache/security headers and package import optimization.

## 3. Marketing FAQ

- [x] 3.1 Update `MarketingFaq` to consume `marketingFaqItems` from `seo-faq.ts`.
- [x] 3.2 Update FAQ section subtitle for resume-writing SEO context.

## 4. Auth route group and provider split

- [x] 4.1 Move login, register, forgot-password, reset-password to `(auth)/` route group.
- [x] 4.2 Add `(auth)/layout.tsx` with `AuthenticatedProviders` and `noindex` robots metadata.
- [x] 4.3 Add `auth/layout.tsx` with `AuthenticatedProviders` for check-email/callback routes.
- [x] 4.4 Split `AuthenticatedProviders` from root `AppProviders`; mount on dashboard layout.
- [x] 4.5 Add dashboard layout `noindex` robots metadata.
- [x] 4.6 Remove legacy flat auth page files under `app/login`, `app/register`, etc.

## 5. Tests

- [x] 5.1 Add `site.test.ts`, `seo-faq.test.ts`, `json-ld.test.tsx`, `seo-routes.test.ts`.
- [x] 5.2 Move colocated auth tests under `(auth)/`.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all scenarios from the **Test catalog (current)** section of `openspec/specs/e2e-testing/spec.md`.

### Update required

- None — UI-only SEO and provider scoping; auth URLs unchanged.

### Add

- `apps/web/src/lib/seo-faq.test.ts` — trend keywords and FAQ content.
- `apps/web/src/components/seo/json-ld.test.tsx` — FAQPage schema by route.
- `apps/web/src/app/seo-routes.test.ts` — sitemap and robots handlers.
