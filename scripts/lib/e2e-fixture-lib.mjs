import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');
export const SAMPLES_DIR = path.join(REPO_ROOT, '.samples');
export const FIXTURE_PATH = path.join(SAMPLES_DIR, 'e2e-fixture.json');
export const STATE_PATH = path.join(SAMPLES_DIR, 'e2e-fixture.state.json');

/** @type {Record<string, string>} */
export const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * @returns {Promise<import('../types/e2e-fixture.types.mjs').E2eFixture>}
 */
export async function loadFixture() {
  const raw = await readFile(FIXTURE_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * @returns {Promise<import('../types/e2e-fixture.types.mjs').E2eFixtureState | null>}
 */
export async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * @param {string} filePath
 */
export function mimeForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(`Unsupported media extension for E2E fixture: ${ext} (${filePath})`);
  }
  return mime;
}

/**
 * Mulberry32 PRNG for deterministic "random" picks when randomSeed is set.
 * @param {number} seed
 */
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {() => number} rng
 * @param {T[]} items
 * @returns {T}
 */
export function pickRandom(rng, items) {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty list');
  }
  const index = Math.floor(rng() * items.length);
  return items[index];
}
