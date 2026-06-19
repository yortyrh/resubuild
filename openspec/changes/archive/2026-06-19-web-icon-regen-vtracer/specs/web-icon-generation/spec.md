## ADDED Requirements

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
