import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecuritySettings } from './security-settings';

const mockChangePasswordMutate = vi.fn();
const mockUseAuthMe = vi.fn();

vi.mock('@/lib/queries/auth-mutations', () => ({
  useChangePassword: () => ({
    mutate: mockChangePasswordMutate,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthSession: () => ({
    data: { exists: true, userId: 'u1', email: 'a@b.com', emailVerified: true },
  }),
  useAuthMe: (...args: unknown[]) => mockUseAuthMe(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('SecuritySettings', () => {
  beforeEach(() => {
    cleanup();
    mockChangePasswordMutate.mockReset();
  });

  it('renders the change password form when user already has a password', () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, has_password: true },
    });

    render(<SecuritySettings />, { wrapper });

    expect(screen.getByText('Change password')).toBeTruthy();
    expect(screen.getByLabelText('Current password')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm new password')).toBeTruthy();
    expect(screen.getByRole('button', { name: /update password/i })).toBeTruthy();
  });

  it('hides current password and shows "Set a password" copy for OAuth-only users', () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, has_password: false },
    });

    render(<SecuritySettings />, { wrapper });

    expect(screen.getByRole('heading', { name: 'Set a password' })).toBeTruthy();
    expect(screen.queryByLabelText('Current password')).toBeNull();
    expect(screen.getByRole('button', { name: /set password/i })).toBeTruthy();
  });

  it('renders with optional back link', () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, has_password: true },
    });

    render(<SecuritySettings backHref="/dashboard" backLabel="Dashboard" />, { wrapper });

    expect(screen.getByText('← Dashboard')).toBeTruthy();
  });

  it('shows validation error when passwords do not match', async () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, has_password: true },
    });

    render(<SecuritySettings />, { wrapper });

    await userEvent.type(screen.getByLabelText('Current password'), 'oldpassword');
    await userEvent.type(screen.getByLabelText('New password'), 'newpassword123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'differentpassword');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByText('New passwords do not match')).toBeTruthy();
  });

  it('submits with the current password when user has one', async () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, has_password: true },
    });

    render(<SecuritySettings />, { wrapper });

    await userEvent.type(screen.getByLabelText('Current password'), 'oldpassword');
    await userEvent.type(screen.getByLabelText('New password'), 'newpassword123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword123');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockChangePasswordMutate).toHaveBeenCalledWith(
        { currentPassword: 'oldpassword', newPassword: 'newpassword123' },
        expect.any(Object),
      );
    });
  });

  it('submits without the current password for OAuth-only users', async () => {
    mockUseAuthMe.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, has_password: false },
    });

    render(<SecuritySettings />, { wrapper });

    await userEvent.type(screen.getByLabelText('New password'), 'newpassword123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword123');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(mockChangePasswordMutate).toHaveBeenCalledWith(
        { newPassword: 'newpassword123' },
        expect.any(Object),
      );
    });
  });
});
