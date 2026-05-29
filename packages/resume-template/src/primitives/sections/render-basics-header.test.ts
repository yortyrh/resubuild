import { describe, expect, it } from 'vitest';
import { BRAND_ICON_PATHS } from '../../brand-icon-paths';
import { getDefaultPresentationConfig } from '../../template-config';
import { TEMPLATE_URL_LINK_CLASS } from '../icons';
import { renderBasicsHeader } from './index';

const fullBasics = {
  name: 'Jane Doe',
  label: 'Engineer',
  email: 'jane@example.com',
  phone: '555-0100',
  url: 'https://example.com',
  location: { city: 'Boston', region: 'MA', countryCode: 'US' },
  profiles: [
    {
      network: 'GitHub',
      username: 'janedoe',
      url: 'https://github.com/janedoe',
    },
  ],
};

describe('renderBasicsHeader', () => {
  it('includes contact and brand icons for classic centered header', () => {
    const presentation = getDefaultPresentationConfig('classic');
    const html = renderBasicsHeader(fullBasics, 'centered', presentation);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inline-flex items-center gap-1');
    expect(html).toContain('jane@example.com');
    expect(html).toContain('555-0100');
    expect(html).toContain('Boston');
    expect(html).toContain('example.com');
    expect(html).toContain(TEMPLATE_URL_LINK_CLASS);
    expect(html).toContain('janedoe');
    expect(html).toContain('github.com/janedoe');
    expect(html).toContain(BRAND_ICON_PATHS.github.slice(0, 20));
  });

  it('omits phone segment when phone field hidden', () => {
    const presentation = getDefaultPresentationConfig('classic');
    const hiddenPhone = {
      ...presentation,
      basicsFields: { ...presentation.basicsFields, phone: false },
    };
    const html = renderBasicsHeader(fullBasics, 'centered', hiddenPhone);

    expect(html).not.toContain('555-0100');
    expect(html).toContain('jane@example.com');
  });

  it('renders profile with deduced url when url field is empty', () => {
    const presentation = getDefaultPresentationConfig('classic');
    const basics = {
      ...fullBasics,
      profiles: [{ network: 'GitHub', username: 'janedoe' }],
    };
    const html = renderBasicsHeader(basics, 'centered', presentation);

    expect(html).toContain('github.com/janedoe');
    expect(html).toContain('janedoe');
  });

  it('stacks icon-prefixed contact lines in tabular header', () => {
    const presentation = getDefaultPresentationConfig('tabular');
    const html = renderBasicsHeader(fullBasics, 'tabular', presentation);

    const rightColStart = html.indexOf('sm:text-right');
    expect(rightColStart).toBeGreaterThan(-1);
    const rightCol = html.slice(rightColStart);
    expect(rightCol).toContain('<br />');
    expect(rightCol).toContain('inline-flex items-center gap-1');
    expect(rightCol).toContain('jane@example.com');
  });
});
