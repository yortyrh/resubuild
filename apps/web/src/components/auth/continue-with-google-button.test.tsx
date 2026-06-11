// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSignInWithOAuth = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import { ContinueWithGoogleButton } from './continue-with-google-button';

describe('ContinueWithGoogleButton', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
    (toast.error as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the "Continue with Google" label by default', () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/.../authorize' },
      error: null,
    });

    render(<ContinueWithGoogleButton />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('invokes signInWithOAuth on click and stays on the page on success', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/.../authorize' },
      error: null,
    });

    render(<ContinueWithGoogleButton />);

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('surfaces a non-blocking error toast on failure and re-enables the button', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'Provider not enabled', name: 'AuthError', status: 400 },
    });

    render(<ContinueWithGoogleButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Provider not enabled');
    });
    // The button must re-enable so the user can retry without a hard reload.
    expect(button).not.toBeDisabled();
  });
});
