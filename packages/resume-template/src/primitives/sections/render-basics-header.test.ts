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

    expect(html).toContain('justify-center');
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

  it('centers contact row for modern design header', () => {
    const presentation = getDefaultPresentationConfig('modern');
    const html = renderBasicsHeader(fullBasics, 'design', presentation);

    expect(html).toContain('text-center');
    expect(html).toContain('justify-center');
  });

  it('does not center contact row for left header', () => {
    const presentation = getDefaultPresentationConfig('left');
    const html = renderBasicsHeader(fullBasics, 'left', presentation);

    expect(html).toContain('text-left');
    expect(html).not.toContain('justify-center');
  });

  it('stacks contact lines but shows profiles inline in tabular header', () => {
    const presentation = getDefaultPresentationConfig('tabular');
    const basics = {
      ...fullBasics,
      profiles: [
        { network: 'LinkedIn', username: 'janedoe', url: 'https://linkedin.com/in/janedoe' },
        { network: 'GitHub', username: 'janedoe', url: 'https://github.com/janedoe' },
        { network: 'X', username: 'janedoe', url: 'https://x.com/janedoe' },
      ],
    };
    const html = renderBasicsHeader(basics, 'tabular', presentation);

    const rightColStart = html.indexOf('sm:text-right');
    expect(rightColStart).toBeGreaterThan(-1);
    const rightCol = html.slice(rightColStart);
    expect(rightCol).toContain('<br />');
    expect(rightCol).toContain('inline-flex items-center gap-1');
    expect(rightCol).toContain('jane@example.com');

    const profileRowStart = rightCol.indexOf('justify-end gap-x-3');
    expect(profileRowStart).toBeGreaterThan(-1);
    const profileRow = rightCol.slice(profileRowStart);
    expect(profileRow).not.toContain('space-y-1');
    const profileBrCount = (profileRow.match(/<br \/>/g) ?? []).length;
    expect(profileBrCount).toBe(0);
  });
});
