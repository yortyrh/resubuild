/**
 * executor.mjs
 *
 * Thin Puppeteer wrapper that gives screenplays a stable API for navigation,
 * interaction, and frame-capture. Each screenplay gets its own Executor instance
 * with a fresh browser context.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRAME_DELAY_MS = Math.floor(1000 / 30); // 30 fps

/** @type {ExecutorOptions} */
const DEFAULT_OPTIONS = {
  baseUrl: 'http://localhost:3000',
  outDir: '/tmp/recordings',
  fps: 30,
  width: 1280,
  height: 720,
};

/**
 * Executor drives a Puppeteer page through a screenplay and captures frames.
 * Screenplays call exec.goto(), exec.click(), exec.type(), etc.; after each
 * meaningful state change they call exec.capture() to grab a frame.
 */
export class Executor {
  #browser;
  #page;
  #baseUrl;
  #outDir;
  #fps;
  #width;
  #height;
  #ctx;
  #captureInterval;
  #startTime;
  // Serializes all page-touching operations so the capture loop never races
  // with goto/click/type and the CDP target stays in a consistent state.
  #pageLock = Promise.resolve();

  constructor(browser, page, opts = {}) {
    this.#browser = browser;
    this.#page = page;
    this.#baseUrl = opts.baseUrl ?? DEFAULT_OPTIONS.baseUrl;
    this.#outDir = opts.outDir ?? DEFAULT_OPTIONS.outDir;
    this.#fps = opts.fps ?? DEFAULT_OPTIONS.fps;
    this.#width = opts.width ?? DEFAULT_OPTIONS.width;
    this.#height = opts.height ?? DEFAULT_OPTIONS.height;
    this.#ctx = null;
    this.#captureInterval = null;
    this.#startTime = 0;
  }

