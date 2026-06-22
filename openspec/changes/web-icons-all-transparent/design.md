## Context

The web app's icon pipeline is fully specified by the existing
`web-icon-generation` capability
(`openspec/specs/web-icon-generation/spec.md`). The pipeline:

- Single source: `apps/web/public/icon.svg` (VTracer-rebuilt rounded-square
  backdrop with `#FDFDFD` fill, glyph paths inside the backdrop group)
- One Node script: `scripts/generate-icons.mjs` driven by
  `scripts/generate-icons.config.mjs`
- Generated outputs (per `scripts/generate-icons.config.mjs`):
  - `apps/web/public/icon.png` (512×512)
  - `apps/web/public/icon-192x192.png` (192×192)
  - `apps/web/public/icon-512x512.png` (512×512)
  - `apps/web/public/maskable-icon-512x512.png` (512×512)
  - `apps/web/public/apple-touch-icon.png` (180×180)
  - `apps/web/src/app/favicon.ico` (multi-resolution 16/32/48)
- Entrypoint: root `pnpm icons:generate` (also called from root `pnpm build`)

The spec mandates that each output can independently declare
`transparent: true` (the script strips the SVG's full-bleed `<rect>` and
rasterizes the glyph onto a transparent canvas) or `transparent: false` (the
script keeps the background rect and paints the outer margin band with the
SVG's detected background fill). Historically every entry was set to
`transparent: false`, which painted an opaque `#FDFDFD` plate behind every
glyph — visible as an off-white square on dark-mode browser chrome, on
Android system bars when the PWA is installed as a standalone app, in link
preview cards that paint their own background, and anywhere else the host
UI is not paper-white.

The fix is a config-only tweak: flip every entry to `transparent: true` so
the glyph lives alone over whatever background the host paints.

## Goals / Non-Goals

**Goals:**

- Drop the off-white opaque plate behind every web/PWA icon so the brand
  glyph blends cleanly with any host surface.
- Preserve pipeline behavior already locked down by `web-icon-generation`
  (no new sizes, no margin tweaks, no script edits).
- Keep the SVG source-of-truth unchanged — the change is at the config
  layer only.

**Non-Goals:**

- No changes to `scripts/generate-icons.mjs` (the pipeline script).
- No changes to `apps/web/public/icon.svg` (the source artwork).
- No changes to `package.json` `icons:generate` / `build` scripts.
- No changes to `apps/web/public/manifest.ts` or Next.js `metadata.icons`
  in `apps/web/src/app/layout.tsx` (paths and sizes remain identical).
- No introduction of new icon variants or new output paths.

## Decisions

### Flip every entry in `scripts/generate-icons.config.mjs` to `transparent: true`

The pipeline script already implements the `transparent: true` branch:
when an output declares `transparent: true`, the script strips the SVG's
full-bleed background `<rect>` (the `#FDFDFD` rounded square) before
rasterizing and composites the glyph onto a transparent canvas. Flipping
the flag is sufficient — no script edit, no new config keys, no new
defaults.

**Alternative considered:** editing `apps/web/public/icon.svg` to drop the
full-bleed `<rect>`. Rejected because (a) the rect is part of the brand
artwork's intentional rounded-square frame and removing it would change the
vector source in a way that the spec scenario "A regenerated SVG parses with
a single full-bleed rounded-square backdrop" would no longer cover; (b) the
`web-icon-generation` spec requires the `<rect>` to exist so non-transparent
outputs can detect and reuse its fill color; (c) it would be a one-way
ratchet — re-adding the rect to a future `transparent: false` output would
require the SVG to be re-traced.

**Alternative considered:** adding a "transparent by default" key to the
config that the script applies when the per-output `transparent` field is
omitted. Rejected because every existing entry already declares
`transparent: false` explicitly; introducing a new global default would
either require touching every entry anyway (no net win) or change the
semantics of omitted fields (silent breakage).

### Re-run the existing `pnpm icons:generate` pipeline verbatim

The pipeline is the spec-mandated source of truth for icon artifacts. After
flipping the config, `pnpm icons:generate` regenerates every PNG/ICO from
the same `icon.svg` and writes them to the same paths. No manual PNG/ICO
edits, no detached workflows.

**Alternative considered:** hand-editing the PNG/ICO files with an image
tool to strip the background. Rejected — would diverge from the source of
truth and break the spec scenario "Re-running the script is idempotent for
unchanged inputs."

## Risks / Trade-offs

- **Visual regression on cached clients** — Browser tab favicons, PWA home-
  screen icons, and link preview cards cache aggressively; users with stale
  caches will see the off-white plate until the cache invalidates.
  → Mitigation: this is the desired state. PWA icon caches invalidate on
  `manifest` version bump; favicon caches clear with a hard refresh; link
  preview cards re-fetch on next share.
- **Legibility on light backgrounds** — The brand glyph was designed
  assuming an off-white plate; on a pure white host background the glyph
  alone may have less contrast than the previous plate-backed version.
  → Mitigation: the brand color palette (`#5629E3`, `#06A597`, `#5528E3`,
  `#09A698`) was chosen with sufficient contrast against `#FFFFFF`; the
  spec'd `margin: 0` keeps the glyph filling the bitmap so the host
  background shows only in the corners where the SVG already has no
  painted pixels.
- **Future `transparent: false` outputs** — A future contributor who wants
  a solid backdrop for a new icon variant (e.g., a future sticker pack)
  will need to opt back in to `transparent: false`. The pipeline still
  supports that path; this change just sets the current set to transparent.
  → Mitigation: per-output config is documented in
  `scripts/generate-icons.config.mjs` JSDoc; `web-icon-generation` spec
  Scenario "A `transparent: true` output strips the SVG's full-bleed
  background" still pins the behavior for both modes.

## Migration Plan

1. Edit `scripts/generate-icons.config.mjs`: flip `transparent: false` →
   `transparent: true` for all 6 entries in `outputs`.
2. Run `pnpm icons:generate` to regenerate every PNG/ICO artifact.
3. Verify the 6 outputs are valid PNG/ICO files with smaller byte counts
   (transparent backgrounds compress to fewer bytes than the prior opaque
   `#FDFDFD` plate).
4. Confirm no app code, manifest metadata, or pipeline script was
   modified.

**Rollback:** `git checkout -- scripts/generate-icons.config.mjs` restores
the prior config; re-running `pnpm icons:generate` regenerates the prior
opaque-backdrop icons. `git checkout -- apps/web/public apps/web/src/app/`
restores the prior PNG/ICO artifacts directly without re-running the
pipeline.

## Open Questions

None.
