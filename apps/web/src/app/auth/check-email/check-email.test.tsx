import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckEmailPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockMutate = vi.fn();
vi.mock('@/lib/queries/auth-mutations', () => ({
  useVerifyEmailToken: () => ({
    mutate: mockMutate,
    isPending: false,
    data: undefined,
    error: null,
  }),
}));

describe('CheckEmailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading and confirmation text', async () => {
    render(<CheckEmailPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/We sent a confirmation link/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders sign in button', async () => {
    render(<CheckEmailPage />);

    await waitFor(
      () => {
        const buttons = screen.getAllByRole('button', { name: /go to sign in/i });
        expect(buttons[0]).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
