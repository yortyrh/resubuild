import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { marketingFaqItems } from '@/lib/seo-faq';
import { JsonLd } from './json-ld';

describe('JsonLd', () => {
  it('emits FAQPage schema on the home page', () => {
    const { container } = render(<JsonLd path="/" />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();

    const schema = JSON.parse(script!.textContent!);
    const faqPage = schema['@graph'].find(
      (node: { '@type': string }) => node['@type'] === 'FAQPage',
    );

    expect(faqPage).toBeDefined();
    expect(faqPage.mainEntity).toHaveLength(marketingFaqItems.length);
    expect(faqPage.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'What is a resume summary?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: expect.any(String),
      },
    });
  });

  it('omits FAQPage schema on non-home marketing routes', () => {
    const { container } = render(<JsonLd path="/features" />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script!.textContent!);
    const faqPage = schema['@graph'].find(
      (node: { '@type': string }) => node['@type'] === 'FAQPage',
    );

    expect(faqPage).toBeUndefined();
  });
});
