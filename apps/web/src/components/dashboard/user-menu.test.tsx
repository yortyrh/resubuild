// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockClearSession = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/lib/auth-session', () => ({
  clearSession: () => mockClearSession(),
}));

import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows AI agent settings link', async () => {
    const user = userEvent.setup({ delay: null });
    render(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByRole('menuitem', { name: /AI agent settings/i })).toHaveAttribute(
      'href',
      '/dashboard/settings/ai-agent',
    );
  });

  it('signs out from menu', async () => {
    const user = userEvent.setup({ delay: null });
    render(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(mockClearSession).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockRefresh).toHaveBeenCalled();
  });
});
