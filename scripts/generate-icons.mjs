#!/usr/bin/env node
/**
 * Generate every web/PWA icon variant from `apps/web/public/icon.svg`.
 *
 * The output list, sizes, and per-output safe-area margins are read from
 * `scripts/generate-icons.config.mjs` so future icon tweaks are a one-file
 * change. Margins are applied by compositing a smaller rasterization of the
 * SVG onto a transparent canvas of the final pixel size, centering the
 * artwork with equal padding on every side.
 *
 * @see openspec/changes/add-icon-generation-script/specs/web-icon-generation/spec.md
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { outputs, sourceSvg } from './generate-icons.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/**
 * Compute the inner rasterization size for a given output dimension and
 * fractional margin. The result is always >= 1 pixel.
 *
 * @param {number} size   Output dimension in pixels.
 * @param {number} margin Safe-area margin as a fraction of `size` (0..0.5).
 * @returns {number}      Inner square side in pixels.
 */
export function innerSize(size, margin) {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`Invalid icon size: ${size}`);
  }
  if (!Number.isFinite(margin) || margin < 0 || margin >= 0.5) {
    throw new Error(`Invalid icon margin for size ${size}: ${margin} (must be in [0, 0.5))`);
  }
  return Math.max(1, Math.round(size * (1 - 2 * margin)));
}

/**
 * Validate a single config entry. Throws with a descriptive message that
 * names the entry on failure.
 *
 * @param {unknown} entry
 * @param {number} index
 * @returns {asserts entry is { file: string, size?: number, sizes?: number[], margin: number, transparent?: boolean }}
 */
function assertOutputEntry(entry, index) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`outputs[${index}] is not an object`);
  }
  const e = /** @type {Record<string, unknown>} */ (entry);
  if (typeof e.file !== 'string' || e.file.length === 0) {
    throw new Error(`outputs[${index}].file must be a non-empty string`);
  }
  if (typeof e.margin !== 'number') {
    throw new Error(`outputs[${index}].margin must be a number`);
  }
  const hasSize = typeof e.size === 'number';
  const hasSizes = Array.isArray(e.sizes) && e.sizes.every((s) => typeof s === 'number');
  if (!hasSize && !hasSizes) {
    throw new Error(
      `outputs[${index}] must declare either a numeric "size" or a numeric[] "sizes"`,
    );
  }
  if (e.transparent !== undefined && typeof e.transparent !== 'boolean') {
    throw new Error(`outputs[${index}].transparent must be a boolean when present`);
  }
}

/**
 * Strip any full-bleed background `<rect>` from the SVG buffer. The `icon.svg`
 * ships with a `<rect width="5016" height="5016" fill="#fdfdfd">` that fills
 * the entire viewBox; when rasterized, this off-white backdrop bleeds into
 * the entire inner square and obscures the safe-area margin. Dropping that
 * rect lets the margin become visibly transparent in the output bitmap.
 *
 * The detection is intentionally narrow: only `<rect>` elements whose width
 * AND height match the SVG's own `viewBox` dimensions are removed, so any
 * smaller rects (e.g. decorative panels inside the logo) are preserved.
 *
 * @param {Buffer} svg Raw SVG bytes.
 * @returns {Buffer}   SVG bytes with the full-bleed background rect removed.
 */
export function stripSvgBackground(svg) {
  const text = svg.toString('utf8');
  const viewBoxMatch = text.match(/viewBox\s*=\s*"([^"]+)"/);
  if (!viewBoxMatch) return svg;
  const parts = viewBoxMatch[1].trim().split(/\s+/);
  if (parts.length !== 4) return svg;
  const [, , vbW, vbH] = parts;

  // Match a <rect> element (self-closing or with a closing tag) whose
  // width AND height match the SVG's viewBox dimensions. We strip both the
  // opening tag and the matching </rect> closing tag so the SVG stays
  // well-formed.
  const openRe = new RegExp(
    String.raw`<rect\b[^>]*?width\s*=\s*"\s*${vbW}\s*"[^>]*?height\s*=\s*"\s*${vbH}\s*"[^>]*?(/?)>`,
    'i',
  );
  const openMatch = openRe.exec(text);
  if (!openMatch) return svg;

  let stripped = text.replace(openRe, '');
  if (openMatch[1] !== '/') {
    // Remove the first </rect> that follows the opening tag.
    stripped = stripped.replace(/<\/rect\s*>/i, '');
  }
  return Buffer.from(stripped, 'utf8');
}

