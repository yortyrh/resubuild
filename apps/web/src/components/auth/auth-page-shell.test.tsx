// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthPageShell } from './auth-page-shell';

describe('AuthPageShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('centers the card with dynamic viewport units and balanced padding', () => {
    const { container } = render(
      <AuthPageShell title="Sign in" description="Welcome back">
        <button type="button">Submit</button>
      </AuthPageShell>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain('min-h-screen');
    expect(wrapper!.className).toContain('min-h-dvh');
    const formColumn = wrapper!.firstElementChild;
    expect(formColumn!.className).toContain('items-center');
    expect(formColumn!.className).toContain('justify-center');
    expect(formColumn!.className).toContain('py-8');
    expect(formColumn!.className).toContain('sm:py-16');
  });

  it('uses reduced card padding below the sm breakpoint', () => {
    const { container } = render(
      <AuthPageShell title="Sign in" description="Welcome back">
        <button type="button">Submit</button>
      </AuthPageShell>,
    );

    // CardHeader and CardContent are the first two divs inside the Card.
    const cardChildren = container.querySelectorAll('.text-card-foreground > div');
    expect(cardChildren.length).toBeGreaterThanOrEqual(2);
    const [cardHeader, cardContent] = cardChildren;
    expect(cardHeader.className).toContain('px-4');
    expect(cardHeader.className).toContain('sm:px-6');
    expect(cardContent.className).toContain('px-4');
    expect(cardContent.className).toContain('sm:px-6');
  });

  it('renders the title, description, and children', () => {
    render(
      <AuthPageShell title="Sign in" description="Welcome back">
        <button type="button">Submit</button>
      </AuthPageShell>,
    );

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('omits the description when not provided', () => {
    render(
      <AuthPageShell title="Sign in">
        <button type="button">Submit</button>
      </AuthPageShell>,
    );

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });

  it('renders a close button linking to the homepage in the top-right corner of the card', () => {
    const { container } = render(
      <AuthPageShell title="Sign in" description="Welcome back">
        <button type="button">Submit</button>
      </AuthPageShell>,
    );

    const closeLink = screen.getByRole('link', { name: /close and return to resubuild home/i });
    expect(closeLink).toBeInTheDocument();
    expect(closeLink).toHaveAttribute('href', '/');
    // The close button is absolutely positioned in the top-right corner of
    // the card and uses an icon-sized tap target.
    expect(closeLink.className).toContain('absolute');
    expect(closeLink.className).toContain('right-3');
    expect(closeLink.className).toContain('top-3');
    expect(closeLink.className).toContain('sm:right-4');
    expect(closeLink.className).toContain('sm:top-4');
    // The close button lives inside the card, not the viewport wrapper.
    const card = container.querySelector('.text-card-foreground');
    expect(card).not.toBeNull();
    expect(card!.contains(closeLink)).toBe(true);
  });

  describe('decorative aside', () => {
    function renderShell() {
      return render(
        <AuthPageShell title="Sign in" description="Welcome back">
          <button type="button">Submit</button>
        </AuthPageShell>,
      );
    }

    it('keeps a hidden-below-lg aside that is hidden from assistive technology', () => {
      const { container } = renderShell();

      const aside = container.querySelector('aside');
      expect(aside).not.toBeNull();
      expect(aside).toHaveAttribute('aria-hidden', 'true');
      expect(aside!.classList.contains('hidden')).toBe(true);
      expect(aside!.classList.contains('lg:flex')).toBe(true);
    });

    it('renders the hero demo gif in the aside', () => {
      const { container } = renderShell();

      const image = container.querySelector('aside img');
      expect(image).not.toBeNull();
      expect(image).toHaveAttribute('src', '/hero-demo.gif');
    });

    it('serves the still poster to visitors who prefer reduced motion', () => {
      const { container } = renderShell();

      const source = container.querySelector('aside picture > source');
      expect(source).not.toBeNull();
      expect(source).toHaveAttribute('media', '(prefers-reduced-motion: reduce)');
      expect(source).toHaveAttribute('srcset', '/hero-demo-poster.png');
      expect(container.querySelector('aside picture > img')).not.toBeNull();
    });

    it('lazy-loads the demo image', () => {
      const { container } = renderShell();

      expect(container.querySelector('aside img')).toHaveAttribute('loading', 'lazy');
    });

    it('no longer shows the static CV specimen or its caption', () => {
      renderShell();

      expect(screen.queryByText(/Ana Castillo/)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Your CV, edited as the page it prints on/),
      ).not.toBeInTheDocument();
    });
  });
});
