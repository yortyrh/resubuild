// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExternalLink, linkedEntitySubtitle, resumeExternalLinkClassName } from './external-link';

describe('ExternalLink UI', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders link text with sky color, underline, and external icon', () => {
    const { container } = render(
      <ExternalLink href="https://technova.example.com">TechNova Solutions</ExternalLink>,
    );

    const link = screen.getByRole('link', { name: /techNova solutions/i });
    expect(link).toHaveAttribute('href', 'https://technova.example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.className).toContain('text-sky-700');
    expect(link.className).toContain('underline');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('applies shared link styling through linkedEntitySubtitle', () => {
    render(linkedEntitySubtitle('TechNova Solutions', 'https://technova.example.com'));

    const link = screen.getByRole('link', { name: /techNova solutions/i });
    expect(link.className).toContain(resumeExternalLinkClassName.split(' ')[0]);
  });
});
