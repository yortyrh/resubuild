import { describe, expect, it } from 'vitest';
import { CV_SECTION_ICONS, getSectionIcon } from './cv-section-icons';
import { CV_SECTION_SLUGS } from './cv-section-nav';

describe('CV_SECTION_ICONS', () => {
  it('defines a unique icon for every section', () => {
    expect(Object.keys(CV_SECTION_ICONS)).toEqual([...CV_SECTION_SLUGS]);
  });

  it.each(CV_SECTION_SLUGS)('returns an icon component for "%s"', (slug) => {
    expect(getSectionIcon(slug)).toBe(CV_SECTION_ICONS[slug]);
  });
});
