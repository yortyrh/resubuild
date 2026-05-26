import { describe, expect, it } from 'vitest';
import { deriveCvShortTitleFromBasics, deriveCvTitleFromBasics } from './cv-title';

describe('deriveCvTitleFromBasics', () => {
  it('formats name and label with em dash separator', () => {
    expect(deriveCvTitleFromBasics({ name: 'Jane Doe', label: 'Software Engineer' })).toBe(
      'Jane Doe — Software Engineer',
    );
  });

  it('returns name only when label is empty', () => {
    expect(deriveCvTitleFromBasics({ name: 'Jane Doe', label: '' })).toBe('Jane Doe');
    expect(deriveCvTitleFromBasics({ name: 'Jane Doe' })).toBe('Jane Doe');
  });

  it('returns label only when name is empty', () => {
    expect(deriveCvTitleFromBasics({ name: '', label: 'Software Engineer' })).toBe(
      'Software Engineer',
    );
    expect(deriveCvTitleFromBasics({ label: 'Software Engineer' })).toBe('Software Engineer');
  });

  it('returns Untitled CV when both are empty or missing', () => {
    expect(deriveCvTitleFromBasics({ name: '', label: '' })).toBe('Untitled CV');
    expect(deriveCvTitleFromBasics({})).toBe('Untitled CV');
    expect(deriveCvTitleFromBasics(undefined)).toBe('Untitled CV');
    expect(deriveCvTitleFromBasics(null)).toBe('Untitled CV');
  });

  it('trims whitespace from name and label', () => {
    expect(deriveCvTitleFromBasics({ name: '  Jane Doe  ', label: '  Software Engineer  ' })).toBe(
      'Jane Doe — Software Engineer',
    );
    expect(deriveCvTitleFromBasics({ name: '   ', label: '  Engineer  ' })).toBe('Engineer');
    expect(deriveCvTitleFromBasics({ name: '   ', label: '   ' })).toBe('Untitled CV');
  });
});

describe('deriveCvShortTitleFromBasics', () => {
  it('returns name only when both name and label are present', () => {
    expect(
      deriveCvShortTitleFromBasics({ name: 'Jane Doe', label: 'Senior Software Engineer' }),
    ).toBe('Jane Doe');
  });

  it('falls back to full title when name is missing', () => {
    expect(deriveCvShortTitleFromBasics({ name: '', label: 'Software Engineer' })).toBe(
      'Software Engineer',
    );
    expect(deriveCvShortTitleFromBasics({})).toBe('Untitled CV');
  });
});
