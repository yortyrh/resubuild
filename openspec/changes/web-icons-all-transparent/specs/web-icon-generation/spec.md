## ADDED Requirements

### Requirement: All current web/PWA icon outputs SHALL be generated with `transparent: true`

The icon pipeline config at `scripts/generate-icons.config.mjs` MUST declare `transparent: true` for every entry in its `outputs` array — the PNG icons (`icon.png`, `icon-192x192.png`, `icon-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`) and the multi-resolution `favicon.ico` — so the pipeline strips the source SVG's full-bleed `<rect>` and rasterizes the brand glyph alone onto a transparent canvas. The off-white opaque plate the prior `transparent: false` defaults produced (`#FDFDFD` painted into the outer margin band) is no longer desired — the icons MUST blend cleanly with any host surface (dark-mode browser chrome, Android system bars on installed PWAs, link preview cards that paint their own background).

`transparent: false` remains a valid per-output override for a future icon variant that requires a solid backdrop (e.g., a sticker pack); the existing `transparent: true` vs `transparent: false` semantics in the parent spec are unchanged. The requirement is only that the **current set** of declared outputs in `scripts/generate-icons.config.mjs` MUST be transparent.

#### Scenario: All current PNG/ICO entries in the config declare `transparent: true`

- **WHEN** a developer reads `scripts/generate-icons.config.mjs`
- **THEN** every entry in the `outputs` array declares `transparent: true`
- **AND** no entry declares `transparent: false`

#### Scenario: Regenerated PNGs have fully-transparent outer pixels

- **WHEN** a developer runs `pnpm icons:generate`
- **THEN** every generated PNG (`icon.png`, `icon-192x192.png`,
  `icon-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`)
  has alpha `0` in its outermost pixel ring
- **AND** the brand glyph paths remain visible inside the inner square

#### Scenario: Regenerated favicon ICO has fully-transparent sub-image backdrops

- **WHEN** a developer runs `pnpm icons:generate`
- **THEN** `apps/web/src/app/favicon.ico` is a valid multi-resolution ICO
  bundling 16×16, 32×32, and 48×48 sub-images
- **AND** every sub-image's outermost pixel ring has alpha `0`

#### Scenario: Generated artifacts compress smaller than the prior opaque-backdrop versions

- **WHEN** a developer regenerates icons after this change and compares to
  the prior git history (`git show HEAD:apps/web/public/icon.png` etc.)
- **THEN** every regenerated PNG/ICO has fewer bytes than the prior
  opaque-backdrop version of the same file (transparent pixels compress
  smaller than the prior `#FDFDFD` plate)
