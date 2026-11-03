// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevMailpitHint } from './dev-mailpit-hint';

describe('DevMailpitHint', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', 'http://127.0.0.1:54424');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('renders a Mailpit link in local development', () => {
    render(<DevMailpitHint emailKind="sign-in code" />);

    const hint = screen.getByTestId('dev-mailpit-hint');
    expect(hint).toHaveTextContent('Development:');
    expect(hint).toHaveTextContent('sign-in code');
    expect(screen.getByRole('link', { name: 'Mailpit' })).toHaveAttribute(
      'href',
      'http://127.0.0.1:54424',
    );
  });

  it('renders nothing in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    render(<DevMailpitHint />);

    expect(screen.queryByTestId('dev-mailpit-hint')).not.toBeInTheDocument();
  });

  it('renders nothing when the mail catcher URL is not local', () => {
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', 'https://mail.example.com');

    render(<DevMailpitHint />);

    expect(screen.queryByTestId('dev-mailpit-hint')).not.toBeInTheDocument();
  });
});
