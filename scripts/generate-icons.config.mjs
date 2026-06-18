/**
 * Declarative config for `scripts/generate-icons.mjs`.
 *
 * Each entry describes one output artifact the generator must produce from
 * `apps/web/public/icon.svg`. `margin` is a fraction of the output's pixel
 * dimension applied as a transparent safe area on every side (e.g. `0.05` =
 * 5% on top, right, bottom, left).
 *
 * `favicon.ico` is special: it is emitted as a multi-resolution `.ico`
 * container bundling the `sizes` sub-images listed in its entry, all with the
 * configured `margin` (typically `0` because browsers pad favicons themselves).
 *
 * @see openspec/changes/add-icon-generation-script/specs/web-icon-generation/spec.md
 */

/**
 * @typedef {Object} IconOutput
 * @property {string} file         Path (relative to repo root) the script writes.
 * @property {number} size         Square output dimension in pixels.
 * @property {number} margin       Safe-area margin as a fraction of `size` (0..0.5).
 * @property {boolean} [transparent=true] When true, the SVG's full-bleed
 *   background `<rect>` is stripped before rasterization, so the configured
 *   `margin` band is rendered as fully transparent pixels in the final
 *   bitmap. When false, the background `<rect>` is kept and the outer
 *   margin band is filled with the SVG's detected background fill color so
 *   the bitmap has a solid backdrop. Set to `false` for artwork that
 *   should never show see-through edges.
 */

/**
 * @typedef {Object} FaviconOutput
 * @property {string} file         Path (relative to repo root) the script writes.
 * @property {number[]} sizes      Square sizes (px) bundled into the .ico.
 * @property {number} margin       Safe-area margin (typically 0).
 * @property {boolean} [transparent=true] When true, strip the SVG's
 *   full-bleed background `<rect>`. When false, the background fill color
 *   extends into the outer margin band so the .ico has a solid backdrop.
 */

/** @type {Array<IconOutput | FaviconOutput>} */
export const outputs = [
  { file: 'apps/web/public/icon.png', size: 512, margin: 0.1, transparent: true },
  { file: 'apps/web/public/icon-192x192.png', size: 192, margin: 0.1, transparent: true },
  { file: 'apps/web/public/icon-512x512.png', size: 512, margin: 0.1, transparent: true },
  {
    file: 'apps/web/public/maskable-icon-512x512.png',
    size: 512,
    margin: 0.1,
    transparent: true,
  },
  { file: 'apps/web/public/apple-touch-icon.png', size: 180, margin: 0.1, transparent: true },
  {
    file: 'apps/web/src/app/favicon.ico',
    sizes: [16, 32, 48],
    margin: 0.1,
    transparent: true,
  },
];

export const sourceSvg = 'apps/web/public/icon.svg';
