## Why

The favicon and PWA icons shipped under `apps/web/public/` are generated once-off
from `apps/web/public/icon.svg` and currently live as static PNG/ICO files in
the repo. The source SVG is a square purple-and-teal document mark that bleeds
to the very edges of its viewport, which means any platform that rasterizes it
to a square at standard sizes (browser tabs, `apple-touch-icon`, maskable PWA
icons) crops or pads the artwork inconsistently — producing truncated or
visually clobbered icons in tab bars, home screens, and Android maskable
launchers.

We need a small, repeatable build step that re-rasterizes the SVG to the
canonical icon sizes **with a configurable safe-area margin (as a percent of
each output dimension)** so the icon never touches the bounding box, and so a
favicon `.ico` is produced in the same step. The script must be invokable from
the existing toolchain (npm/pnpm script + turbo task) so future SVG tweaks do
not require manually re-exporting icons in a design tool.

## What Changes

- Add `scripts/generate-icons.mjs` (a Node 20+ ESM script using `sharp`) that
  reads `apps/web/public/icon.svg` and writes:
  - `apps/web/public/icon.png` (canonical, default size — 512×512)
  - `apps/web/public/icon-192x192.png`
  - `apps/web/public/icon-512x512.png`
  - `apps/web/public/maskable-icon-512x512.png` (already margin-padded)
  - `apps/web/public/apple-touch-icon.png` (180×180)
  - `apps/web/public/favicon.ico` (multi-size: 16, 32, 48)
- Add a config file `scripts/generate-icons.config.mjs` that exports a per-output
  `margin` percent (`0..1`, e.g. `0.05` = 5%) and an optional `size` override so
  the script can be tuned without editing source. Defaults: `0.05` margin for
  standard icons; `0.10` margin for `maskable-icon` (PWA spec requires ~10%
  safe area); `0.0` margin for `favicon.ico` (browsers pad favicons
  themselves).
- Add a `pnpm icons:generate` script at the repo root that runs the generator,
  and chain it from the root `pnpm build` script so it always runs before
  `turbo build` orchestrates the workspace builds.
- Update `apps/web/src/app/layout.tsx` `metadata.icons` so the canonical icon
  is the new `icon.png` (not `icon.svg`), and stop relying on `icon.svg` as the
  favicon source — the favicon now resolves to the generated `favicon.ico`
  served from `apps/web/public/`.
- Update `apps/web/src/app/favicon.ico` by re-running the generator (committed
  regenerated artifact).
- Add a colocated Vitest unit test (`scripts/generate-icons.spec.mjs`) that
  asserts: every declared output is produced, every produced file has the
  declared square pixel dimensions, every PNG has the configured margin
  applied (i.e. the colored content does not touch the very edge of the
  bitmap), and a missing config entry throws.

## Capabilities

### New Capabilities

- `web-icon-generation`: A repeatable, config-driven pipeline that converts
  the canonical `icon.svg` into all web/PWA icon variants with a per-output
  safe-area margin and a multi-size favicon `.ico`.

### Modified Capabilities

- `web-seo`: The favicon/`metadata.icons` declaration must point at the
  generated `icon.png` and `favicon.ico`, not the raw `icon.svg`, so users
  receive margin-padded icons on browser tabs, home screens, and Android
  launchers.
- `monorepo-and-toolchain`: The root `pnpm build` script must chain
  `pnpm icons:generate` before `turbo build` so the icon pipeline always
  runs before the workspace builds.

## Impact

- New files:
  - `scripts/generate-icons.mjs`
  - `scripts/generate-icons.config.mjs`
  - `scripts/generate-icons.spec.mjs`
- Regenerated (committed) files:
  - `apps/web/public/icon.png`
  - `apps/web/public/icon-192x192.png`
  - `apps/web/public/icon-512x512.png`
  - `apps/web/public/maskable-icon-512x512.png`
  - `apps/web/public/apple-touch-icon.png`
  - `apps/web/src/app/favicon.ico`
- Modified files:
  - `apps/web/src/app/layout.tsx` (`metadata.icons`)
  - `package.json` (root): new `icons:generate` script and `build` script
    chains `icons:generate && turbo build`
- New runtime dependency (dev-only): `sharp` (pinned, declared under
  `devDependencies` in the root `package.json` — not in `apps/web` runtime).
- No backend, schema, or DB impact.
