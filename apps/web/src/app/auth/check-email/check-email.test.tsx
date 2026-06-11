// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckEmailClient from './check-email-client';

const mockMutate = vi.fn();
const mockSearchParams = new URLSearchParams();
const useSearchParamsMock = vi.fn(() => mockSearchParams);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('@/lib/queries/auth-mutations', () => ({
  useVerifyEmailToken: () => ({
    mutate: mockMutate,
    isPending: false,
    data: undefined,
    error: null,
  }),
}));

describe('CheckEmailClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  it('renders heading and confirmation text', async () => {
    render(<CheckEmailClient />);

    await waitFor(
      () => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/We sent a confirmation link/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders sign in button', async () => {
    render(<CheckEmailClient />);

    await waitFor(
      () => {
        const buttons = screen.getAllByRole('button', { name: /go to sign in/i });
        expect(buttons[0]).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('does not call verifyEmail when no token is present in the URL', () => {
    render(<CheckEmailClient />);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls verifyEmail with the token from the URL on mount', async () => {
    mockSearchParams.set('token', 'test-verification-token');

    render(<CheckEmailClient />);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('test-verification-token');
    });
  });
});
