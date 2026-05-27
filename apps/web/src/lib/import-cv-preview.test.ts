import { describe, expect, it, vi } from 'vitest';
import {
  classifyImagePreviewStatus,
  isHttpImageUrl,
  parseImportJsonSource,
  probeExternalImageUrl,
} from './import-cv-preview';

vi.mock('@/lib/api', () => ({
  parseMediaIdFromImageUrl: (url: string | undefined) => {
    if (!url) return null;
    const match = url.match(/\/media\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  },
}));

describe('parseImportJsonSource', () => {
  it('rejects invalid JSON', () => {
    expect(parseImportJsonSource('{ nope')).toEqual({
      valid: false,
      message: 'Invalid JSON file',
    });
  });

  it('rejects non-object resume roots', () => {
    expect(parseImportJsonSource('[]')).toEqual({
      valid: false,
      message: 'Resume must be a JSON object',
    });
  });

  it('offers Gravatar when image URL is missing but email is present', () => {
    const preview = parseImportJsonSource(
      JSON.stringify({ basics: { name: 'Jane', email: 'jane@example.com' } }),
    );
    expect(preview).toMatchObject({
      valid: true,
      showGravatarOption: true,
      imageStatus: 'none',
    });
  });

  it('offers Gravatar when image URL host is blocked for import', () => {
    const preview = parseImportJsonSource(
      JSON.stringify({
        basics: {
          name: 'Jane',
          email: 'jane@example.com',
          image: 'http://127.0.0.1/photo.png',
        },
      }),
    );
    expect(preview).toMatchObject({
      valid: true,
      showGravatarOption: true,
      imageStatus: 'host_not_allowed',
    });
  });

  it('offers Gravatar when image URL format is invalid', () => {
    const preview = parseImportJsonSource(
      JSON.stringify({
        basics: { name: 'Jane', email: 'jane@example.com', image: 'not-a-url' },
      }),
    );
    expect(preview).toMatchObject({
      valid: true,
      showGravatarOption: true,
      imageStatus: 'invalid_url',
    });
  });
});

describe('isHttpImageUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isHttpImageUrl('https://example.com/a.png')).toBe(true);
    expect(isHttpImageUrl('ftp://example.com/a.png')).toBe(false);
    expect(isHttpImageUrl('not-url')).toBe(false);
  });
});

describe('probeExternalImageUrl', () => {
  it('uses the probe implementation', async () => {
    const probe = vi.fn().mockResolvedValue(true);
    await expect(probeExternalImageUrl('https://example.com/x.png', probe)).resolves.toBe(true);
    expect(probe).toHaveBeenCalledWith('https://example.com/x.png');
  });
});

describe('classifyImagePreviewStatus', () => {
  it('marks owned media as ready without checking', () => {
    expect(
      classifyImagePreviewStatus(
        'http://localhost:3001/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      ),
    ).toBe('owned');
  });
});
