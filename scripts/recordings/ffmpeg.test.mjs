/**
 * ffmpeg.test.mjs
 *
 * Vitest unit test that validates the ffmpeg command produces a valid H.264 MP4
 * from a synthetic 3-frame PNG sequence.
 *
 * Run with: pnpm test:scripts
 */

import { execSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ffmpeg MP4 assembly', () => {
  const workDir = path.join(__dirname, '../../.tmp-ffmpeg-test');

  beforeAll(async () => {
    // Create a temp dir with 3 tiny PNG frames (1x1 red pixel)
    await mkdir(workDir, { recursive: true });

    // A minimal valid PNG: 1x1 red pixel
    // This is a base64-encoded valid PNG
    const png1x1Base64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(png1x1Base64, 'base64');

    for (let i = 1; i <= 3; i++) {
      const framePath = path.join(workDir, `frame-${String(i).padStart(4, '0')}.png`);
      await writeFile(framePath, pngBuffer);
    }
  });

  it('produces a valid H.264 MP4 from 3 PNG frames', () => {
    const outputPath = path.join(workDir, 'test-output.mp4');

    // Clean up any previous run
    try {
      rm(outputPath, { force: true });
    } catch {
      /* ignore */
    }

    // Run ffmpeg
    const cmd = [
      'ffmpeg',
      '-y',
      '-framerate',
      '30',
      '-i',
      path.join(workDir, 'frame-%04d.png'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ].join(' ');

    execSync(cmd, { stdio: 'pipe' });

    // Verify the output file exists and has a reasonable size
    const { existsSync, statSync } = require('node:fs');
    expect(existsSync(outputPath)).toBe(true);

    const stat = statSync(outputPath);
    expect(stat.size).toBeGreaterThan(1000); // At least 1 KB for 3 frames

    // Use ffprobe to validate the MP4 header
    const ffprobeOut = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=codec_type,codec_name,width,height -of json ${outputPath}`,
      { encoding: 'utf8' },
    );
    const probe = JSON.parse(ffprobeOut);

    expect(probe.streams).toHaveLength(1);
    expect(probe.streams[0].codec_type).toBe('video');
    expect(probe.streams[0].codec_name).toBe('h264');
    expect(probe.streams[0].width).toBeGreaterThan(0);
    expect(probe.streams[0].height).toBeGreaterThan(0);
  });

  it('extracts the first frame as a poster PNG', () => {
    const mp4Path = path.join(workDir, 'test-output.mp4');
    const posterPath = path.join(workDir, 'test-poster.png');

    try {
      rm(posterPath, { force: true });
    } catch {
      /* ignore */
    }

    const cmd = [
      'ffmpeg',
      '-y',
      '-i',
      mp4Path,
      '-vf',
      'select=eq(n\\,0)',
      '-vframes',
      '1',
      posterPath,
    ].join(' ');

    execSync(cmd, { stdio: 'pipe' });

    const { existsSync, statSync } = require('node:fs');
    expect(existsSync(posterPath)).toBe(true);

    const stat = statSync(posterPath);
    expect(stat.size).toBeGreaterThan(100);
  });
});
