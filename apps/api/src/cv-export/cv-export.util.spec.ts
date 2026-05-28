import { slugifyExportFilename, toAbsoluteMediaUrl } from './cv-export.util';

describe('toAbsoluteMediaUrl', () => {
  it('returns undefined for empty values', () => {
    expect(toAbsoluteMediaUrl(undefined, 'http://localhost:3001')).toBeUndefined();
    expect(toAbsoluteMediaUrl('  ', 'http://localhost:3001')).toBeUndefined();
  });

  it('returns absolute URLs unchanged', () => {
    expect(toAbsoluteMediaUrl('https://cdn.example/a.png', 'http://localhost:3001')).toBe(
      'https://cdn.example/a.png',
    );
  });

  it('prefixes root-relative paths with API origin', () => {
    expect(toAbsoluteMediaUrl('/media/photo.jpg', 'http://localhost:3001/')).toBe(
      'http://localhost:3001/media/photo.jpg',
    );
  });

  it('prefixes bare paths with API origin and slash', () => {
    expect(toAbsoluteMediaUrl('media/photo.jpg', 'http://localhost:3001')).toBe(
      'http://localhost:3001/media/photo.jpg',
    );
  });
});

describe('slugifyExportFilename', () => {
  it('slugifies names for download filenames', () => {
    expect(slugifyExportFilename('Jane Doe')).toBe('jane-doe');
  });

  it('falls back to resume when slug is empty', () => {
    expect(slugifyExportFilename('!!!')).toBe('resume');
  });
});
