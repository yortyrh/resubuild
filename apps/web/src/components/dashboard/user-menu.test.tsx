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
  afterEach(() => cleanup());

  it('includes MCP settings link', async () => {
    mockUseAuthMe.mockReturnValue({ data: undefined });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu />, { wrapper: createQueryWrapper() });
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    const link = await screen.findByRole('menuitem', { name: /MCP settings/i });
    expect(link).toHaveAttribute('href', '/dashboard/settings/mcp');
  });

  it('renders the avatar image when useAuthMe returns a picture URL', () => {
    mockUseAuthMe.mockReturnValue({
      data: {
        user: { id: 'u-1', email: 'a@b.com', picture: 'https://cdn.example.com/avatar.png' },
        has_password: true,
      },
    });

    const { container } = render(<UserMenu />, { wrapper: createQueryWrapper() });

    const trigger = screen.getByRole('button', { name: 'User menu' });
    const img = trigger.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
    // No UserRound svg in the trigger when avatar is shown
    expect(container.querySelector('.lucide-user-round')).toBeNull();
  });

  it('falls back to the UserRound icon when picture is null', () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u-1', email: 'a@b.com', picture: null }, has_password: true },
    });

    const { container } = render(<UserMenu />, { wrapper: createQueryWrapper() });

    const trigger = screen.getByRole('button', { name: 'User menu' });
    expect(trigger.querySelector('img')).toBeNull();
    // lucide-react UserRound renders an <svg> with class containing "lucide-user-round"
    expect(container.querySelector('.lucide-user-round')).not.toBeNull();
  });
});
