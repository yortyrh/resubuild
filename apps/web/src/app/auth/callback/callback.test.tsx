import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthCallbackInner } from './page';

const mockGetSession = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useSearchParams: vi.fn(() => new URLSearchParams(window.location.search)),
}));

describe('AuthCallbackInner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PKCE flow (code in URL)', () => {
    it('calls exchangeCodeForSession with current URL', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: { access_token: 'tok', refresh_token: 'ref' } },
        error: null,
      });

      const url = 'https://app.example.com/auth/callback?code=abc123';
      Object.defineProperty(window, 'location', {
        value: { href: url, search: '?code=abc123', pathname: '/auth/callback' },
        writable: true,
      });

      render(<AuthCallbackInner />);

      await waitFor(() => {
        expect(mockExchangeCodeForSession).toHaveBeenCalledWith(url);
      });
    });

    it('redirects to /dashboard on success', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: { access_token: 'tok', refresh_token: 'ref' } },
        error: null,
      });

      const url = 'https://app.example.com/auth/callback?code=abc123';
      Object.defineProperty(window, 'location', {
        value: { href: url, search: '?code=abc123', pathname: '/auth/callback' },
        writable: true,
      });

      render(<AuthCallbackInner />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('sets error message on failure', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code' },
      });

      const url = 'https://app.example.com/auth/callback?code=bad';
      Object.defineProperty(window, 'location', {
        value: { href: url, search: '?code=bad', pathname: '/auth/callback' },
        writable: true,
      });

      const { getByText } = render(<AuthCallbackInner />);

      await waitFor(() => {
        expect(getByText('Invalid code')).toBeTruthy();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Implicit flow (tokens in URL hash)', () => {
    it('calls getSession and redirects to /dashboard on success', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'u1', email: 'test@example.com' },
            access_token: 'tok',
            refresh_token: 'ref',
            expires_in: 3600,
            expires_at: Date.now() / 1000 + 3600,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const url = 'https://app.example.com/auth/callback#access_token=tok&refresh_token=ref';
      Object.defineProperty(window, 'location', {
        value: {
          href: url,
          search: '',
          pathname: '/auth/callback',
          hash: '#access_token=tok&refresh_token=ref',
        },
        writable: true,
      });

      render(<AuthCallbackInner />);

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('sets error when no session found', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const url = 'https://app.example.com/auth/callback#access_token=tok';
      Object.defineProperty(window, 'location', {
        value: {
          href: url,
          search: '',
          pathname: '/auth/callback',
          hash: '#access_token=tok',
        },
        writable: true,
      });

      const { getByText } = render(<AuthCallbackInner />);

      await waitFor(() => {
        expect(getByText('Sign-in failed')).toBeTruthy();
      });
    });
  });
});
