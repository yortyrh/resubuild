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
    expect(wrapper!.className).toContain('items-center');
    expect(wrapper!.className).toContain('justify-center');
    expect(wrapper!.className).toContain('py-8');
    expect(wrapper!.className).toContain('sm:py-16');
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
});
