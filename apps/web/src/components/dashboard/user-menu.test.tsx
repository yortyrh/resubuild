import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';
import { UserMenu } from './user-menu';

const mockLogoutMutate = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/queries/auth-mutations', () => ({
  useLogout: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

describe('UserMenu', () => {
  it('includes MCP settings link', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu />, { wrapper: createQueryWrapper() });
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    const link = await screen.findByRole('menuitem', { name: /MCP settings/i });
    expect(link).toHaveAttribute('href', '/dashboard/settings/mcp');
  });
});
