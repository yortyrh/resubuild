# Web icon generation

## Purpose

Define how `apps/web/public/icon.svg` is rasterized into every web and PWA icon variant the Resumind web app exposes (browser favicon, OS home screen, maskable PWA launcher), with a per-output safe-area margin and an optional opaque backdrop, so future artwork tweaks do not require manually re-exporting icons in a design tool.

## Requirements

### Requirement: The repository SHALL provide a single Node script that generates every web/PWA icon variant from `apps/web/public/icon.svg`

A Node 20+ ESM script at `scripts/generate-icons.mjs` MUST read
`apps/web/public/icon.svg` and produce, in one invocation, every PNG and ICO
artifact the web app exposes in `metadata.icons`, the PWA `manifest.ts`, and
Next.js's `app/favicon.ico` convention. The script MUST read its output
list, sizes, and margins from a separate config module
(`scripts/generate-icons.config.mjs`) and MUST NOT hard-code output paths,
sizes, or margins inline.

#### Scenario: A fresh checkout with all icons deleted regenerates the full set

- **WHEN** a developer runs `pnpm icons:generate` with no PNG/ICO files in `apps/web/public/` or `apps/web/src/app/`
- **THEN** the script writes every declared output file
- **AND** every written file is a valid PNG or multi-resolution ICO at the declared square pixel dimensions

#### Scenario: Re-running the script is idempotent for unchanged inputs

- **WHEN** a developer runs `pnpm icons:generate` twice without changing `icon.svg` or the config
- **THEN** every declared output file exists on disk after the second run
- **AND** the second run does not throw

#### Scenario: A missing entry in the config throws a descriptive error

- **WHEN** the config `outputs` array omits an entry the script expects (or contains a malformed entry missing `file`/`size`/`margin`)
- **THEN** the script throws an error that names the missing/malformed output
- **AND** no partial output file is left behind for that entry

### Requirement: Each PNG output SHALL embed the SVG with a configurable safe-area margin expressed as a fraction of the output dimension

Each declared output of size `N` and margin `m` (where `0 ≤ m < 0.5`) MUST
rasterize the SVG into a square of `round(N * (1 - 2*m))` pixels and
composite it onto a transparent `N × N` canvas centered with equal margins
on every side. The script MUST clamp `innerSize` to a minimum of 1
pixel. The margin value MUST be configurable per output, with a default of
`0.05` for standard icons and `0.10` for `maskable-icon` outputs.

When an output declares `transparent: true`, the script MUST strip the
SVG's full-bleed background `<rect>` (any `<rect>` whose `width` and
`height` equal the SVG's `viewBox` dimensions) before rasterizing so the
glyph alone survives into the inner square and the configured margin is
visibly transparent in the final bitmap. When an output declares
`transparent: false`, the script MUST keep the SVG's background rect and
MUST fill the outer margin band (the area outside the inner rasterized
square) with the SVG's detected background fill color so the bitmap has a
solid backdrop with no transparent pixels. The script MUST detect the
background color by parsing the `fill` attribute (or `style="fill:..."`
declaration) on the full-bleed `<rect>`; if no full-bleed rect exists or
its fill cannot be parsed, the margin MUST fall back to transparent.

#### Scenario: A 512×512 icon at 5% margin centers a 461×461 artwork (transparent)

- **WHEN** the config declares `size: 512`, `margin: 0.05`, and `transparent: true`
- **THEN** the script writes a 512×512 PNG
- **AND** the colored artwork occupies a 461×461 area centered in the bitmap
- **AND** the 26-pixel-wide border on every side has an alpha value of `0`

#### Scenario: A 512×512 icon at 10% margin centers a 410×410 artwork on a solid backdrop (non-transparent)

- **WHEN** the config declares `size: 512`, `margin: 0.10`, and `transparent: false` and the source SVG contains a full-bleed `<rect fill="#fdfdfd">`
- **THEN** the script writes a 512×512 PNG
- **AND** the colored artwork occupies a 410×410 area centered in the bitmap
- **AND** every pixel in the outer 51-pixel border on every side has the fill color `#fdfdfd` (alpha = 1)

