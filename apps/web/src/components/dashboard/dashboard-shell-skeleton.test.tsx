// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardShellSkeleton } from './dashboard-shell-skeleton';

describe('DashboardShellSkeleton', () => {
  it('renders a rail placeholder and a main-content placeholder', () => {
    render(<DashboardShellSkeleton />);

    const status = screen.getByRole('status', { name: 'Loading dashboard' });
    expect(status).toBeInTheDocument();

    const aside = document.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside).toHaveClass('hidden');
    expect(aside).toHaveClass('md:block');

    const main = document.querySelector('main');
    expect(main).not.toBeNull();
  });
});
