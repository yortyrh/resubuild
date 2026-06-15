import { describe, expect, it } from 'vitest';
import { marketingFaqItems, seoFaqItems, seoKeywords } from './seo-faq';

describe('seo-faq', () => {
  it('includes Google Trends target keywords and excludes deprioritized variants', () => {
    expect(seoKeywords).toEqual(
      expect.arrayContaining([
        'best resume',
        'resume skills',
        'best resume templates',
        'resume templates',
        'ai resume',
        'what is a resume summary',
      ]),
    );

    expect(seoKeywords).not.toContain('resume template');
    expect(seoKeywords).not.toContain('resume ai');
    expect(seoKeywords).not.toContain('free ats resume checker');
  });

  it('provides trend-driven FAQ entries for schema markup', () => {
    const questions = seoFaqItems.map((item) => item.question);

    expect(questions).toContain('What is a resume summary?');
    expect(questions).toContain('Which resume skills should I include?');
    expect(questions).toContain('How can AI help build my resume?');
    expect(seoFaqItems.every((item) => item.answer.length > 40)).toBe(true);
  });

  it('merges SEO and product FAQ items for the marketing page', () => {
    expect(marketingFaqItems.length).toBeGreaterThan(seoFaqItems.length);
    expect(marketingFaqItems.some((item) => item.question === 'Is the data private?')).toBe(true);
  });
});
