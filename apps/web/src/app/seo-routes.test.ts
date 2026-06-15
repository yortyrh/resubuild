import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { siteConfig } from '@/lib/site';

describe('SEO route handlers', () => {
  it('lists public marketing URLs in the sitemap', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(siteConfig.url);
    expect(urls).toContain(`${siteConfig.url}/features`);
  });

  it('blocks dashboard routes from crawlers while keeping marketing pages indexable', () => {
    const rules = robots().rules;

    expect(rules).toMatchObject({
      allow: '/',
      disallow: ['/dashboard/', '/api/'],
    });
  });
});
