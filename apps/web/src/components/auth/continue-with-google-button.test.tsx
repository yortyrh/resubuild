// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSignIn = vi.fn();

vi.mock('@/lib/auth/oauth', () => ({
  GOOGLE_OAUTH_ERROR_MESSAGE: 'Sign-in failed. Please try again.',
  signInWithGoogle: () => mockSignIn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import { ContinueWithGoogleButton } from './continue-with-google-button';

describe('ContinueWithGoogleButton', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    (toast.error as ReturnType<typeof vi.fn>).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the "Continue with Google" label by default', () => {
    render(<ContinueWithGoogleButton />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('starts the OAuth navigation on click and stays disabled while redirecting', async () => {
    mockSignIn.mockResolvedValue({ navigated: true });

    render(<ContinueWithGoogleButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('surfaces a non-blocking error toast on failure and re-enables the button', async () => {
    mockSignIn.mockRejectedValue(new Error('Provider not enabled'));

    render(<ContinueWithGoogleButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Provider not enabled');
    });
    expect(button).not.toBeDisabled();
  });

  it('falls back to the generic message when the error has none', async () => {
    mockSignIn.mockRejectedValue(new Error(''));

    render(<ContinueWithGoogleButton />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Sign-in failed. Please try again.');
    });
  });
});
