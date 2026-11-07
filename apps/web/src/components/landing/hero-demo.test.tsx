// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HeroDemo } from './hero-demo';

describe('HeroDemo', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the gif with a still poster for reduced motion', () => {
    const { container } = render(<HeroDemo />);

    const image = container.querySelector('picture > img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('src', '/hero-demo.gif');
    expect(image).toHaveAttribute('alt');
    expect(image!.getAttribute('alt')).not.toBe('');

    const source = container.querySelector('picture > source');
    expect(source).not.toBeNull();
    expect(source).toHaveAttribute('media', '(prefers-reduced-motion: reduce)');
    expect(source).toHaveAttribute('srcset', '/hero-demo-poster.png');
  });

  it('sets no loading attribute by default', () => {
    const { container } = render(<HeroDemo />);

    expect(container.querySelector('img')).not.toHaveAttribute('loading');
  });

  it('passes loading="lazy" through to the image', () => {
    const { container } = render(<HeroDemo loading="lazy" />);

    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });

  it('applies className to the figure', () => {
    const { container } = render(<HeroDemo className="custom-demo" />);

    const figure = container.querySelector('figure');
    expect(figure).not.toBeNull();
    expect(figure!.classList.contains('custom-demo')).toBe(true);
    expect(container.firstElementChild).toBe(figure);
  });
});
