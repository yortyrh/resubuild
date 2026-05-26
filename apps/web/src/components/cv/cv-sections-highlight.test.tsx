// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { highlightBody } from './cv-sections';

describe('highlightBody', () => {
  it('renders markdown emphasis in bullets when markdown is true', () => {
    const { container } = render(
      highlightBody(['**Reduced API latency by 40%**'], { markdown: true }),
    );

    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('Reduced API latency by 40%');
    expect(container.textContent).not.toContain('**');
  });

  it('renders markdown links in bullets when markdown is true', () => {
    const { container } = render(
      highlightBody(['See [docs](https://example.com/docs)'], { markdown: true }),
    );

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com/docs');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders plain text bullets when markdown is false', () => {
    const { container } = render(highlightBody(['**not bold**', 'CS101'], { markdown: false }));

    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toContain('**not bold**');
    expect(container.textContent).toContain('CS101');
  });

  it('renders a title above the bullet list', () => {
    const { container } = render(highlightBody(['Shipped v2'], { markdown: true }));

    expect(container.textContent).toContain('Highlights');
    expect(container.textContent).toContain('Shipped v2');
    expect(container.querySelector('ul')).not.toBeNull();
  });

  it('supports a custom title', () => {
    const { container } = render(highlightBody(['CS101'], { title: 'Courses' }));

    expect(container.textContent).toContain('Courses');
    expect(container.textContent).toContain('CS101');
  });

  it('returns null for empty values', () => {
    const { container } = render(highlightBody([]));
    expect(container.innerHTML).toBe('');
  });
});
