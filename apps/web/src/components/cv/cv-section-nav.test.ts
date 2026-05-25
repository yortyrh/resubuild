import { describe, expect, it } from 'vitest';
import {
  CV_SECTIONS,
  CV_SECTION_SLUGS,
  getSectionHref,
  isValidSectionSlug,
  resolveSectionFromSlug,
} from './cv-section-nav';

describe('CV_SECTIONS', () => {
  it('has 13 sections', () => {
    expect(CV_SECTIONS).toHaveLength(13);
  });

  it('starts with basics', () => {
    expect(CV_SECTIONS[0]).toEqual({ slug: 'basics', label: 'Basics' });
  });

  it('contains all slugs from CV_SECTION_SLUGS', () => {
    const slugsFromConfig = CV_SECTIONS.map((s) => s.slug);
    expect(slugsFromConfig).toEqual([...CV_SECTION_SLUGS]);
  });
});

describe('isValidSectionSlug', () => {
  it.each(CV_SECTION_SLUGS)('returns true for "%s"', (slug) => {
    expect(isValidSectionSlug(slug)).toBe(true);
  });

  it('returns false for invalid slug', () => {
    expect(isValidSectionSlug('not-a-section')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidSectionSlug('')).toBe(false);
  });
});

describe('resolveSectionFromSlug', () => {
  it('returns basics when slug is undefined', () => {
    expect(resolveSectionFromSlug(undefined)).toBe('basics');
  });

  it('returns basics for invalid slug', () => {
    expect(resolveSectionFromSlug('invalid')).toBe('basics');
  });

  it('returns the slug when it is valid', () => {
    expect(resolveSectionFromSlug('work')).toBe('work');
    expect(resolveSectionFromSlug('education')).toBe('education');
  });

  it('returns basics for empty string', () => {
    expect(resolveSectionFromSlug('')).toBe('basics');
  });
});

describe('getSectionHref', () => {
  const cvId = 'abc-123';

  it('returns /dashboard/cv/[id] for basics', () => {
    expect(getSectionHref(cvId, 'basics')).toBe('/dashboard/cv/abc-123');
  });

  it('returns /dashboard/cv/[id]/work for work', () => {
    expect(getSectionHref(cvId, 'work')).toBe('/dashboard/cv/abc-123/work');
  });

  it('returns /dashboard/cv/[id]/profiles for profiles', () => {
    expect(getSectionHref(cvId, 'profiles')).toBe('/dashboard/cv/abc-123/profiles');
  });

  it.each(CV_SECTION_SLUGS.filter((s) => s !== 'basics'))(
    'generates correct href for "%s"',
    (slug) => {
      expect(getSectionHref(cvId, slug)).toBe(`/dashboard/cv/${cvId}/${slug}`);
    },
  );
});
