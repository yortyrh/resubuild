import { DEFAULT_REDIRECT, safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('keeps app-relative paths', () => {
    expect(safeRedirectPath('/dashboard/cv?x=1#a')).toBe('/dashboard/cv?x=1#a');
  });

  it.each([
    undefined,
    '',
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    'dashboard',
    '/a\nb',
    42,
  ])('rejects %p', (value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT);
  });
});