  /**
   * Run `fn` exclusively against the page. The capture loop will not
   * attempt a screenshot while the returned promise is pending.
   */
  #withPageLock(fn) {
    const next = this.#pageLock.then(async () => fn());
    // Swallow rejection on the chain itself so one failure doesn't
    // poison subsequent calls. Callers still receive the original error.
    this.#pageLock = next.catch(() => {});
    return next;
  }

  /** Launch a fresh browser and create an Executor. Call close() when done. */
  static async launch(opts = {}) {
    const merged = { ...DEFAULT_OPTIONS, ...opts };
    const chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH;
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: merged.width,
      height: merged.height,
      deviceScaleFactor: 1,
    });

    return new Executor(browser, page, merged);
  }

  /**
   * Start a new screenplay. Creates a temp dir for frames.
   * @param {string} id  Unique identifier for this screenplay
   */
  async startScreenplay(id) {
    const tempDir = path.join('/tmp/recordings', id);
    await mkdir(tempDir, { recursive: true });
    this.#ctx = { url: '/', frame: 0, tempDir };
    this.#startTime = Date.now();
    return this.#ctx;
  }

  /** Navigate to a URL (relative to baseUrl). */
  async goto(relativeUrl) {
    return this.#withPageLock(async () => {
      const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.#baseUrl}${relativeUrl}`;
      await this.#page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
      this.#ctx.url = relativeUrl;
    });
  }

  /** Click a selector and wait briefly for the DOM to settle. */
  async click(selector) {
    return this.#withPageLock(async () => {
      await this.#page.click(selector, { timeout: 10_000 });
      await new Promise((r) => setTimeout(r, 300));
    });
  }

  /** Type text into an input or textarea. */
  async type(selector, text) {
    return this.#withPageLock(async () => {
      await this.#page.focus(selector);
      await this.#page.keyboard.type(text, { delay: 50 });
    });
  }

  /**
   * Fill an input/textarea using evaluate to bypass React onChange.
   * Dispatches input + change events to trigger React state updates.
   */
  async fillReact(selector, value) {
    return this.#withPageLock(async () => {
      await this.#page.evaluate(
        (sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return;
          // Bypass read-only value setters used by React
          const nativeSetter =
            Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set ??
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeSetter) {
            nativeSetter.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        },
        selector,
        value,
      );
      await new Promise((r) => setTimeout(r, 200));
    });
  }

  /** Upload a file to a file input. */
  async uploadFile(selector, filePath) {
    return this.#withPageLock(async () => {
      const input = await this.#page.$(selector);
      if (!input) throw new Error(`File input not found: ${selector}`);
      await input.uploadFile(filePath);
      await new Promise((r) => setTimeout(r, 500));
    });
  }

  /** Wait for a selector to appear. */
  async waitFor(selector, timeoutMs = 10_000) {
    return this.#withPageLock(async () => {
      await this.#page.waitForSelector(selector, { timeout: timeoutMs, visible: true });
    });
  }

  /** Wait for a URL pattern to match. */
  async waitForUrl(pattern, timeoutMs = 10_000) {
    return this.#withPageLock(async () => {
      const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      await this.#page.waitForFunction(
        (reStr) => new RegExp(reStr).test(window.location.href),
        { timeout: timeoutMs },
        re.source,
      );
    });
  }

  /** Wait for a fixed number of milliseconds. */
  async wait(ms) {
    await new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Capture the current frame as a PNG.
   * Goes through the page lock so it never overlaps with goto/click/type.
   * @returns {Promise<number>} frame number (1-indexed)
   */
  async capture() {
    return this.#withPageLock(async () => {
      const framePath = path.join(
        this.#ctx.tempDir,
        `frame-${String(this.#ctx.frame + 1).padStart(4, '0')}.png`,
      );
      await this.#page.screenshot({
        path: framePath,
        type: 'png',
        omitBackground: false,
      });
      this.#ctx.frame++;
      return this.#ctx.frame;
    });
  }

  /** Start the frame-capture loop at the configured FPS. */
  startCapture() {
    if (this.#captureInterval) return;
    const tick = async () => {
      try {
        await this.capture();
      } catch {
        // Best-effort in the loop
      }
      this.#captureInterval = setTimeout(tick, FRAME_DELAY_MS);
    };
    this.#captureInterval = setTimeout(tick, FRAME_DELAY_MS);
  }

  /** Stop the frame-capture loop. */
  stopCapture() {
    if (this.#captureInterval) {
      clearTimeout(this.#captureInterval);
      this.#captureInterval = null;
    }
  }

  /** Elapsed time in seconds since startScreenplay was called. */
  elapsedSec() {
    return (Date.now() - this.#startTime) / 1000;
  }

  /** Run ffmpeg to assemble frames into an H.264 MP4. */
  async assembleMp4(outputPath) {
    const { execSync } = await import('node:child_process');

    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch {
      throw new Error(
        'ffmpeg not found on PATH. Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Ubuntu).',
      );
    }

    const framePattern = path.join(this.#ctx.tempDir, 'frame-%04d.png');
    execSync(
      [
        'ffmpeg',
        '-y',
        '-framerate',
        String(this.#fps),
        '-i',
        framePattern,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
      ].join(' '),
      { stdio: 'pipe' },
    );
  }

  /** Extract the first frame of an MP4 as a poster PNG. */
  async generatePoster(mp4Path, outputPath) {
    const { execSync } = await import('node:child_process');
    const firstFrame = path.join(this.#ctx.tempDir, 'frame-0001.png');

    try {
      execSync(
        [
          'ffmpeg',
          '-y',
          '-i',
          mp4Path,
          '-vf',
          'select=eq(n\\,0)',
          '-vframes',
          '1',
          outputPath,
        ].join(' '),
        { stdio: 'pipe' },
      );
    } catch {
      // Fallback: copy first frame
      const { copyFile } = await import('node:fs/promises');
      await copyFile(firstFrame, outputPath);
    }
  }

  /** Remove the temp frame directory. */
  async cleanupTempDir() {
    try {
      await rm(this.#ctx.tempDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }

  /** Close the browser. Call after finishing. */
  async close() {
    this.stopCapture();
    await this.#browser.close();
  }

  /** Get the underlying Puppeteer Page for advanced operations. */
  getPage() {
    return this.#page;
  }

  /** Get the base URL. */
  getBaseUrl() {
    return this.#baseUrl;
  }

  /** Number of frames captured in the current screenplay. */
  get frameCount() {
    return this.#ctx?.frame ?? 0;
  }
}
