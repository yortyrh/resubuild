## 1. Shared network mapping

- [x] 1.1 Add `social-networks.ts` in `packages/resume-template/src/` with `SOCIAL_NETWORK_SUGGESTIONS`, `normalizeSocialNetworkKey`, and alias map (LinkedIn, Facebook, Instagram, GitHub, Reddit, Discord, X/Twitter, Dribbble, Behance)
- [x] 1.2 Export social network helpers from `packages/resume-template/src/index.ts` for web reuse
- [x] 1.3 Add colocated unit tests `social-networks.test.ts` covering aliases and unknown networks

## 2. Template header icons

- [x] 2.1 Add `packages/resume-template/src/primitives/icons.ts` with inline SVG builders for contact icons (map pin, mail, phone, link) and brand icons for supported networks plus fallback
- [x] 2.2 Update `renderBasicsHeader` in `packages/resume-template/src/primitives/sections/index.ts` to wrap each contact part and profile link with icon-prefixed inline-flex markup; apply underline styling to website anchors
- [x] 2.3 Ensure `tabular`, `left`, `centered`, and `design` header styles all render icons correctly (tabular: per-line; others: wrapped row)
- [x] 2.4 Extend `registry.test.ts` or add `renderBasicsHeader` tests asserting SVG/icon presence for contact fields and GitHub profile sample

## 3. Web contact icons (Basics view)

- [x] 3.1 Add `apps/web/src/components/cv/contact-icons.tsx` (or similar) with Lucide-based contact and social icon resolvers using shared normalization
- [x] 3.2 Add `ContactLineSegment` helper component for icon + children with consistent spacing
- [x] 3.3 Update `managed-basics-section.tsx` contact line to use icon-prefixed segments; keep `ExternalLink` for URL with link icon before text
- [x] 3.4 Add colocated component tests for icon mapping and Basics contact line rendering

## 4. Social profiles editor

- [x] 4.1 Add `SocialNetworkCombobox` in `apps/web/src/components/cv/` modeled on `CountryCodeField` with prioritized suggestions, filter, keyboard nav, and free-text commit
- [x] 4.2 Replace Network `TextField` in `profiles-section.tsx` form with `SocialNetworkCombobox`
- [x] 4.3 Update Social profiles view `renderView` to show brand icon in title alongside network/username
- [x] 4.4 Add colocated tests for combobox free-text commit and profile view icon

## 5. Verification

- [x] 5.1 Run `pnpm --filter @resumind/resume-template test -- --run` and fix failures
- [x] 5.2 Run `pnpm --filter web test -- --run` for new/changed tests and `pnpm --filter web typecheck`
- [x] 5.3 Manually verify preview page (classic template) and Basics/Social profiles editor against sample data with full contact row and GitHub/X profiles

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — CV REST list/get, profile photo, section CRUD, and export routes (no API contract change)
- Auth and dashboard navigation scenarios

### Update required

- None — UI-only and HTML rendering enhancement; no API or persistence shape changes

### Add

- None — icon and combobox behavior covered by colocated unit/component tests; optional future Playwright visual check not required for this change
