## 1. Flip every output's `transparent` flag in the config

- [x] 1.1 In `scripts/generate-icons.config.mjs`, change `transparent: false` → `transparent: true` for `apps/web/public/icon.png`.
- [x] 1.2 In `scripts/generate-icons.config.mjs`, change `transparent: false` → `transparent: true` for `apps/web/public/icon-192x192.png`.
- [x] 1.3 In `scripts/generate-icons.config.mjs`, change `transparent: false` → `transparent: true` for `apps/web/public/icon-512x512.png`.
- [x] 1.4 In `scripts/generate-icons.config.mjs`, change `transparent: false` → `transparent: true` for `apps/web/public/maskable-icon-512x512.png`.
- [x] 1.5 In `scripts/generate-icons.config.mjs`, change `transparent: false` → `transparent: true` for `apps/web/public/apple-touch-icon.png`.
- [x] 1.6 In `scripts/generate-icons.config.mjs`, change `transparent: false` → `transparent: true` for `apps/web/src/app/favicon.ico` (the multi-resolution 16/32/48 ICO entry).

## 2. Regenerate every icon artifact from the existing SVG

- [x] 2.1 Run `pnpm icons:generate` to regenerate every PNG/ICO artifact declared in `scripts/generate-icons.config.mjs` from `apps/web/public/icon.svg`.
- [x] 2.2 Verify `apps/web/public/icon.png` (512×512), `icon-192x192.png` (192×192), `icon-512x512.png` (512×512), `apple-touch-icon.png` (180×180), and `maskable-icon-512x512.png` (512×512) all exist on disk and are valid PNGs with fully-transparent outer pixels.
- [x] 2.3 Verify `apps/web/src/app/favicon.ico` is a valid multi-resolution ICO bundling 16×16, 32×32, and 48×48 sub-images, all with fully-transparent backdrops.

## 3. Validate

- [x] 3.1 Re-run `pnpm icons:generate` a second time to confirm idempotency (no errors, outputs byte-identical to the first run).
- [x] 3.2 Confirm `scripts/generate-icons.mjs`, `apps/web/public/icon.svg`, `apps/web/public/manifest.ts`, and `apps/web/src/app/layout.tsx` were not modified.
- [x] 3.3 Confirm PNG/ICO file sizes decreased relative to the prior opaque-backdrop versions (transparent compresses smaller than the prior `#FDFDFD` plate).

## E2E test impact

Per `openspec/specs/e2e-testing/spec.md`, this change touches only the
icon-generation config and the static PNG/ICO artifacts it emits. No API,
media, auth, or CV persistence contract changes — E2E coverage is
unaffected.

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all existing scenarios (auth, CV list/get,
  media upload, export, template presentation, lifecycle, sections, AI
  agent, import LLM, import URL, MCP) continue to pass without modification.

### Update required

- None.

### Add

- None — the icon pipeline is exercised by colocated Vitest unit tests at
  `scripts/generate-icons.spec.mjs` (per `web-icon-generation` requirement
  "The icon pipeline SHALL be unit-tested with colocated Vitest specs"),
  not by Playwright E2E flows. No new E2E selector references these static
  assets.
