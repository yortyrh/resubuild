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
});
