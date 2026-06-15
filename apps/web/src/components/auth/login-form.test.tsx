// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';
import { LoginForm } from './login-form';

const renderLoginForm = () => render(<LoginForm />, { wrapper: createQueryWrapper() });

const mockSearchParams = new URLSearchParams();
const useSearchParamsMock = vi.fn(() => mockSearchParams);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => useSearchParamsMock(),
}));

const mockLoginMutate = vi.fn();
const mockRequestOtpMutate = vi.fn();
const mockVerifyOtpMutate = vi.fn();
const mockSendMagicLinkMutate = vi.fn();

const mockUseAuthFeatures = vi.fn();
const mockUseAuthSession = vi.fn();

vi.mock('@/lib/queries/auth-mutations', () => ({
  useLogin: () => ({
    isPending: false,
    error: null,
    mutate: mockLoginMutate,
  }),
  useRequestOtp: () => ({
    isPending: false,
    error: null,
    mutate: mockRequestOtpMutate,
  }),
  useVerifyOtp: () => ({
    isPending: false,
    error: null,
    mutate: mockVerifyOtpMutate,
  }),
  useSendMagicLink: () => ({
    isPending: false,
    error: null,
    mutate: mockSendMagicLinkMutate,
  }),
}));

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthFeatures: () => mockUseAuthFeatures(),
  useAuthSession: () => mockUseAuthSession(),
}));

function setFeatures(
  features: Partial<{
    forgot_password: boolean;
    email_verification: boolean;
    passwordless: boolean;
    github_oauth: boolean;
    google_oauth: boolean;
  }> = {},
) {
  mockUseAuthFeatures.mockReturnValue({ data: features, isLoading: false });
}

function setSession(exists: boolean) {
  mockUseAuthSession.mockReturnValue({
    data: {
      exists,
      userId: exists ? 'user-1' : null,
      email: exists ? 'user@test.dev' : null,
      emailVerified: exists,
    },
    isPending: false,
    isLoading: false,
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setSession(false);
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  it('shows a dashboard link when the user is already signed in', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
    });
    setSession(true);

    renderLoginForm();

    expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('renders the password-only form when passwordless is off', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
    });

    renderLoginForm();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /email code/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /email link/i })).not.toBeInTheDocument();
  });

  it('renders the tabbed passwordless control when passwordless is on', async () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
    });

    renderLoginForm();

    expect(screen.getByRole('tab', { name: /password/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /email code/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /email link/i })).toBeInTheDocument();
  });

  it('renders the "Forgot your password?" link when forgot_password is on', () => {
    setFeatures({
      forgot_password: true,
      email_verification: false,
      passwordless: true,
    });

    renderLoginForm();

    expect(screen.getByText(/forgot your password\?/i)).toBeInTheDocument();
  });

  it('hides the "Forgot your password?" link when forgot_password is off', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
    });

    renderLoginForm();

    expect(screen.queryByText(/forgot your password\?/i)).not.toBeInTheDocument();
  });

  it('hides the "Continue with GitHub" button when github_oauth is off (default)', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: false,
    });

    renderLoginForm();

    expect(screen.queryByRole('button', { name: /continue with github/i })).not.toBeInTheDocument();
  });

  it('renders the "Continue with GitHub" button when github_oauth is on', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: true,
    });

    renderLoginForm();

    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('renders the GitHub button above the password form when github_oauth is on', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: true,
    });

    renderLoginForm();

    const githubButton = screen.getByRole('button', { name: /continue with github/i });
    const emailField = screen.getByLabelText('Email');
    // GitHub row must come before the email field in DOM order so the
    // social-login entry point sits above the password form (per the
    // auth-github-oauth spec's Resolved Decisions).
    expect(
      githubButton.compareDocumentPosition(emailField) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('hides the "Continue with Google" button when google_oauth is off (default)', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: false,
      google_oauth: false,
    });

    renderLoginForm();

    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('renders the "Continue with Google" button when google_oauth is on', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: false,
      google_oauth: true,
    });

    renderLoginForm();

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('renders the Google button above the email field when google_oauth is on', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: false,
      google_oauth: true,
    });

    renderLoginForm();

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    const emailField = screen.getByLabelText('Email');
    expect(
      googleButton.compareDocumentPosition(emailField) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('submits the password form with email and password', async () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
    });

    renderLoginForm();

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLoginMutate).toHaveBeenCalled();
    });
    const lastCall = mockLoginMutate.mock.calls[mockLoginMutate.mock.calls.length - 1];
    expect(lastCall?.[0]).toEqual({ email: 'user@example.com', password: 'supersecret' });
  });

  it('requests an OTP code in the "Email me a code" tab', async () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
    });

    renderLoginForm();

    // All three tab panels are mounted (the grid-stacking layout reserves
    // the tallest panel's height so the centered card does not jump), so we
    // scope the queries to the active panel.
    await userEvent.click(screen.getByRole('tab', { name: /email code/i }));
    const otpPanel = await screen.findByRole('tabpanel', { name: /email code/i });
    await userEvent.type(within(otpPanel).getByLabelText('Email'), 'otp@example.com');
    await userEvent.click(within(otpPanel).getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(mockRequestOtpMutate).toHaveBeenCalledWith('otp@example.com', expect.any(Object));
    });
  });

  it('sends a magic link in the "Email me a link" tab', async () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
    });

    renderLoginForm();

    // All three tab panels are mounted (the grid-stacking layout reserves
    // the tallest panel's height so the centered card does not jump), so we
    // scope the queries to the active panel.
    await userEvent.click(screen.getByRole('tab', { name: /email link/i }));
    const linkPanel = await screen.findByRole('tabpanel', { name: /email link/i });
    await userEvent.type(within(linkPanel).getByLabelText('Email'), 'link@example.com');
    await userEvent.click(within(linkPanel).getByRole('button', { name: /send sign-in link/i }));

    await waitFor(() => {
      expect(mockSendMagicLinkMutate).toHaveBeenCalledWith('link@example.com', expect.any(Object));
    });
  });

  describe('auth callback error rendering', () => {
    function setCallbackError(params: Record<string, string>) {
      for (const [key, value] of Object.entries(params)) {
        mockSearchParams.set(key, value);
      }
    }

    function setBasicFeatures() {
      setFeatures({
        forgot_password: false,
        email_verification: false,
        passwordless: false,
      });
    }

    it('renders the PKCE-friendly copy when the callback bounced a PKCE error', () => {
      setBasicFeatures();
      setCallbackError({
        error_code: 'pkce_code_verifier_not_found',
        error_description: 'PKCE+code+verifier+not+found+in+storage',
      });

      renderLoginForm();

      expect(screen.getByText(/auth handshake expired/i)).toBeInTheDocument();
    });

    it('renders the raw description when no known error pattern matches', () => {
      setBasicFeatures();
      setCallbackError({
        error_code: 'unknown_thing',
        error_description: 'Some+unspecified+failure',
      });

      renderLoginForm();

      expect(screen.getByText('Some unspecified failure')).toBeInTheDocument();
    });

    it('does not show an error banner when no error params are present', () => {
      setBasicFeatures();

      renderLoginForm();

      expect(screen.queryByText(/auth handshake expired/i)).not.toBeInTheDocument();
    });
  });
});
