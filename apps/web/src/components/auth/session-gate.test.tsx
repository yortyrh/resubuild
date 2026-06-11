// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/lib/queries/test-utils';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuthSession = vi.fn();

vi.mock('@/lib/queries/auth-queries', () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

import { SessionGate } from './session-gate';

describe('SessionGate', () => {
  beforeEach(() => {
    mockUseAuthSession.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders the children without redirecting when the Supabase client reports a session', () => {
    mockUseAuthSession.mockReturnValue({
      data: { exists: true, userId: 'u1', email: 'u@test.dev', emailVerified: true },
      isPending: false,
    });

    render(
      <SessionGate>
        <div data-testid="protected">protected</div>
      </SessionGate>,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders the skeleton and redirects to /login when the Supabase client reports no session', async () => {
    mockUseAuthSession.mockReturnValue({
      data: { exists: false, userId: null, email: null, emailVerified: false },
      isPending: false,
    });

    render(
      <SessionGate>
        <div data-testid="protected">protected</div>
      </SessionGate>,
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects to /login based on the Supabase session, NOT the sessionStorage mirror', async () => {
    // Regression pin for the OAuth callback bounce bug: the gate must
    // use the cookie-backed Supabase client (authoritative) and not the
    // legacy sessionStorage mirror (which is hydrated asynchronously
    // and is empty on first paint after an OAuth callback).
    sessionStorage.setItem('resubuild.access_token', 'mirror-token');

    mockUseAuthSession.mockReturnValue({
      data: { exists: false, userId: null, email: null, emailVerified: false },
      isPending: false,
    });

    render(
      <SessionGate>
        <div data-testid="protected">protected</div>
      </SessionGate>,
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});
