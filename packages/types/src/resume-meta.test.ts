import { describe, expect, it } from 'vitest';
import {
  applyResumeMetaForCreate,
  applyResumeMetaForUpdate,
  bumpResumeMetaVersion,
  formatResumeLastModified,
  buildResumeCanonicalUrl,
  getResumeMetaVersion,
  stripResumeMetaFromEditor,
} from './resume-meta';

describe('resume-meta', () => {
  describe('formatResumeLastModified', () => {
    it('returns yyyy-mm-dd HH:MM:SS in UTC slice', () => {
      expect(formatResumeLastModified(new Date(Date.UTC(2025, 0, 2, 3, 4, 56)))).toBe(
        '2025-01-02T03:04:56',
      );
    });
  });

  describe('buildResumeCanonicalUrl', () => {
    it('strips trailing slash from base URL', () => {
      expect(buildResumeCanonicalUrl('https://example.com/', 'abc')).toBe(
        'https://example.com/dashboard/cv/abc',
      );
    });
  });

  describe('getResumeMetaVersion', () => {
    it('reads version string from meta block', () => {
      expect(getResumeMetaVersion({ meta: { version: 'v2.3.4' } })).toBe('v2.3.4');
    });

    it('returns undefined when missing or invalid', () => {
      expect(getResumeMetaVersion({ meta: {} })).toBeUndefined();
      expect(getResumeMetaVersion({})).toBeUndefined();
    });
  });

  describe('bumpResumeMetaVersion', () => {
    it('bumps patch for semver-ish versions', () => {
      expect(bumpResumeMetaVersion('v2.10.99')).toBe('v2.10.100');
      expect(bumpResumeMetaVersion('2.10.99')).toBe('v2.10.100');
    });

    it('falls back to digit heuristic', () => {
      expect(bumpResumeMetaVersion('v12')).toBe('v13.0.0');
    });
  });

  describe('applyResumeMetaForCreate', () => {
    it('adds canonical, version v1.0.0, and lastModified', () => {
      const clock = new Date(Date.UTC(2026, 2, 1, 10, 0, 5));
      const result = applyResumeMetaForCreate(
        { basics: { name: 'Ada' } },
        { cvId: 'uuid-1', baseUrl: 'https://cv.example/', now: clock },
      );
      expect(result).toMatchObject({
        basics: { name: 'Ada' },
        meta: {
          canonical: 'https://cv.example/dashboard/cv/uuid-1',
          version: 'v1.0.0',
          lastModified: formatResumeLastModified(clock),
        },
      });
    });
  });

  describe('applyResumeMetaForUpdate', () => {
    it('bumps patch from current version string', () => {
      const result = applyResumeMetaForUpdate(
        { basics: { name: 'Ada' }, meta: { version: 'v1.4.17' } },
        {
          cvId: 'uuid-2',
          baseUrl: 'https://cv.example/',
          currentVersion: 'v1.4.17',
          now: new Date(0),
        },
      );
      expect((result.meta as { version?: string }).version).toBe('v1.4.18');
    });

    it('defaults base version when current is absent', () => {
      const result = applyResumeMetaForUpdate(
        { basics: {} },
        {
          cvId: 'uuid-3',
          baseUrl: 'https://cv.example',
          currentVersion: undefined,
        },
      );
      expect((result.meta as { version?: string }).version).toBe('v1.0.1');
    });
  });

  describe('stripResumeMetaFromEditor', () => {
    it('drops meta fields from resume object', () => {
      expect(
        stripResumeMetaFromEditor({
          basics: { name: 'Ada' },
          meta: {
            canonical: 'https://x',
            version: 'v1',
            lastModified: '',
          },
        }),
      ).toEqual({
        basics: { name: 'Ada' },
      });
    });
  });
});
