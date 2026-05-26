// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthCrossLink } from './auth-cross-link';

const currentDir = dirname(fileURLToPath(import.meta.url));

describe('AuthCrossLink', () => {
  afterEach(() => {
    cleanup();
  });

  it('is a server-safe module without use client', () => {
    const source = readFileSync(join(currentDir, 'auth-cross-link.tsx'), 'utf8');
    expect(source).not.toMatch(/^['"]use client['"];/m);
  });

  it('renders Register link on login variant', () => {
    render(<AuthCrossLink variant="login" />);

    const link = screen.getByRole('link', { name: 'Register' });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('renders Sign in link on register variant', () => {
    render(<AuthCrossLink variant="register" />);

    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link).toHaveAttribute('href', '/login');
  });
});
