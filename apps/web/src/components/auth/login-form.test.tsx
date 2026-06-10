// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockLoginMutate = vi.fn();
const mockRequestOtpMutate = vi.fn();
const mockVerifyOtpMutate = vi.fn();
const mockSendMagicLinkMutate = vi.fn();
const mockGithubSignInMutate = vi.fn();
const mockGoogleSignInMutate = vi.fn();

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
  useGithubSignIn: () => ({
    isPending: false,
    error: null,
    mutate: mockGithubSignInMutate,
  }),
  useGoogleSignIn: () => ({
    isPending: false,
    error: null,
    mutate: mockGoogleSignInMutate,
  }),
}));

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthFeatures: () => mockUseAuthFeatures(),
  useAuthSession: () => mockUseAuthSession(),
}));

function setFeatures(features: {
  forgot_password: boolean;
  email_verification: boolean;
  passwordless: boolean;
  providers: string[];
}) {
  mockUseAuthFeatures.mockReturnValue({ data: features, isLoading: false });
}

function setSession(exists: boolean) {
  mockUseAuthSession.mockReturnValue({ data: { exists }, isLoading: false });
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession(false);
  });

  it('renders the password-only form when passwordless is off and no providers are enabled', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      providers: [],
    });

    render(<LoginForm />);

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
      providers: [],
    });

    render(<LoginForm />);

    expect(screen.getByRole('tab', { name: /password/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /email code/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /email link/i })).toBeInTheDocument();
  });

  it('renders the "Forgot your password?" link when forgot_password is on', () => {
    setFeatures({
      forgot_password: true,
      email_verification: false,
      passwordless: true,
      providers: [],
    });

    render(<LoginForm />);

    expect(screen.getByText(/forgot your password\?/i)).toBeInTheDocument();
  });

  it('hides the "Forgot your password?" link when forgot_password is off', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
      providers: [],
    });

    render(<LoginForm />);

    expect(screen.queryByText(/forgot your password\?/i)).not.toBeInTheDocument();
  });

  it('renders GitHub and Google buttons when their providers are enabled', () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      providers: ['github', 'google'],
    });

    render(<LoginForm />);

    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('submits the password form with email and password', async () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      providers: [],
    });

    render(<LoginForm />);

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
      providers: [],
    });

    render(<LoginForm />);

    await userEvent.click(screen.getByRole('tab', { name: /email code/i }));
    await userEvent.type(screen.getByLabelText('Email'), 'otp@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(mockRequestOtpMutate).toHaveBeenCalledWith('otp@example.com', expect.any(Object));
    });
  });

  it('sends a magic link in the "Email me a link" tab', async () => {
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
      providers: [],
    });

    render(<LoginForm />);

    await userEvent.click(screen.getByRole('tab', { name: /email link/i }));
    await userEvent.type(screen.getByLabelText('Email'), 'link@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    await waitFor(() => {
      expect(mockSendMagicLinkMutate).toHaveBeenCalledWith('link@example.com', expect.any(Object));
    });
  });

  it('renders nothing when the user is already signed in', () => {
    setSession(true);
    setFeatures({
      forgot_password: false,
      email_verification: false,
      passwordless: true,
      providers: ['github', 'google'],
    });

    const { container } = render(<LoginForm />);

    expect(container).toBeEmptyDOMElement();
  });
});