#### Scenario: A `transparent: true` output strips the SVG's full-bleed background

- **WHEN** the config declares `transparent: true` and the source SVG contains a full-bleed `<rect>` matching the viewBox
- **THEN** the script writes a PNG whose glyph-only inner region contains the logo paths but no background fill
- **AND** the outer margin band remains fully transparent

### Requirement: The favicon output SHALL be a multi-resolution `.ico` containing 16, 32, and 48 pixel variants

The script MUST emit `apps/web/src/app/favicon.ico` as a single `.ico`
container bundling 16×16, 32×32, and 48×48 rasterizations of the SVG. The
favicon MUST use `margin: 0` so the artwork fills the bitmap at the
smallest tab-bar density.

#### Scenario: The favicon file is a valid multi-image ICO

- **WHEN** the script finishes and `apps/web/src/app/favicon.ico` exists
- **THEN** the file is a valid `.ico` container
- **AND** it contains exactly three sub-images at 16×16, 32×32, and 48×48

### Requirement: The icon pipeline SHALL be wired into the root pnpm scripts

The repository MUST expose a root-level `pnpm icons:generate` script that
runs `node scripts/generate-icons.mjs`, and the root `pnpm build` script
MUST invoke `pnpm icons:generate` before delegating to `turbo build` so the
icon pipeline runs to completion before Turborepo orchestrates the
workspace builds.

#### Scenario: `pnpm icons:generate` works from any cwd

- **WHEN** a developer runs `pnpm icons:generate` from the repository root
- **THEN** the script regenerates every declared output

#### Scenario: `pnpm build` regenerates icons before building the web app

- **WHEN** a developer runs `pnpm build` after editing `apps/web/public/icon.svg` or `scripts/generate-icons.config.mjs`
- **THEN** the root `build` script invokes `pnpm icons:generate` first
- **AND** Turborepo then orchestrates the workspace builds with the regenerated PNG/ICO artifacts already in place

### Requirement: The icon pipeline SHALL be unit-tested with colocated Vitest specs

A colocated Vitest test file `scripts/generate-icons.spec.mjs` MUST assert:
every declared output file exists after a generation run, every produced
PNG has the declared square dimensions, every PNG with `margin > 0` has
fully-transparent outermost border pixels, the favicon is a valid multi-size
`.ico`, and a missing/malformed config entry throws.

#### Scenario: Unit tests pass

- **WHEN** `pnpm test` runs `scripts/generate-icons.spec.mjs`
- **THEN** all assertions pass without mocking `sharp`

### Requirement: The source SVG SHALL carry a VTracer-style vectorized artwork with a full-bleed rounded-square backdrop

`apps/web/public/icon.svg` MUST be a vectorized raster-to-vector trace
(such as the VTracer pipeline) of the Resumind brand mark, with a
single full-bleed `<rect>` whose `width` and `height` equal the SVG's
`viewBox` dimensions and whose `rx`/`ry` produce a rounded square
backdrop. The `<rect>` MUST carry an explicit `fill` (or
`style="fill:..."`) attribute so the icon-generation pipeline can
detect the background color and paint the outer margin band of
non-transparent outputs. The artwork group inside the backdrop MUST
contain the brand glyph paths only and MUST NOT include any
additional full-bleed background fills.

#### Scenario: A regenerated SVG parses with a single full-bleed rounded-square backdrop

- **WHEN** a developer runs `pnpm icons:generate` after replacing `apps/web/public/icon.svg`
- **THEN** the pipeline parses the SVG and finds exactly one `<rect>` whose `width` and `height` match the `viewBox`
- **AND** the `<rect>` has a non-zero `rx`/`ry` and an explicit `fill` color
- **AND** every other rendered path sits inside the backdrop's inner square (transform-translated, never spilling beyond the rounded frame)
