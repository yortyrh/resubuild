import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';
import ForgotPasswordPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockMutate = vi.fn();
const mockUseForgotPassword = vi.fn(
  (): { mutate: typeof mockMutate; isPending: boolean; error: { message: string } | null } => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
);
const mockUseAuthFeatures = vi.fn(() => ({
  data: {
    forgot_password: true,
    email_verification: false,
    passwordless: false,
    github_oauth: false,
  },
  isLoading: false,
}));

vi.mock('@/lib/queries/auth-mutations', () => ({
  useForgotPassword: () => mockUseForgotPassword(),
}));

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthFeatures: () => mockUseAuthFeatures(),
}));

const renderPage = () => render(<ForgotPasswordPage />, { wrapper: createQueryWrapper() });

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockMutate.mockReset();
    mockUseForgotPassword.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });
  });

  it('renders email input and submit button', () => {
    renderPage();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeTruthy();
  });

  it('shows success state after submitting', async () => {
    mockMutate.mockImplementation((_email, options) => {
      options?.onSuccess?.();
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    const buttons = screen.getAllByRole('button', { name: /send reset link/i });
    await userEvent.click(buttons[0]!);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('test@example.com', expect.any(Object));
    });
  });

  it('shows error on failure', async () => {
    mockUseForgotPassword.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: { message: 'Failed to send' },
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    const buttons = screen.getAllByRole('button', { name: /send reset link/i });
    await userEvent.click(buttons[0]!);

    expect(screen.getByText(/failed to send/i)).toBeTruthy();
  });
});
