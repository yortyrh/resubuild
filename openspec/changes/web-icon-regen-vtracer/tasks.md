## 1. Source SVG swap

- [x] 1.1 Replace `apps/web/public/icon.svg` with the VTracer-rebuilt artwork (530×530 viewBox, full-bleed rounded-square backdrop, glyph paths inside).

## 2. Regenerate icon pipeline outputs

- [x] 2.1 Run `pnpm icons:generate` to regenerate every PNG/ICO artifact declared in `scripts/generate-icons.config.mjs`.
- [x] 2.2 Verify `apps/web/public/icon.png` (1024×1024), `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`, `maskable-icon-512x512.png` exist on disk and are valid PNGs.
- [x] 2.3 Verify `apps/web/src/app/favicon.ico` is a valid multi-resolution ICO bundling 16×16, 32×32, 48×48.

## 3. Remove stale intermediate

- [x] 3.1 Delete `apps/web/public/vectorized.svg` (intermediate from the previous tracing attempt; no longer referenced by the app or pipeline).

## 4. Validate

- [x] 4.1 Re-run `pnpm icons:generate` a second time to confirm idempotency (no errors, outputs unchanged).
- [x] 4.2 Confirm no app code, manifest metadata, or pipeline scripts were modified.

## E2E test impact

None — UI/asset-only change. The icon-generation pipeline is exercised by colocated Vitest unit tests (`scripts/generate-icons.spec.mjs`), not by Playwright E2E flows. Per `openspec/specs/e2e-testing/spec.md`, **must pass unchanged**: no E2E selector or assertion references these static assets.
