// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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
});