/**
 * Parse an SVG color string (`#rgb`, `#rrggbb`, `#rrggbbaa`, named color,
 * or `none`) into an `{ r, g, b, alpha }` object. Returns `null` for
 * unparseable values. Alpha defaults to `1` (fully opaque).
 *
 * @param {string} value
 * @returns {{ r: number, g: number, b: number, alpha: number } | null}
 */
export function parseSvgColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v === '' || v === 'none' || v === 'transparent') {
    return { r: 0, g: 0, b: 0, alpha: 0 };
  }

  // Hex forms.
  const hex = v.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      const r = parseInt(digits[0] + digits[0], 16);
      const g = parseInt(digits[1] + digits[1], 16);
      const b = parseInt(digits[2] + digits[2], 16);
      const a = digits.length === 4 ? parseInt(digits[3] + digits[3], 16) / 255 : 1;
      return { r, g, b, alpha: a };
    }
    if (digits.length === 6 || digits.length === 8) {
      const r = parseInt(digits.slice(0, 2), 16);
      const g = parseInt(digits.slice(2, 4), 16);
      const b = parseInt(digits.slice(4, 6), 16);
      const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, alpha: a };
    }
  }

  // rgb()/rgba() functions.
  const rgb = v.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*(?:[,/]\s*(\d+(?:\.\d+)?)\s*%?)?\)$/i,
  );
  if (rgb) {
    return {
      r: Math.round(Number(rgb[1])),
      g: Math.round(Number(rgb[2])),
      b: Math.round(Number(rgb[3])),
      alpha:
        rgb[4] !== undefined
          ? Number(rgb[4]) / (rgb[4].includes('.') || Number(rgb[4]) > 1 ? 1 : 255)
          : 1,
    };
  }

  // Minimal CSS named-color lookup covering the values we expect to see in
  // a logo SVG (white/black plus the family of off-whites the design tool
  // emits). Extend as needed.
  const named = {
    white: { r: 255, g: 255, b: 255, alpha: 1 },
    black: { r: 0, g: 0, b: 0, alpha: 1 },
    red: { r: 255, g: 0, b: 0, alpha: 1 },
    green: { r: 0, g: 128, b: 0, alpha: 1 },
    blue: { r: 0, g: 0, b: 255, alpha: 1 },
  };
  return named[v.toLowerCase()] ?? null;
}

/**
 * Detect the fill color of the full-bleed background `<rect>` in an SVG.
 * Returns an `{ r, g, b, alpha }` object suitable for `sharp`'s `background`
 * option, or `null` if the SVG has no recognizable full-bleed rect (in
 * which case callers should fall back to transparent).
 *
 * @param {Buffer} svg Raw SVG bytes.
 * @returns {{ r: number, g: number, b: number, alpha: number } | null}
 */
export function detectSvgBackground(svg) {
  const text = svg.toString('utf8');
  const viewBoxMatch = text.match(/viewBox\s*=\s*"([^"]+)"/);
  if (!viewBoxMatch) return null;
  const parts = viewBoxMatch[1].trim().split(/\s+/);
  if (parts.length !== 4) return null;
  const [, , vbW, vbH] = parts;

  // Find the first <rect> with viewBox dimensions that has a fill attribute.
  // The SVG may have multiple rects (e.g., in clipPath defs), so we scan sequentially
  // and pick the first one with a fill (ignoring clipPath rects that lack fills).
  let searchIdx = 0;
  while (searchIdx < text.length) {
    const rectStart = text.indexOf('<rect', searchIdx);
    if (rectStart === -1) return null;

    const tagEnd = text.indexOf('>', rectStart);
    if (tagEnd === -1) return null;

    const tagContent = text.slice(rectStart, tagEnd + 1);

    // Check if this rect matches our viewBox dimensions
    if (tagContent.includes(`width="${vbW}"`) && tagContent.includes(`height="${vbH}"`)) {
      // Extract fill value
      const fillMatch = tagContent.match(/fill="([^"]+)"/);
      const styleFillMatch = tagContent.match(/fill:\s*([^;"]+)/);
      const raw = fillMatch ? fillMatch[1] : styleFillMatch ? styleFillMatch[1].trim() : null;
      if (raw) {
        return parseSvgColor(raw);
      }
    }

    searchIdx = rectStart + 5;
  }
  return null;
}

/**
 * Rasterize the SVG to a single square PNG buffer of the requested pixel
 * size, with the given fractional safe-area margin applied on every side.
 *
 * @param {Buffer} svg    Raw SVG bytes.
 * @param {number} size   Output dimension in pixels.
 * @param {number} margin Fractional margin (0..0.5).
 * @param {boolean} [transparent=false] When true, strip the SVG's own
 *   full-bleed background rect so the configured margin is visibly
 *   transparent in the output bitmap. When false, the canvas is filled
 *   with the SVG's detected background color (or transparent if no
 *   background rect is found) so the margin band is not see-through.
 * @returns {Promise<Buffer>} PNG-encoded buffer.
 */
export async function renderPngWithMargin(svg, size, margin, transparent = false) {
  const inner = innerSize(size, margin);
  const source = transparent ? stripSvgBackground(svg) : svg;

  const innerBuf = await sharp(source, { density: 384 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  if (margin === 0) {
    return innerBuf;
  }

  const detectedBg = transparent ? null : detectSvgBackground(svg);
  const canvasBg = detectedBg ?? { r: 0, g: 0, b: 0, alpha: 0 };
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: canvasBg,
    },
  })
    .composite([{ input: innerBuf, left: offset, top: offset }])
    .png()
    .toBuffer();
}

