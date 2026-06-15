import { describe, expect, it } from 'vitest';
import { absoluteUrl, siteConfig } from './site';

describe('site config', () => {
  it('builds absolute URLs from the configured site origin', () => {
    expect(absoluteUrl('/features')).toBe(`${siteConfig.url}/features`);
  });

  it('exposes SEO defaults for public marketing pages', () => {
    expect(siteConfig.name).toBe('Resubuild');
    expect(siteConfig.description.length).toBeGreaterThan(50);
    expect(siteConfig.ogImage).toMatch(/^\//);
    expect(siteConfig.keywords).toContain('best resume');
    expect(siteConfig.keywords).toContain('ai resume');
  });
});
