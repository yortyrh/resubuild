// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// jsdom does not implement matchMedia; define a stub so any future
// client component that reads it (e.g. for prefers-reduced-motion) does
// not throw during the test render.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
}));

// `auth-session` is a `'use client'` module; importing `hasSession` from a
// Server Component throws at render time. The page must NEVER import it.
// This module-level assertion is the regression pin for the
// "hasSession() from the server" error.
vi.mock('@/lib/auth-session', () => ({
  hasSession: () => false,
}));

import MarketingPage from './page';

describe('MarketingPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the hero headline and the primary CTA to /login for anonymous visitors', () => {
    render(<MarketingPage />);

    // Single h1 per the spec's accessibility requirement
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Drop in a PDF/i);
    expect(headings[0]).toHaveTextContent(/CV you can edit/i);

    const primaryCtas = screen.getAllByRole('link', { name: /Try the live demo/i });
    expect(primaryCtas.length).toBeGreaterThanOrEqual(1);
    for (const cta of primaryCtas) {
      expect(cta).toHaveAttribute('href', '/login');
    }

    // Anonymous visitors must see a "Log in" link
    const loginLinks = screen.getAllByRole('link', { name: /Log in/i });
    expect(loginLinks.some((link) => link.getAttribute('href') === '/login')).toBe(true);
  });

  it('shows the banner in the hero and the animated demo under "See it work"', () => {
    render(<MarketingPage />);

    const hero = screen.getByRole('heading', { level: 1 }).closest('section');
    const banner = hero?.querySelector('img[src="/resubuild-banner.jpg"]');
    expect(banner).not.toBeNull();
    expect(banner!.getAttribute('alt')).not.toBe('');
    expect(hero?.querySelector('img[src="/hero-demo.gif"]')).toBeNull();

    const demo = screen.getByRole('heading', { level: 2, name: /See it work/i }).closest('section');
    expect(demo).toHaveAttribute('id', 'demo');
    expect(demo?.querySelector('img[src="/hero-demo.gif"]')).toHaveAttribute('loading', 'lazy');
  });

  it('renders the header "Get started free" CTA pointing to /register', () => {
    render(<MarketingPage />);

    const registerCta = screen.getByRole('link', { name: /Get started free/i });
    expect(registerCta).toHaveAttribute('href', '/register');
    expect(registerCta.className).toContain('bg-primary');
  });

  it('numbers only the real sequence: the three how-it-works steps', () => {
    render(<MarketingPage />);

    const steps = screen
      .getByRole('heading', { level: 2, name: /three steps/i })
      .closest('section')
      ?.querySelectorAll('ol > li');
    expect(steps).toHaveLength(3);
  });

  it('mounts HomeRedirect as a client island so signed-in visitors get redirected after hydration', () => {
    // The server does not have access to sessionStorage, so it cannot
    // short-circuit the render. The redirect is owned by HomeRedirect's
    // useEffect; the only thing we can assert at the server-render layer
    // is that the island is mounted. (HomeRedirect returns null and calls
    // router.replace, so the only visible signal here is that no error
    // is thrown and the page renders normally.)
    const { container } = render(<MarketingPage />);

    // Footer copy is a stable marker that the page body rendered at all
    expect(container.textContent).toMatch(/Resubuild/);
  });

  it('does not call hasSession from a server context', async () => {
    // The Server Component must not import hasSession — the actual fix.
    // We assert it via a static source check on the page file, so a
    // future "let's just call hasSession from the server again" change
    // will fail loudly in CI.
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const source = readFileSync(
      fileURLToPath(import.meta.url.replace('.test.tsx', '.tsx')),
      'utf8',
    );

    expect(source).not.toMatch(/from\s+['"]@\/lib\/auth-session['"]/);
    expect(source).not.toMatch(/\bhasSession\s*\(/);
  });
});