/**
 * Produce a multi-resolution `.ico` buffer from a list of PNG-encoded
 * sub-images. Each entry is embedded with its own ICONDIRENTRY header
 * pointing at the PNG payload (BMP-encoded ICO entries are intentionally
 * not produced — modern browsers, OS shells, and PWA hosts all accept
 * PNG-in-ICO containers).
 *
 * @param {Buffer[]} pngBuffers PNG-encoded sub-images, in order.
 * @returns {Buffer}            ICO-encoded buffer.
 */
export function buildIco(pngBuffers) {
  if (pngBuffers.length === 0) {
    throw new Error('buildIco requires at least one PNG buffer');
  }

  const headerSize = 6 + 16 * pngBuffers.length;
  const entries = [];
  const payloads = [];
  let offset = headerSize;

  for (const buf of pngBuffers) {
    const dim = pngBufferDimension(buf);
    entries.push({
      dim,
      byteCount: buf.length,
      offset,
    });
    offset += buf.length;
    payloads.push(buf);
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // image count

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const dim = e.dim;
    const base = 6 + 16 * i;
    header.writeUInt8(dim >= 256 ? 0 : dim, base + 0); // width (0 = 256)
    header.writeUInt8(dim >= 256 ? 0 : dim, base + 1); // height (0 = 256)
    header.writeUInt8(0, base + 2); // color palette count
    header.writeUInt8(0, base + 3); // reserved
    header.writeUInt16LE(1, base + 4); // color planes
    header.writeUInt16LE(32, base + 6); // bits per pixel
    header.writeUInt32LE(e.byteCount, base + 8); // image byte count
    header.writeUInt32LE(e.offset, base + 12); // image data offset
  }

  return Buffer.concat([header, ...payloads]);
}

/**
 * Read the pixel dimension of a PNG buffer from its IHDR chunk. Throws if
 * the buffer is not a recognizable PNG.
 *
 * @param {Buffer} buf
 * @returns {number} Square pixel dimension.
 */
function pngBufferDimension(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error('Not a PNG buffer');
  }
  // IHDR chunk: bytes 16-23 hold width(4) and height(4) big-endian.
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== height) {
    throw new Error(`PNG is not square: ${width}x${height}`);
  }
  return width;
}

async function main() {
  const sourcePath = path.resolve(repoRoot, sourceSvg);
  const { readFile } = await import('node:fs/promises');
  const svg = await readFile(sourcePath);

  const written = [];
  for (let i = 0; i < outputs.length; i++) {
    const entry = outputs[i];
    assertOutputEntry(entry, i);

    const outPath = path.resolve(repoRoot, entry.file);
    await mkdir(path.dirname(outPath), { recursive: true });

    const transparent = entry.transparent === true;
    const buffer = Array.isArray(entry.sizes)
      ? buildIco(
          await Promise.all(
            entry.sizes.map((s) => renderPngWithMargin(svg, s, entry.margin, transparent)),
          ),
        )
      : await renderPngWithMargin(svg, entry.size, entry.margin, transparent);

    await writeFile(outPath, buffer);
    written.push(entry.file);
  }

  console.log(`Generated ${written.length} icon artifact(s):`);
  for (const f of written) {
    console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
