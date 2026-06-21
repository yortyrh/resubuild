// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';
import { RegisterForm } from './register-form';

const renderRegisterForm = () => render(<RegisterForm />, { wrapper: createQueryWrapper() });

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const mockRegisterMutate = vi.fn();

const mockUseAuthFeatures = vi.fn();
const mockUseAuthSession = vi.fn();

vi.mock('@/lib/queries/auth-mutations', () => ({
  useRegister: () => ({
    isPending: false,
    isSuccess: false,
    data: null,
    error: null,
    mutate: mockRegisterMutate,
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

describe('RegisterForm', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setSession(false);
  });

  it('renders the Continue with GitHub button when github_oauth is true (and not signed in)', () => {
    setFeatures({ github_oauth: true });

    renderRegisterForm();

    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
  });

  it('does NOT render the Continue with GitHub button when github_oauth is false', () => {
    setFeatures({ github_oauth: false });

    renderRegisterForm();

    expect(screen.queryByRole('button', { name: /continue with github/i })).not.toBeInTheDocument();
  });

  it('does NOT render the Continue with GitHub button when the feature flag is absent (undefined)', () => {
    // Mirror the login-form guard: an undefined github_oauth value MUST
    // default to false so a misconfigured env var cannot accidentally
    // expose the OAuth button.
    mockUseAuthFeatures.mockReturnValue({ data: {}, isLoading: false });

    renderRegisterForm();

    expect(screen.queryByRole('button', { name: /continue with github/i })).not.toBeInTheDocument();
  });

  it('renders the Continue with Google button when google_oauth is true (and not signed in)', () => {
    setFeatures({ google_oauth: true });

    renderRegisterForm();

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('does NOT render the Continue with Google button when google_oauth is false', () => {
    setFeatures({ google_oauth: false });

    renderRegisterForm();

    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('does NOT render the Continue with Google button when the feature flag is absent (undefined)', () => {
    mockUseAuthFeatures.mockReturnValue({ data: {}, isLoading: false });

    renderRegisterForm();

    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('renders the password input masked by default with a "Show password" toggle', () => {
    setFeatures({});

    renderRegisterForm();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('reveals the password when the toggle is clicked and preserves the typed value', async () => {
    const user = userEvent.setup();
    setFeatures({});

    renderRegisterForm();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'supersecret');

    await user.click(screen.getByRole('button', { name: /show password/i }));

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveValue('supersecret');
  });

  it('submits the typed password unchanged even when the toggle is left on', async () => {
    const user = userEvent.setup();
    setFeatures({});

    renderRegisterForm();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'supersecret');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(mockRegisterMutate).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
    });
  });
});
