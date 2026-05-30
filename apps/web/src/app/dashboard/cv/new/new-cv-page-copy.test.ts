import { describe, expect, it } from 'vitest';
import { getNewCvPageCopy } from './new-cv-page-copy';

describe('getNewCvPageCopy', () => {
  it('returns copy for unified import routes', () => {
    expect(getNewCvPageCopy('/dashboard/cv/new/import/file').title).toBe('Import from file');
    expect(getNewCvPageCopy('/dashboard/cv/new/import/url').title).toBe('Import from URL');
  });

  it('falls back for unknown paths', () => {
    expect(getNewCvPageCopy('/dashboard/cv/new/import/pdf').title).toBe('Create a new CV');
  });
});
