## Why

The `apps/web/public/icon.svg` source artwork has been re-traced (VTracer) into a smaller, cleaner vector that matches the latest brand mark. Every PNG/ICO artifact that `scripts/generate-icons.mjs` derives from that SVG (favicon, OS touch icon, 192/512 PWA icons, maskable icon) is now stale and needs to be regenerated from the new source so the web app and PWA expose the redesigned logo consistently. The previous leftover `apps/web/public/vectorized.svg` was a one-off intermediate file from the prior tracing attempt and is no longer needed.

## What Changes

- Replace `apps/web/public/icon.svg` with the VTracer-rebuilt source artwork (smaller, cleaner vector, rounded `rx="96"` square frame, `#FDFDFD` backdrop).
- Regenerate every web/PWA icon variant from the new SVG via the existing `pnpm icons:generate` pipeline:
  - `apps/web/public/apple-touch-icon.png`
  - `apps/web/public/icon.png`
  - `apps/web/public/icon-192x192.png`
  - `apps/web/public/icon-512x512.png`
  - `apps/web/public/maskable-icon-512x512.png`
  - `apps/web/src/app/favicon.ico` (multi-resolution 16/32/48)
- Delete the obsolete `apps/web/public/vectorized.svg` intermediate artifact (no longer referenced anywhere in the app or pipeline).

No requirement changes — the existing `web-icon-generation` capability already mandates this regeneration behaviour. This change only updates inputs (SVG) and outputs (PNG/ICO artifacts).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

_None._ The `web-icon-generation` spec already requires the SVG → PNG/ICO pipeline to be re-runnable from a single source SVG; regenerating with a different source SVG is a routine pipeline run, not a spec-level change.

## Impact

- `apps/web/public/icon.svg` — source SVG swapped (3 lines, 530×530 viewBox).
- `apps/web/public/{apple-touch-icon,icon,icon-192x192,icon-512x512,maskable-icon-512x512}.png` — regenerated bitmaps.
- `apps/web/src/app/favicon.ico` — regenerated multi-resolution ICO.
- `apps/web/public/vectorized.svg` — deleted (no remaining references).
- No source code, no API, no schema, no dependency change. Pipeline scripts untouched.
- Downstream consumers: browser tab favicon, iOS/Android home-screen icons, PWA launcher icons — all now show the redesigned mark.
