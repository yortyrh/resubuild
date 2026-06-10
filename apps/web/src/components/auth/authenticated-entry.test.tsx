// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';
import { SignedInAuthFallback, useAuthenticatedEntryRedirect } from './authenticated-entry';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuthSession = vi.fn();
const mockUseAuthFeatures = vi.fn();

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthSession: () => mockUseAuthSession(),
  useAuthFeatures: () => mockUseAuthFeatures(),
}));

vi.mock('@/lib/auth-session', () => ({
  hasSession: () => false,
}));

function RedirectProbe() {
  const { showSignedInUi } = useAuthenticatedEntryRedirect();
  return <div data-testid="signed-in">{String(showSignedInUi)}</div>;
}

describe('useAuthenticatedEntryRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthFeatures.mockReturnValue({
      data: { email_verification: false },
      isPending: false,
    });
  });

  it('redirects to the dashboard when a session exists', async () => {
    mockUseAuthSession.mockReturnValue({
      data: {
        exists: true,
        userId: 'u1',
        email: 'user@test.dev',
        emailVerified: true,
      },
      isPending: false,
    });

    render(<RedirectProbe />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to check-email when verification is required', async () => {
    mockUseAuthFeatures.mockReturnValue({
      data: { email_verification: true },
      isPending: false,
    });
    mockUseAuthSession.mockReturnValue({
      data: {
        exists: true,
        userId: 'u1',
        email: 'user@test.dev',
        emailVerified: false,
      },
      isPending: false,
    });

    render(<RedirectProbe />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/auth/check-email');
    });
  });
});

describe('SignedInAuthFallback', () => {
  it('renders a dashboard link', () => {
    render(<SignedInAuthFallback />);
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
