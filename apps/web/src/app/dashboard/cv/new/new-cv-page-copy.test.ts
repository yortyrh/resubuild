import { describe, expect, it } from 'vitest';
import { getNewCvPageCopy, NEW_CV_PAGE_COPY } from './new-cv-page-copy';

describe('getNewCvPageCopy', () => {
  it('returns route-specific copy for each create/import page', () => {
    expect(getNewCvPageCopy('/dashboard/cv/new/create').title).toBe('Create a CV manually');
    expect(getNewCvPageCopy('/dashboard/cv/new/import/pdf').title).toBe('Import from PDF');
    expect(getNewCvPageCopy('/dashboard/cv/new/import/json').title).toBe('Import JSON Resume');
    expect(getNewCvPageCopy('/dashboard/cv/new/import/website').title).toBe('Import from website');
    expect(getNewCvPageCopy('/dashboard/cv/new/import/markdown').title).toBe(
      'Import from Markdown',
    );
  });

  it('covers every configured route with a non-empty subtitle', () => {
    for (const copy of Object.values(NEW_CV_PAGE_COPY)) {
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('falls back for unknown paths', () => {
    expect(getNewCvPageCopy('/dashboard/cv/new/unknown').title).toBe('Create a new CV');
  });
});
