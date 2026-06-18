## MODIFIED Requirements

### Requirement: The root layout SHALL emit comprehensive metadata for public pages

`apps/web/src/app/layout.tsx` MUST export `metadata` with `metadataBase`, title template, description, keywords, Open Graph, Twitter card, robots directives for indexing, icons, and viewport/theme-color configuration derived from `siteConfig`. The `metadata.icons` declaration MUST point at margin-padded raster artifacts (`icon.png`, `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`) and MUST NOT reference `icon.svg`. The default favicon MUST resolve to `apps/web/src/app/favicon.ico`, a multi-resolution (16/32/48) `.ico` produced by `scripts/generate-icons.mjs`.

#### Scenario: Root metadata includes social preview fields

- **WHEN** Next.js resolves metadata for a marketing page
- **THEN** Open Graph and Twitter entries SHALL include title, description, and image from `siteConfig`

#### Scenario: `metadata.icons` references margin-padded raster artifacts

- **WHEN** Next.js resolves `metadata.icons` for any page
- **THEN** the `icon` entries SHALL reference `icon.png`, `icon-192x192.png`, and `icon-512x512.png`
- **AND** the `apple` entry SHALL reference `apple-touch-icon.png`
- **AND** `metadata.icons` SHALL NOT reference `icon.svg`
