import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';
import { UserMenu } from './user-menu';

const mockLogoutMutate = vi.fn();
const mockUseAuthMe = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/queries/auth-mutations', () => ({
  useLogout: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthMe: (...args: unknown[]) => mockUseAuthMe(...args),
}));

describe('UserMenu', () => {
  afterEach(() => {
    cleanup();
    mockLogoutMutate.mockClear();
  });

  function renderMenu() {
    return render(<UserMenu />, { wrapper: createQueryWrapper() });
  }

  it('shows the user name, email, and avatar initials in the trigger', () => {
    mockUseAuthMe.mockReturnValue({
      data: {
        user: { id: 'u-1', email: 'jane.doe@example.com', picture: null },
        has_password: true,
      },
    });

    renderMenu();

    const trigger = screen.getByRole('button', { name: 'User menu' });
    expect(trigger).toHaveTextContent('jane');
    expect(trigger).toHaveTextContent('jane.doe@example.com');
    expect(trigger.querySelector('[class*="rounded-full"]')).toHaveTextContent('J');
  });

  it('renders the avatar image in the trigger when a picture URL is available', () => {
    mockUseAuthMe.mockReturnValue({
      data: {
        user: { id: 'u-1', email: 'a@b.com', picture: 'https://cdn.example.com/avatar.png' },
        has_password: true,
      },
    });

    renderMenu();

    const trigger = screen.getByRole('button', { name: 'User menu' });
    const img = trigger.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
  });

  it('exposes AI agent and MCP config links with distinct icons in the dropdown', async () => {
    mockUseAuthMe.mockReturnValue({ data: undefined });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'User menu' }));

    expect(await screen.findByRole('menuitem', { name: /AI agent/i })).toHaveAttribute(
      'href',
      '/dashboard/settings/ai-agent',
    );
    expect(screen.getByRole('menuitem', { name: /MCP/i })).toHaveAttribute(
      'href',
      '/dashboard/settings/mcp',
    );
  });

  it('calls sign out when the menu item is selected', async () => {
    mockUseAuthMe.mockReturnValue({ data: undefined });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    const signOut = await screen.findByRole('menuitem', { name: /Sign out/i });
    await user.click(signOut);
    expect(mockLogoutMutate).toHaveBeenCalled();
  });
});
