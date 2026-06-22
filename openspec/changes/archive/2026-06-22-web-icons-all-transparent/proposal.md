## Why

The web app's icon pipeline (`scripts/generate-icons.config.mjs`) was emitting
every PNG/ICO artifact with a solid `#FDFDFD` opaque backdrop (because each
output declared `transparent: false`). That backdrop was the source SVG's
full-bleed `<rect fill="#FDFDFD">` painted into the outer margin band, so the
favicon, the 192/512 PWA icons, the maskable PWA icon, the iOS apple-touch
icon, and the multi-resolution `favicon.ico` all carry a square off-white
plate even in contexts where the host UI is dark (dark-mode browser chrome,
Android system bar when the PWA is installed as a standalone app, link
previews that paint their own background, etc.).

This change retroactively documents the fix already implemented in the working
tree: flip every output's `transparent` flag to `true` so the pipeline strips
the source SVG's full-bleed backdrop and rasterizes the brand glyph alone onto
a transparent canvas. The artwork no longer paints an opaque off-white plate
and the icons blend cleanly with any host surface.

## What Changes

- `scripts/generate-icons.config.mjs`: flip `transparent: false` →
  `transparent: true` for every entry in the `outputs` array (6 outputs:
  `icon.png`, `icon-192x192.png`, `icon-512x512.png`,
  `maskable-icon-512x512.png`, `apple-touch-icon.png`, and the
  multi-resolution `favicon.ico`).
- Regenerate every PNG/ICO artifact declared in the config from the existing
  `apps/web/public/icon.svg` source via `pnpm icons:generate`:
  - `apps/web/public/icon.png` (512×512)
  - `apps/web/public/icon-192x192.png` (192×192)
  - `apps/web/public/icon-512x512.png` (512×512)
  - `apps/web/public/maskable-icon-512x512.png` (512×512)
  - `apps/web/public/apple-touch-icon.png` (180×180)
  - `apps/web/src/app/favicon.ico` (multi-resolution 16/32/48)

No source code, no API, no schema, no dependency change. The pipeline script
(`scripts/generate-icons.mjs`) is untouched — the config change alone drives
the new behavior.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

_None._ The `web-icon-generation` spec already requires the pipeline to
honor per-output `transparent: true` vs `transparent: false` and to strip the
source SVG's full-bleed `<rect>` when `transparent: true` is set. Switching
the default for every entry in the config is a routine config tweak inside
the existing capability, not a spec-level change.

## Impact

- `scripts/generate-icons.config.mjs` — 6 lines flipped
  (`transparent: false` → `transparent: true`); file size unchanged.
- `apps/web/public/icon.png` — regenerated 512×512 transparent PNG
  (21,394 → 16,158 bytes; smaller because the off-white plate is now
  transparent).
- `apps/web/public/icon-192x192.png` — regenerated 192×192 transparent PNG
  (6,087 → 5,280 bytes).
- `apps/web/public/icon-512x512.png` — regenerated 512×512 transparent PNG
  (21,394 → 16,158 bytes).
- `apps/web/public/maskable-icon-512x512.png` — regenerated 512×512
  transparent PNG (21,394 → 16,158 bytes).
- `apps/web/public/apple-touch-icon.png` — regenerated 180×180 transparent
  PNG (5,621 → 4,902 bytes).
- `apps/web/src/app/favicon.ico` — regenerated multi-resolution 16/32/48
  transparent ICO (3,036 → 2,822 bytes).

No runtime dependency changes, no API changes, no migration. Downstream
consumers: browser tab favicon, iOS/Android home-screen icons, PWA launcher
icons, link preview cards — all now render the glyph alone over the host's
background instead of an off-white plate.
