// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NEW_CV_ROUTES, NewCvDropdown } from './new-cv-dropdown';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('NewCvDropdown', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists all create/import routes in the menu', async () => {
    const user = userEvent.setup();
    render(<NewCvDropdown />);

    await user.click(screen.getByRole('button', { name: /New CV/i }));

    for (const route of NEW_CV_ROUTES) {
      expect(screen.getByRole('link', { name: route.label })).toHaveAttribute('href', route.href);
    }
  });

  it('uses a custom label when provided', () => {
    render(<NewCvDropdown label="Create CV" />);
    expect(screen.getByRole('button', { name: /Create CV/i })).toBeInTheDocument();
  });

  it('hides the visible label below the sm breakpoint and preserves the accessible name', () => {
    const { container } = render(<NewCvDropdown />);

    const trigger = screen.getByRole('button', { name: 'New CV' });
    expect(trigger).toHaveAttribute('aria-label', 'New CV');

    const visibleLabel = container.querySelector('span.hidden.sm\\:inline');
    expect(visibleLabel).not.toBeNull();
    expect(visibleLabel).toHaveTextContent('New CV');
  });
});
