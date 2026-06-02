import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserMenu } from './user-menu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('UserMenu', () => {
  it('includes MCP settings link', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    const link = await screen.findByRole('menuitem', { name: /MCP settings/i });
    expect(link).toHaveAttribute('href', '/dashboard/settings/mcp');
  });
});
