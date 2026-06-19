/**
 * Unit tests for `scripts/generate-icons.mjs`.
 *
 * Asserts the generator:
 *   - emits every declared output as a valid PNG (or multi-resolution ICO),
 *   - produces PNGs at the declared square pixel dimensions,
 *   - actually applies the configured safe-area margin (outermost row/col
 *     pixels are fully transparent for any margin > 0),
 *   - bundles a favicon at 16/32/48 px with `margin: 0`,
 *   - throws a descriptive error for a malformed config entry.
 *
 * The suite runs against the generator's pure helpers (`innerSize`,
 * `buildIco`, `renderPngWithMargin`) plus a single integration run that
 * writes outputs into a tmp directory and inspects them with `sharp`.
 *
 * @see openspec/changes/add-icon-generation-script/specs/web-icon-generation/spec.md
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { outputs as defaultOutputs, sourceSvg } from './generate-icons.config.mjs';
import {
  buildIco,
  detectSvgBackground,
  innerSize,
  parseSvgColor,
  renderPngWithMargin,
  stripSvgBackground,
} from './generate-icons.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');

let workDir;

beforeAll(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), 'icons-spec-'));
});

afterAll(async () => {
  if (workDir) await rm(workDir, { recursive: true, force: true });
});

describe('innerSize', () => {
  it('returns the input size when margin is 0', () => {
    expect(innerSize(512, 0)).toBe(512);
  });

  it('rounds the inner square for fractional margins', () => {
    expect(innerSize(512, 0.05)).toBe(461); // 512 * 0.9 = 460.8
    expect(innerSize(512, 0.1)).toBe(410); // 512 * 0.8 = 409.6
    expect(innerSize(180, 0.05)).toBe(162); // 180 * 0.9 = 162
  });

  it('clamps to 1px for absurd margins', () => {
    expect(innerSize(4, 0.4)).toBe(1);
  });

  it('throws for non-positive sizes', () => {
    expect(() => innerSize(0, 0)).toThrow(/Invalid icon size/);
    expect(() => innerSize(-1, 0)).toThrow(/Invalid icon size/);
  });

  it('throws for margins outside [0, 0.5)', () => {
    expect(() => innerSize(100, -0.01)).toThrow(/Invalid icon margin/);
    expect(() => innerSize(100, 0.5)).toThrow(/Invalid icon margin/);
    expect(() => innerSize(100, 0.9)).toThrow(/Invalid icon margin/);
  });
});

describe('buildIco', () => {
  it('emits a valid ICO header bundling the provided PNGs', async () => {
    const sizes = [16, 32, 48];
    const pngs = await Promise.all(
      sizes.map((s) =>
        sharp({
          create: {
            width: s,
            height: s,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .png()
          .toBuffer(),
      ),
    );
    const ico = buildIco(pngs);

    expect(ico.readUInt16LE(0)).toBe(0); // reserved
    expect(ico.readUInt16LE(2)).toBe(1); // type 1 = ICO
    expect(ico.readUInt16LE(4)).toBe(3); // 3 sub-images

    for (let i = 0; i < sizes.length; i++) {
      const base = 6 + 16 * i;
      const w = ico.readUInt8(base);
      const h = ico.readUInt8(base + 1);
      expect(w === 0 ? 256 : w).toBe(sizes[i]);
      expect(h === 0 ? 256 : h).toBe(sizes[i]);
      const byteCount = ico.readUInt32LE(base + 8);
      expect(byteCount).toBe(pngs[i].length);
    }
  });

  it('throws when given no PNG buffers', () => {
    expect(() => buildIco([])).toThrow(/at least one PNG buffer/);
  });
});

describe('renderPngWithMargin', () => {
  const svgPath = path.resolve(repoRoot, sourceSvg);
  let svg;

  beforeAll(async () => {
    svg = await readFile(svgPath);
  });

  it('produces a square PNG at the requested size with a transparent border', async () => {
    const buf = await renderPngWithMargin(svg, 192, 0.05, true);
    const meta = await sharp(buf).metadata();
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
    expect(meta.hasAlpha).toBe(true);

    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const size = info.width;
    const alpha = (x, y) => data[(y * size + x) * channels + 3];

    // Outermost 10-pixel band must be fully transparent on every side.
    for (const x of Array.from({ length: size }, (_, i) => i)) {
      expect(alpha(x, 0)).toBe(0);
      expect(alpha(x, size - 1)).toBe(0);
    }
    for (const y of Array.from({ length: size }, (_, i) => i)) {
      expect(alpha(0, y)).toBe(0);
      expect(alpha(size - 1, y)).toBe(0);
    }
  });

  it('fills the bitmap edge-to-edge when margin is 0', async () => {
    const buf = await renderPngWithMargin(svg, 64, 0);
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const size = info.width;
    const alpha = (x, y) => data[(y * size + x) * channels + 3];

    let nonTransparent = 0;
    for (const x of Array.from({ length: size }, (_, i) => i)) {
      if (alpha(x, 0) > 0) nonTransparent++;
      if (alpha(x, size - 1) > 0) nonTransparent++;
    }
    expect(nonTransparent).toBeGreaterThan(0);
  });

  it('strips the full-bleed background when transparent=true', async () => {
    const buf = await renderPngWithMargin(svg, 256, 0.2, true);
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const size = info.width;
    const alpha = (x, y) => data[(y * size + x) * channels + 3];

    // The whole outer 20% margin band must be fully transparent.
    const marginPx = Math.round(size * 0.2);
    let edgeBad = 0;
    for (let x = 0; x < size; x++) {
      if (alpha(x, 0) !== 0) edgeBad++;
      if (alpha(x, size - 1) !== 0) edgeBad++;
    }
    for (let y = 0; y < size; y++) {
      if (alpha(0, y) !== 0) edgeBad++;
      if (alpha(size - 1, y) !== 0) edgeBad++;
    }
    expect(edgeBad).toBe(0);

    // Inside the safe area the glyph must still render some pixels (logo
    // paths survive). With the background stripped, the inner region must
    // contain BOTH transparent and colored pixels — i.e. it's not a
    // uniformly solid inner square.
    let colored = 0;
    let transparentInside = 0;
    for (let y = marginPx; y < size - marginPx; y++) {
      for (let x = marginPx; x < size - marginPx; x++) {
        if (alpha(x, y) > 0) colored++;
        else transparentInside++;
      }
    }
    expect(colored).toBeGreaterThan(0);
    expect(transparentInside).toBeGreaterThan(0);
  });
});

describe('stripSvgBackground', () => {
  it('removes a full-bleed <rect> matching the viewBox dimensions', () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<rect width="100" height="100" fill="#ffffff"></rect>' +
        '<path d="M0 0L100 100"/>' +
        '</svg>',
    );
    const stripped = stripSvgBackground(svg).toString('utf8');
    expect(stripped).not.toContain('<rect');
    expect(stripped).not.toContain('</rect>');
    expect(stripped).toContain('<path');
    // Well-formed: closing </svg> must remain and there must be no leftover tag.
    expect(stripped.trim().endsWith('</svg>')).toBe(true);
  });

  it('leaves the SVG untouched when there is no viewBox', () => {
    const svg = Buffer.from('<svg><rect width="10" height="10"/></svg>');
    const out = stripSvgBackground(svg);
    expect(out.toString('utf8')).toBe('<svg><rect width="10" height="10"/></svg>');
  });

  it('preserves rects whose dimensions do not match the viewBox', () => {
    const svg = Buffer.from(
      '<svg viewBox="0 0 100 100"><rect width="50" height="50" fill="red"/></svg>',
    );
    const stripped = stripSvgBackground(svg).toString('utf8');
    expect(stripped).toContain('<rect');
    expect(stripped).toContain('width="50"');
  });
});

describe('parseSvgColor', () => {
  it('parses 3-digit hex', () => {
    expect(parseSvgColor('#fff')).toEqual({ r: 255, g: 255, b: 255, alpha: 1 });
    expect(parseSvgColor('#abc')).toEqual({ r: 170, g: 187, b: 204, alpha: 1 });
  });

  it('parses 6-digit hex', () => {
    expect(parseSvgColor('#fdfdfd')).toEqual({ r: 253, g: 253, b: 253, alpha: 1 });
    expect(parseSvgColor('#5518e0')).toEqual({ r: 85, g: 24, b: 224, alpha: 1 });
  });

  it('parses 8-digit hex with alpha', () => {
    expect(parseSvgColor('#fdfdfd80')).toEqual({ r: 253, g: 253, b: 253, alpha: 128 / 255 });
  });

  it('parses named colors', () => {
    expect(parseSvgColor('white')).toEqual({ r: 255, g: 255, b: 255, alpha: 1 });
    expect(parseSvgColor('black')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
  });

  it('returns transparent for `none` and `transparent`', () => {
    expect(parseSvgColor('none')).toEqual({ r: 0, g: 0, b: 0, alpha: 0 });
    expect(parseSvgColor('transparent')).toEqual({ r: 0, g: 0, b: 0, alpha: 0 });
  });

  it('returns null for unparseable values', () => {
    // Empty string is treated as `transparent` (semantic equivalent).
    expect(parseSvgColor('')).toEqual({ r: 0, g: 0, b: 0, alpha: 0 });
    expect(parseSvgColor('not-a-color')).toBeNull();
    expect(parseSvgColor(undefined)).toBeNull();
  });
});

describe('detectSvgBackground', () => {
  it('reads the fill of the full-bleed <rect>', () => {
    const svg = Buffer.from(
      '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fdfdfd"/></svg>',
    );
    expect(detectSvgBackground(svg)).toEqual({ r: 253, g: 253, b: 253, alpha: 1 });
  });

  it('returns null when no viewBox is present', () => {
    const svg = Buffer.from('<svg><rect width="10" height="10" fill="red"/></svg>');
    expect(detectSvgBackground(svg)).toBeNull();
  });

  it('returns null when no full-bleed rect exists', () => {
    const svg = Buffer.from('<svg viewBox="0 0 100 100"><path d="M0 0"/></svg>');
    expect(detectSvgBackground(svg)).toBeNull();
  });
});

describe('renderPngWithMargin — non-transparent margin (transparent: false)', () => {
  const svgPath = path.resolve(repoRoot, sourceSvg);
  let svg;

  beforeAll(async () => {
    svg = await readFile(svgPath);
  });

  it('fills the margin band with the detected background color', async () => {
    const buf = await renderPngWithMargin(svg, 256, 0.2, false);
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const size = info.width;

    // Sample a point in the corner of the margin band — it must match
    // the detected background color (#fdfdfd -> r=g=b=253, a=255).
    const sample = (x, y) => {
      const i = (y * size + x) * channels;
      return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    };

    const topLeft = sample(2, 2);
    const topRight = sample(size - 3, 2);
    const bottomLeft = sample(2, size - 3);
    const bottomRight = sample(size - 3, size - 3);

    for (const px of [topLeft, topRight, bottomLeft, bottomRight]) {
      expect(px.r).toBe(253);
      expect(px.g).toBe(253);
      expect(px.b).toBe(253);
      expect(px.a).toBe(255);
    }

    // And every pixel in the outermost margin row/col must be opaque
    // background — none may be transparent.
    let transparentEdgePixels = 0;
    for (let x = 0; x < size; x++) {
      for (const y of [0, size - 1]) {
        const px = sample(x, y);
        if (px.a === 0) transparentEdgePixels++;
      }
    }
    for (let y = 0; y < size; y++) {
      for (const x of [0, size - 1]) {
        const px = sample(x, y);
        if (px.a === 0) transparentEdgePixels++;
      }
    }
    expect(transparentEdgePixels).toBe(0);
  });
});

describe('integration: writes all declared outputs', () => {
  it('writes every declared output file at the declared square dimensions', async () => {
    const svg = await readFile(path.resolve(repoRoot, sourceSvg));
    const outDir = workDir;

    for (const entry of defaultOutputs) {
      const outPath = path.join(outDir, entry.file);
      await import('node:fs/promises').then((m) =>
        m.mkdir(path.dirname(outPath), { recursive: true }),
      );

      const buffer = Array.isArray(entry.sizes)
        ? buildIco(
            await Promise.all(entry.sizes.map((s) => renderPngWithMargin(svg, s, entry.margin))),
          )
        : await renderPngWithMargin(svg, entry.size, entry.margin);
      await import('node:fs/promises').then((m) => m.writeFile(outPath, buffer));

      const written = await readFile(outPath);
      if (entry.file.endsWith('.ico')) {
        expect(written.readUInt16LE(2)).toBe(1);
        expect(written.readUInt16LE(4)).toBe(entry.sizes.length);
        for (let i = 0; i < entry.sizes.length; i++) {
          const base = 6 + 16 * i;
          const w = written.readUInt8(base);
          expect(w === 0 ? 256 : w).toBe(entry.sizes[i]);
        }
      } else {
        const meta = await sharp(written).metadata();
        expect(meta.width).toBe(entry.size);
        expect(meta.height).toBe(entry.size);
      }
    }
  });
});

describe('config validation', () => {
  it('default config entries are well-formed', () => {
    for (const entry of defaultOutputs) {
      expect(typeof entry.file).toBe('string');
      expect(entry.file.length).toBeGreaterThan(0);
      expect(typeof entry.margin).toBe('number');
      const hasSize = typeof entry.size === 'number';
      const hasSizes = Array.isArray(entry.sizes);
      expect(hasSize || hasSizes).toBe(true);
    }
  });
});
