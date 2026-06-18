## ADDED Requirements

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

For each declared output of size `N` and margin `m` (where `0 ≤ m < 0.5`), the
script MUST rasterize the SVG into a square of `round(N * (1 - 2*m))` pixels
and composite it onto a transparent `N × N` canvas centered with equal
margins on every side. The script MUST clamp `innerSize` to a minimum of 1
pixel. The margin value MUST be configurable per output, with a default of
`0.05` for standard icons and `0.10` for `maskable-icon` outputs.

#### Scenario: A 512×512 icon at 5% margin centers a 461×461 artwork

- **WHEN** the config declares an output with `size: 512` and `margin: 0.05`
- **THEN** the script writes a 512×512 PNG
- **AND** the colored artwork occupies a 461×461 area centered in the bitmap
- **AND** the 26-pixel-wide border on every side is fully transparent

#### Scenario: A 192×192 icon at 10% margin centers a 154×154 artwork (maskable)

- **WHEN** the config declares a `maskable-icon` output with `size: 512` and `margin: 0.10`
- **THEN** the script writes a 512×512 PNG
- **AND** the colored artwork occupies a 410×410 area centered in the bitmap
- **AND** the 51-pixel-wide border on every side is fully transparent

#### Scenario: Edge pixels are transparent for any margin greater than zero

- **WHEN** the script writes any PNG output whose configured `margin` is strictly greater than `0`
- **THEN** every pixel in the outermost `round(size * margin)` rows and columns of the bitmap has an alpha value of `0`

### Requirement: The favicon output SHALL be a multi-resolution `.ico` containing 16, 32, and 48 pixel variants

The script MUST emit `apps/web/src/app/favicon.ico` as a single `.ico`
container bundling 16×16, 32×32, and 48×48 rasterizations of the SVG, all
with `margin: 0` so the artwork fills the bitmap at the smallest tab-bar
density.

#### Scenario: The favicon file is a valid multi-image ICO

- **WHEN** the script finishes and `apps/web/src/app/favicon.ico` exists
- **THEN** the file is a valid `.ico` container
- **AND** it contains exactly three sub-images at 16×16, 32×32, and 48×48

### Requirement: The icon pipeline SHALL be wired into the root pnpm scripts and the Turborepo build graph

The repository MUST expose a root-level `pnpm icons:generate` script that
runs `node scripts/generate-icons.mjs`, and `turbo.json` MUST declare a
top-level `icons` task whose `outputs` include the regenerated files under
`apps/web/public/` and `apps/web/src/app/favicon.ico`. The `apps/web#build`
Turbo task MUST declare `"dependsOn": ["^icons"]` so that icon regeneration
runs before the web build.

#### Scenario: `pnpm icons:generate` works from any cwd

- **WHEN** a developer runs `pnpm icons:generate` from the repository root
- **THEN** the script regenerates every declared output

#### Scenario: `pnpm build` regenerates icons before building the web app

- **WHEN** a developer runs `pnpm build` and the SVG or config has changed since the last icon generation
- **THEN** Turborepo runs the `icons` task before `apps/web#build`
- **AND** the Next.js build picks up the freshly generated PNG/ICO artifacts

### Requirement: The icon pipeline SHALL be unit-tested with colocated Vitest specs

A colocated Vitest test file `scripts/generate-icons.spec.mjs` MUST assert:
every declared output file exists after a generation run, every produced
PNG has the declared square dimensions, every PNG with `margin > 0` has
fully-transparent outermost border pixels, the favicon is a valid multi-size
`.ico`, and a missing/malformed config entry throws.

#### Scenario: Unit tests pass

- **WHEN** `pnpm test` runs `scripts/generate-icons.spec.mjs`
- **THEN** all assertions pass without mocking `sharp`
